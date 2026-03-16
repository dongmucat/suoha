import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { useRoomStore } from '@/stores/use-room-store'
import { useChipStore } from '@/stores/use-chip-store'
import { celebrateWin, sadLose, listContainer, listItem } from '@/lib/animations'

export default function SettlementPage() {
  const navigate = useNavigate()
  const { settlement, cleanupRoom, clearSettlement, clearRoom } = useRoomStore()
  const [closing, setClosing] = useState(false)

  const handleClose = async () => {
    if (closing) return
    setClosing(true)
    try {
      if (settlement?.roomId) {
        await cleanupRoom(settlement.roomId)
      }
      useChipStore.getState().disconnect()
      clearSettlement()
      clearRoom()
      navigate('/')
    } catch {
      clearSettlement()
      clearRoom()
      navigate('/')
    }
  }

  if (!settlement) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
        <p className="text-text-secondary mb-4">没有结算数据</p>
        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-2xl bg-primary px-6 py-2.5 text-sm text-white shadow-[var(--shadow-cute)]"
        >
          返回首页
        </motion.button>
      </div>
    )
  }

  const sortedPlayers = [...settlement.players].sort((a, b) => b.chips - a.chips)

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-center bg-gradient-to-r from-primary to-accent px-4 py-3 text-white">
        <span className="text-sm font-semibold">牌局结算</span>
      </header>

      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-6">
        {/* Total Check */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="flex items-center gap-2 rounded-3xl bg-card px-5 py-3 shadow-[var(--shadow-cute)]"
        >
          <span className="text-sm text-text-secondary">总账校验：</span>
          {settlement.totalCheck ? (
            <span className="text-sm font-semibold text-success">✅ 通过（盈亏之和 = 0）</span>
          ) : (
            <span className="text-sm font-semibold text-danger">❌ 未通过</span>
          )}
        </motion.div>

        {/* Player Settlement List */}
        <div className="w-full max-w-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">玩家盈亏</h2>
          <motion.div
            className="space-y-2"
            variants={listContainer}
            initial="initial"
            animate="animate"
          >
            {sortedPlayers.map((player, index) => {
              const isFirst = index === 0 && player.chips > 0
              const isWin = player.chips > 0
              const isLose = player.chips < 0

              return (
                <motion.div
                  key={player.userId}
                  variants={isWin ? celebrateWin : isLose ? sadLose : listItem}
                  className={`flex items-center justify-between rounded-3xl px-4 py-3 shadow-[var(--shadow-cute)] transition-shadow ${
                    isFirst
                      ? 'bg-gradient-to-r from-accent/20 to-success/20 border-2 border-accent'
                      : isWin
                        ? 'bg-gradient-to-r from-success/10 to-card'
                        : isLose
                          ? 'bg-gradient-to-r from-danger/10 to-card'
                          : 'bg-card'
                  }`}
                >
                  <span className="text-text-primary">
                    {isFirst && '⭐ '}{player.nickname}
                  </span>
                  <span
                    className={`font-mono text-lg font-semibold ${
                      isWin
                        ? 'text-success'
                        : isLose
                          ? 'text-danger'
                          : 'text-text-secondary'
                    }`}
                  >
                    {player.chips > 0 ? '+' : ''}
                    {player.chips}
                  </span>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Close Button */}
        <motion.button
          onClick={handleClose}
          disabled={closing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          className="w-full max-w-sm rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cute)] hover:opacity-95 disabled:opacity-50 transition-opacity"
        >
          {closing ? '清理中...' : '关闭结算'}
        </motion.button>
      </main>
    </div>
  )
}