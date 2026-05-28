import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Identity Defender — Identity Observability Driven Threat Protection',
  description: 'Stop rogue AI agents, LOTL impostors, and Scattered Spider raids. Hackers don\'t hack in — they log in. How many can you defend?',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
