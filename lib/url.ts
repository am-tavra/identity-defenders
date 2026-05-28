export function getBaseUrl(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function shareUrl(scoreId: number): string {
  const base = typeof window !== 'undefined' ? window.location.origin : getBaseUrl()
  return `${base}/s/${scoreId}`
}

export function ogImageUrl(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString()
  return `${getBaseUrl()}/api/og?${query}`
}

export function getReferredByScoreId(): number | null {
  try {
    const val = sessionStorage.getItem('referredByScoreId')
    return val ? parseInt(val, 10) : null
  } catch {
    return null
  }
}

export function clearReferral(): void {
  try { sessionStorage.removeItem('referredByScoreId') } catch {}
}
