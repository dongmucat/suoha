import { motion, AnimatePresence } from 'framer-motion'
import { useChipStore } from '@/stores/use-chip-store'
import { numberPop, listItem } from '@/lib/animations'

interface PotDisplayProps {
  players: Array<{ userId: string; nickname: string }>
}

export default function PotDisplay({ players }: PotDisplayProps) {
  const { pot, bets } = useChipStore()

  return (
    <div className="w-full rounded-3xl bg-card py-8 px-4 shadow-[var(--shadow-cute)]">
      <div className="mx-auto max-w-sm">
        {/* 池底总额 */}
        <div className="text-center">
          <p className="mb-1 text-xs text-text-secondary">池底总额</p>
          <motion.p
            key={pot}
            variants={numberPop}
            initial="initial"
            animate="animate"
            className="font-mono text-text-primary"
            style={{ fontSize: '48px', lineHeight: '1.2' }}
          >
            {pot}
          </motion.p>
        </div>

        {/* 下注明细 */}
        <AnimatePresence>
          {Object.keys(bets).length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-text-secondary">本轮下注明细</p>
              {players.map((player) =>
                bets[player.userId] && bets[player.userId] > 0 ? (
                  <motion.div
                    key={player.userId}
                    variants={listItem}
                    initial="initial"
                    animate="animate"
                    className="flex justify-between text-sm"
                  >
                    <span className="text-text-secondary">{player.nickname}</span>
                    <span className="font-mono text-text-primary">{bets[player.userId]}</span>
                  </motion.div>
                ) : null
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
