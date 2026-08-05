'use client'

import { motion } from 'motion/react'

/**
 * Template de rota do Next.js App Router — acionado a cada mudança de página.
 * Fornece uma transição sutil de página (fade in + leve deslocamento vertical de 8px com easing Apple)
 * que indica a mudança de rota sem ser exagerada ou lenta.
 */
export default function TemplateInspetor({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.995 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.22,
        ease: [0.23, 1, 0.32, 1], // Easing Apple
      }}
    >
      {children}
    </motion.div>
  )
}
