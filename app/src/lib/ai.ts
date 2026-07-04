/**
 * Client for the nexusblock AI server (natural language → diagram DSL).
 * The server holds the Claude API key; the browser only ever hits our endpoint.
 * Point `VITE_AI_URL` at the deployed server (defaults to the local dev server).
 */
const url = (import.meta.env.VITE_AI_URL as string | undefined) || 'http://localhost:8787'

/** AI generation is available whenever an endpoint is configured. */
export const isAiConfigured = !!url

/** Ask Claude to write flow/ERD DSL for a description, optionally editing existing DSL. */
export async function generateDsl(input: { kind: 'flow' | 'erd'; prompt: string; currentDsl?: string }): Promise<string> {
  const res = await fetch(`${url}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => null)
    throw new Error(msg?.error || `AI request failed (${res.status})`)
  }
  const data = (await res.json()) as { dsl?: string }
  if (!data.dsl) throw new Error('The AI returned an empty diagram.')
  return data.dsl
}
