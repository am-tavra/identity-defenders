'use client'
import { useEffect } from 'react'

export default function ReferralTracker({ scoreId }: { scoreId: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem('referredByScoreId', scoreId)
    } catch {}
  }, [scoreId])
  return null
}
