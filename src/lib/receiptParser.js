/**
 * Call the serverless function to parse a receipt image with Claude.
 * Returns parsed data or null on failure.
 */
export async function parseReceipt(storagePath) {
  try {
    const response = await fetch('/api/parse-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.valid === false) return null;

    return data;
  } catch {
    return null;
  }
}
