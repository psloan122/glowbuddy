/*
 * submitPrice — single source of truth for writing patient price
 * submissions to Supabase.
 *
 * Background: src/pages/Log.jsx had a 400-line handleSubmit() function
 * with several silent-failure paths (honeypot fake-success, generic
 * "Something went wrong" error masking, aggressive outlier flagging).
 * This helper exists so any *new* code path that wants to insert a
 * patient price can do it without re-introducing those bugs. Today
 * Log.jsx still owns the full submission flow because it carries a lot
 * of UI state (rate limiting, turnstile, duplicate detection, post-
 * success comparison fetch). When that flow is refactored, it should
 * use this helper.
 *
 * Contract:
 *   - ALWAYS inserts into the `procedures` table. That is the patient-
 *     submission table in this codebase. `provider_pricing` is for
 *     provider-uploaded / scraped rows and is NOT the right destination
 *     for end-user submissions.
 *   - On Supabase error, returns { ok: false, error } AND writes a row
 *     to `submission_errors` so silent failures are auditable. It does
 *     NOT swallow the error.
 *   - On success, returns { ok: true, row } where row is the inserted
 *     row including its server-generated id.
 */

import { supabase } from './supabase';

const REQUIRED_FIELDS = [
  'procedure_type',
  'price_paid',
  'provider_name',
  'city',
  'state',
];

export async function submitPrice(input, { user } = {}) {
  // Validate at the boundary so callers get a clear error rather than
  // a confusing Postgres "null value in column ... violates not-null"
  // failure halfway through the round-trip.
  for (const f of REQUIRED_FIELDS) {
    if (input[f] == null || input[f] === '') {
      return {
        ok: false,
        error: { message: `Missing required field: ${f}`, code: 'VALIDATION' },
      };
    }
  }

  const price = Number(input.price_paid);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      ok: false,
      error: { message: 'price_paid must be a positive number', code: 'VALIDATION' },
    };
  }

  const row = {
    ...input,
    price_paid: price,
    user_id: user?.id || input.user_id || null,
    // Default to active. Outlier detection should be done by the caller
    // (via src/lib/outlierDetection.js) and the result passed in via
    // input.status — this helper does NOT re-flag.
    status: input.status || 'active',
  };

  const { data, error } = await supabase
    .from('procedures')
    .insert(row)
    .select()
    .single();

  if (error) {
    // Log to submission_errors so silent failures are auditable. This
    // table was added in migration 061_submission_errors.sql.
    try {
      await supabase.from('submission_errors').insert({
        user_id: user?.id || null,
        procedure_type: input.procedure_type || null,
        city: input.city || null,
        state: input.state || null,
        error_code: error.code || null,
        error_message: error.message || null,
        payload: row,
      });
    } catch {
      // Non-blocking — table may not exist on older deployments.
    }
    // eslint-disable-next-line no-console
    console.error('[submitPrice] insert procedures failed', error, row);
    return { ok: false, error };
  }

  return { ok: true, row: data };
}
