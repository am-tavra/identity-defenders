'use client'
import { useEffect, useState } from 'react'
import { formatCountdown } from '@/hooks/useCompetition'

export default function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [value, setValue] = useState(() => formatCountdown(endsAt))
  useEffect(() => {
    const interval = setInterval(() => setValue(formatCountdown(endsAt)), 1000)
    return () => clearInterval(interval)
  }, [endsAt])
  return <span>{value}</span>
}
