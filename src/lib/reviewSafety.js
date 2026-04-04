import { supabase } from './supabase';

/**
 * Jaccard similarity between two strings (word-level).
 * Returns 0-1, where 1 = identical word sets.
 */
function jaccardSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if the review text is suspiciously similar to recent reviews
 * for the same provider. Returns { isSuspicious, matchedReviewId, similarity }.
 */
export async function checkTextSimilarity(providerId, reviewBody) {
  if (!reviewBody || reviewBody.trim().length < 20) {
    return { isSuspicious: false, matchedReviewId: null, similarity: 0 };
  }

  try {
    // Fetch recent reviews for this provider (last 90 days)
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
      if (!existing.body) continue;
      const sim = jaccardSimilarity(reviewBody, existing.body);
      if (sim > highestSimilarity) {
        highestSimilarity = sim;
        matchedReviewId = existing.id;
      }
    }

    // Threshold: 0.7 Jaccard similarity is suspiciously close
    return {
      isSuspicious: highestSimilarity >= 0.7,
      matchedReviewId: highestSimilarity >= 0.7 ? matchedReviewId : null,
      similarity: Math.round(highestSimilarity * 100) / 100,
    };
  } catch {
    return { isSuspicious: false, matchedReviewId: null, similarity: 0 };
  }
}

/**
 * Detect suspicious patterns in review text without calling an external API.
 * Returns { flags: string[], score: number } where score 0-100 (higher = more suspicious).
 */
export function detectSuspiciousPatterns(body, title, rating) {
  const flags = [];
  let score = 0;

  if (!body) return { flags, score };

  const lower = body.toLowerCase();

  // All-caps text (shouting)
  const capsRatio = (body.match(/[A-Z]/g) || []).length / Math.max(body.length, 1);
  if (capsRatio > 0.6 && body.length > 20) {
    flags.push('excessive_caps');
    score += 15;
  }

  // Very short review with extreme rating
  if (body.length < 30 && (rating === 1 || rating === 5)) {
    flags.push('short_extreme_rating');
    score += 10;
  }

  // Contains competitor mentions
  const competitorPhrases = ['go to', 'better at', 'instead try', 'recommend going'];
  if (competitorPhrases.some(p => lower.includes(p))) {
    flags.push('competitor_mention');
    score += 20;
  }

  // Contains promotional language (fake positive)
  const promoPatterns = ['best ever', 'highly recommend', 'amazing results', 'life changing'];
  const promoCount = promoPatterns.filter(p => lower.includes(p)).length;
  if (promoCount >= 2) {
    flags.push('promotional_language');
    score += 15;
  }

  // Repeated exclamation marks
  if ((body.match(/!/g) || []).length > 5) {
    flags.push('excessive_punctuation');
    score += 10;
  }

  // Generic filler (copy-paste indicator)
  const genericPhrases = ['i had a great experience', 'the staff was friendly', 'i would recommend'];
  const genericCount = genericPhrases.filter(p => lower.includes(p)).length;
  if (genericCount >= 2) {
    flags.push('generic_filler');
    score += 15;
  }

  // Title and body are nearly identical
  if (title && body) {
    const sim = jaccardSimilarity(title, body);
    if (sim > 0.8) {
      flags.push('title_body_identical');
      score += 10;
    }
  }

  return { flags, score: Math.min(score, 100) };
}

/**
 * Request Claude sentiment analysis via edge function.
 * Returns { isFake, confidence, reasoning } or null on failure.
 * Runs async — never blocks the review submission.
 */
export async function requestSentimentAnalysis(reviewId) {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-review', {
      body: { review_id: reviewId },
    });
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Full review safety check. Call after review insert.
 * Runs silently — never blocks user flow. Flags review for admin if suspicious.
 */
export async function runReviewSafetyChecks(reviewId, providerId, body, title, rating) {
  try {
    const [similarity, patterns] = await Promise.all([
      checkTextSimilarity(providerId, body),
      Promise.resolve(detectSuspiciousPatterns(body, title, rating)),
    ]);

    const combinedScore = Math.min(
      (similarity.isSuspicious ? 40 : 0) + patterns.score,
      100
    );

    // Flag if combined score >= 40
    if (combinedScore >= 40) {
      const flags = [
        ...(similarity.isSuspicious ? [`text_similarity:${similarity.similarity}`] : []),
        ...patterns.flags,
      ];

      await supabase
        .from('reviews')
        .update({
          status: 'flagged',
          flagged_reason: flags.join(', '),
        })
        .eq('id', reviewId);
    }

    // Request async Claude analysis for any review with body > 30 chars
    if (body && body.length > 30) {
      requestSentimentAnalysis(reviewId);
    }
  } catch {
    // Silent — never block the user flow
  }
}
