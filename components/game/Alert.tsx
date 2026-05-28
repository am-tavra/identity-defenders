'use client'
import { useEffect, useRef, useState } from 'react'

interface AlertHandle {
  show: (text: string, ms?: number) => void
}

export function useAlert(): [AlertHandle, React.ReactNode] {
  const [text, setText] = useState('')
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = (t: string, ms = 1800) => {
    setText(t)
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), ms)
  }

  const node = (
    <div className={`alert-banner${visible ? ' show' : ''}`}>
      {text}
    </div>
  )

  return [{ show }, node]
}
