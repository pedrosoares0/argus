'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Se for dispositivo móvel ou tela de toque primária, usar scroll nativo sem inércia artificial
    const isTouchDevice =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768)

    if (isTouchDevice) {
      return
    }

    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    const animId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(animId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
