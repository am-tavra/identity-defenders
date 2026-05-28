import type { Metadata } from 'next'
import './game.css'
import GameLoader from '@/components/game/GameLoader'

export const metadata: Metadata = {
  title: 'Identity Defender — Identity Observability Driven Threat Protection',
  description: 'Stop rogue AI agents, LOTL impostors, and Scattered Spider raids. Hackers don\'t hack in — they log in. How many can you defend?',
  openGraph: {
    type: 'website',
    siteName: 'Identity Defender',
    title: 'Identity Defender',
    description: 'Stop rogue AI agents, LOTL impostors, and Scattered Spider raids. Hackers don\'t hack in — they log in. How many can you defend?',
    url: 'https://identity-defenders.vercel.app/',
    images: [{ url: 'https://identity-defenders.vercel.app/preview.png', width: 1200, height: 630, alt: 'Identity Defender score card' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Identity Defender',
    description: 'Stop rogue AI agents, LOTL impostors, and Scattered Spider raids. Hackers don\'t hack in — they log in. How many can you defend?',
    images: ['https://identity-defenders.vercel.app/preview.png'],
  },
}

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 overflow-hidden" style={{ overflowX: 'hidden' }}>
      <GameLoader />
    </main>
  )
}
