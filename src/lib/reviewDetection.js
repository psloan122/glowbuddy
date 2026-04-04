import { supabase } from './supabase';

/**
 * Word-level similarity between two strings.
 * Filters words to > 3 characters, uses max(sizeA, sizeB) as denominator.
 * Returns 0-1 where 1 = identical word sets.
 */
function wordSimilarity(a, b) {
  const toWords = (str) =>
    new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  const wordsA = toWords(a);
  const wordsB = toWords(b);

  if (wordsA.size === 0 && wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const denominator = Math.max(wordsA.size, wordsB.size);
  return denominator === 0 ? 0 : intersection / denominator;
}

/**
 * Check if the new review text is suspiciously similar to recent reviews
 * for the same provider. Threshold: 0.40.
 *
 * When a match is found, flags BOTH the new review AND the matched review.
 * Returns { isSuspicious, matchedReviewId, similarity }.
 */
export async function checkTextSimilarity(providerId, reviewBody, newReviewId) {
  if (!reviewBody || reviewBody.trim().length < 20) {
    return { isSuspicious: false, matchedReviewId: null, similarity: 0 };
  }

  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const { data: recentReviews } = await supabase
      .from('reviews')
      .select('id, body')
      .eq('provider_id', providerId)
      .eq('status', 'active')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .not('body', 'is', null)
      .limit(50);

    if (!recentReviews || recentReviews.length === 0) {
      return { isSuspicious: false, matchedReviewId: null, similarity: 0 };
    }

    let highestSimilarity = 0;
    let matchedReviewId = null;

    for (const existing of recentReviews) {
      if (!existing.body || existing.id === newReviewId) continue;
      const sim = wordSimilarity(reviewBody, existing.body);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        matchedReviewId = existing.id;
      }
    }

    const isSuspicious = highestSimilarity >= 0.4;

    // Flag BOTH reviews when duplicate detected
    if (isSuspicious && matchedReviewId) {
      const flagReason = `duplicate_text:${Math.round(highestSimilarity * 100)}%`;

      // Flag the new review
      if (newReviewId) {
        await supabase
          .from('reviews')
          .update({ status: 'flagged', flagged_reason: flagReason })
          .eq('id', newReviewId)
          .eq('status', 'active');
      }

      // Flag the matched (older) review too
      await supabase
        .from('reviews')
        .update({ status: 'flagged', flagged_reason: flagReason })
        .eq('id', matchedReviewId)
        .eq('status', 'active');
    }

    return {
      isSuspicious,
      matchedReviewId: isSuspicious ? matchedReviewId : null,
      similarity: Math.round(highestSimilarity * 100) / 100,
    };
  } catch {
    return { isSuspicious: false, matchedReviewId: null, similarity: 0 };
  }
}

/**
 * Call Claude API to analyze review authenticity.
 * Only runs for 1-star and 5-star reviews to manage API costs.
 * Writes ai_risk_score and ai_flags directly to the reviews table.
 *
 * Returns { riskScore, flags, reasoning } or null on skip/failure.
 */
export async function analyzeReviewAuthenticity(reviewId, rating) {
  // Only analyze extreme ratings (1 or 5 stars)
  if (rating !== 1 && rating !== 5) return null;

  try {
    const { data, error } = await supabase.functions.invoke('analyze-review', {
      body: { review_id: reviewId },
    });

    if (error || !data) return null;

    // Write AI results to the review row
    const riskScore = data.is_suspicious
      ? Math.round(data.confidence * 100)
      : Math.round((1 - data.confidence) * 10);

    const flags = [data.category].filter((f) => f && f !== 'genuine');

    await supabase
      .from('reviews')
      .update({
        ai_risk_score: riskScore,
        ai_flags: flags.length > 0 ? flags : null,
      })
      .eq('id', reviewId);

    return {
      riskScore,
      flags,
      reasoning: data.reasoning,
    };
  } catch {
    return null;
  }
}
