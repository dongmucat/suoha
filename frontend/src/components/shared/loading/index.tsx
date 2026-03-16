import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'

const dotVariants: Variants = {
  animate: (i: number) => ({
    y: [0, -12, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 0.3,
      delay: i * 0.15,
      ease: 'easeInOut' as const,
    },
  }),
}

const colors = ['bg-primary', 'bg-accent', 'bg-success']

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="flex gap-2">
        {colors.map((color, i) => (
          <motion.div
            key={i}
            className={`w-3 h-3 rounded-full ${color}`}
            custom={i}
            animate="animate"
            variants={dotVariants}
          />
        ))}
      </div>
    </div>
  )
}
