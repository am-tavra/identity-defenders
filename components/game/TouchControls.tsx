'use client'
import { useEffect, useRef } from 'react'

interface TouchControlsProps {
  visible: boolean
  onKeyChange: (key: string, down: boolean) => void
  onFire: (down: boolean) => void
}

export default function TouchControls({ visible, onKeyChange, onFire }: TouchControlsProps) {
  function makeTouchProps(keyName: string) {
    return {
      onTouchStart: (e: React.TouchEvent) => { e.preventDefault(); onKeyChange(keyName, true) },
      onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); onKeyChange(keyName, false) },
      onTouchCancel: () => onKeyChange(keyName, false),
    }
  }

  return (
    <div className={`touch-controls${visible ? ' visible' : ''}`}>
      <button
        className="touch-btn touch-btn-fire"
        onTouchStart={(e) => { e.preventDefault(); onFire(true) }}
        onTouchEnd={(e) => { e.preventDefault(); onFire(false) }}
        onTouchCancel={() => onFire(false)}
      >
        FIRE
      </button>
      <div className="touch-dpad">
        <button className="touch-btn" {...makeTouchProps('arrowleft')}>←</button>
        <button className="touch-btn" {...makeTouchProps('arrowright')}>→</button>
      </div>
    </div>
  )
}
