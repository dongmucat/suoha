import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore } from '@/stores/use-toast-store'
import { toastSlideIn } from '@/lib/animations'

export default function GlobalToast() {
  const message = useToastStore((s) => s.message)
  const hide = useToastStore((s) => s.hide)

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(hide, 3000)
    return () => clearTimeout(timer)
  }, [message, hide])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          variants={toastSlideIn}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-cute)]"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
