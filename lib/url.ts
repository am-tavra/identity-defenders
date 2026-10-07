export function getBaseUrl(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function shareUrl(scoreId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : getBaseUrl()
  return `${base}/s/${scoreId}`
}

export function ogImageUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString()
  return `${getBaseUrl()}/api/og?${query}`
}

// Score ids are bigint serials in this project; anything else in storage is ignored
export const SCORE_ID = /^\d{1,18}$/

export function getReferredByScoreId(): string | null {
  try {
    const val = sessionStorage.getItem('referredByScoreId')
    return val && SCORE_ID.test(val) ? val : null
  } catch {
    return null
  }
}

export function clearReferral(): void {
  try { sessionStorage.removeItem('referredByScoreId') } catch {}
}
