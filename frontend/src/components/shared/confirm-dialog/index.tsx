import { AnimatePresence, motion } from 'framer-motion'
import { useConfirmStore } from '@/stores/use-confirm-store'
import { modalOverlay, modalContent } from '@/lib/animations'

export default function ConfirmDialog() {
  const { open, title, message, close } = useConfirmStore()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={modalOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => close(false)}
        >
          <motion.div
            variants={modalContent}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mx-4 w-full max-w-xs rounded-3xl bg-card p-6 shadow-[var(--shadow-cute-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mb-6 text-sm text-text-secondary">{message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => close(false)}
                className="flex-1 rounded-2xl border border-border py-2.5 text-sm text-text-secondary active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                onClick={() => close(true)}
                className="flex-1 rounded-2xl bg-accent py-2.5 text-sm font-semibold text-white active:scale-95 transition-transform"
              >
                确定
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
