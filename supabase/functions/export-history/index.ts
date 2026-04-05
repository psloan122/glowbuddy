// Supabase Edge Function: Export Treatment History as PDF
// Deploy: supabase functions deploy export-history
// Auth: requires user JWT (called from client)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildHtml(
  procedures: Array<{
    procedure_type: string
    provider_name: string
    city: string
    state: string
    created_at: string
    price_paid: number
    units_or_volume: string | null
    receipt_verified: boolean
    notes: string | null
  }>,
  userEmail: string
): string {
  const now = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const rows = procedures.map((p) => `
    <tr>
      <td>${formatDate(p.created_at)}</td>
      <td>${escapeHtml(p.provider_name || '')}</td>
      <td>${escapeHtml(p.procedure_type)}</td>
      <td>${p.units_or_volume ? escapeHtml(p.units_or_volume) : '—'}</td>
      <td>$${Number(p.price_paid).toLocaleString()}</td>
      <td>${p.receipt_verified ? '✓' : '—'}</td>
      <td>${p.notes ? escapeHtml(p.notes.slice(0, 80)) : '—'}</td>
    </tr>
  `).join('')

  const totalSpent = procedures.reduce((s, p) => s + Number(p.price_paid), 0)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #C94F78;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 700;
      color: #C94F78;
    }
    .header .meta {
      text-align: right;
      font-size: 10px;
      color: #666;
    }
    .summary {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
      font-size: 11px;
    }
    .summary .stat { color: #666; }
    .summary .stat strong { color: #1a1a1a; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      text-align: left;
      padding: 8px 6px;
      border-bottom: 1px solid #ddd;
      font-weight: 600;
      color: #666;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    td {
      padding: 7px 6px;
      border-bottom: 1px solid #f0f0f0;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
      font-size: 9px;
      color: #999;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>GlowBuddy Treatment History</h1>
      <p style="color:#666;font-size:11px;margin-top:4px;">${escapeHtml(userEmail)}</p>
    </div>
    <div class="meta">
      <p>${procedures.length} treatments</p>
      <p>Total: $${totalSpent.toLocaleString()}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Provider</th>
        <th>Procedure</th>
        <th>Units</th>
        <th>Price</th>
        <th>Verified</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">
    <span>Generated ${now} · glowbuddy.com</span>
    <span>This document is self-reported data and not a medical record.</span>
  </div>
</body>
</html>`
}

Deno.serve(async (req) => {
  try {
    // Get the user's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
    }

    // Fetch user's active procedures
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('procedure_type, provider_name, city, state, created_at, price_paid, units_or_volume, receipt_verified, notes')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (procError) {
      return new Response(JSON.stringify({ error: 'An error occurred. Please try again.' }), { status: 500 })
    }

    if (!procedures || procedures.length === 0) {
      return new Response(JSON.stringify({ error: 'No treatments found' }), { status: 404 })
    }

    const html = buildHtml(procedures, user.email || '')

    // Return HTML that the client can print-to-PDF, or use a headless browser service
    // For now, return HTML with print-friendly styling that the browser can print as PDF
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="GlowBuddy-Treatment-History.html"',
      },
    })
  } catch (err) {
    console.error('export-history error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500 }
    )
  }
})
