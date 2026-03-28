import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'

import { BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRoomStore } from '@/stores/use-room-store'
import { useAuthStore } from '@/stores/use-auth-store'
import { useChipStore } from '@/stores/use-chip-store'
import { toast } from '@/stores/use-toast-store'
import { confirm } from '@/stores/use-confirm-store'
import { modalOverlay, modalContent, listItem, listContainer, buttonTap } from '@/lib/animations'
import PotDisplay from './components/pot-display'
import PokerRulesModal from '@/components/shared/poker-rules-modal'

function SplitPotModal({
  players,
  onConfirm,
  onClose,
  pot,
}: {
  players: { userId: string; nickname: string }[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
  pot: number
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const share = selected.size > 0 ? Math.floor(pot / selected.size) : 0
  const remainder = selected.size > 0 ? pot - share * selected.size : 0

  return (
    <motion.div
      variants={modalOverlay}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        variants={modalContent}
        initial="initial"
        animate="animate"
        exit="exit"
/* PLACEHOLDER_SPLIT_MODAL_BODY */
        className="mx-4 w-full max-w-sm rounded-3xl bg-card p-6 shadow-[var(--shadow-cute-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-text-primary">平分池底</h3>
        <p className="mb-3 text-sm text-text-secondary">池底总额: {pot}</p>
        <div className="mb-4 space-y-2">
          {players.map((p) => (
            <label
              key={p.userId}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border px-3 py-2 hover:bg-bg transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(p.userId)}
                onChange={() => toggle(p.userId)}
                className="h-5 w-5 rounded accent-accent"
              />
              <span className="text-text-primary">{p.nickname}</span>
            </label>
          ))}
        </div>
        {selected.size > 0 && (
          <p className="mb-4 text-sm text-text-secondary">
            每人分得: {share}{remainder > 0 ? `，余数 ${remainder} 保留在池底` : ''}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-border py-2.5 text-sm text-text-secondary active:scale-95 transition-transform"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0}
            className="flex-1 rounded-2xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50 active:scale-95 transition-transform"
          >
            确认平分
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function RoomPage() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const { room, isLoading, error, fetchRoomInfo, leaveRoom } = useRoomStore()
  const { chips, pot, connected, reconnecting, connect, disconnect, placeBet, collectPot, splitPot, socket, manualReconnect, justReconnected, gameEnded, transferOwner, endGame: endGameSocket } = useChipStore()

  const [customAmount, setCustomAmount] = useState('')
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [confirmBet, setConfirmBet] = useState<number | null>(null)
  const [showRules, setShowRules] = useState(false)
  const connectedRef = useRef(false)

  useEffect(() => {
    if (justReconnected) {
      toast('已重新连接')
      useChipStore.setState({ justReconnected: false })
    }
  }, [justReconnected])

  useEffect(() => {
    if (gameEnded && roomId) {
      useChipStore.setState({ gameEnded: false })
      disconnect()
      connectedRef.current = false
      navigate(`/settlement/${roomId}`)
    }
  }, [gameEnded, roomId, navigate, disconnect])

  useEffect(() => {
    if (roomId) {
      fetchRoomInfo(roomId)
    }
  }, [roomId, fetchRoomInfo])

  // 如果房间不存在，清除用户状态并返回首页
  useEffect(() => {
    if (error && !isLoading && !room) {
      const currentUser = useAuthStore.getState().user
      if (currentUser?.currentRoomId === roomId) {
        useAuthStore.setState({
          user: {
            userId: currentUser.userId,
            phone: currentUser.phone,
            nickname: currentUser.nickname,
            currentRoomId: null
          }
        })
      }
      toast('房间不存在或已关闭')
      navigate('/', { replace: true })
    }
  }, [error, isLoading, room, roomId, navigate, toast])

  useEffect(() => {
    if (roomId && token && !connectedRef.current) {
      connect(token, roomId)
      connectedRef.current = true
    }
    return () => {
      if (connectedRef.current) {
        disconnect()
        connectedRef.current = false
      }
    }
  }, [roomId, token, connect, disconnect])

  if (isLoading || !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-text-secondary">加载中...</p>
      </div>
    )
  }

const isHost = user?.userId === room.hostUserId

  const handleBet = (amount: number) => { setConfirmBet(amount) }

  const handleConfirmBet = () => {
    if (confirmBet && confirmBet > 0) {
      placeBet(confirmBet)
      toast(`下注 ${confirmBet} 成功`)
      setConfirmBet(null)
      setCustomAmount('')
    }
  }

  const handleCustomBet = () => {
    const amount = parseInt(customAmount, 10)
    if (!amount || amount <= 0 || isNaN(amount)) {
      toast('请输入有效的正整数金额')
      return
    }
    handleBet(amount)
  }

  const handleCollectPot = async () => {
    if (pot === 0) { toast('池底为空，无法收回'); return }
    if (!(await confirm(`确定收回池底 ${pot} 到自己账上吗？`))) return
    collectPot()
    toast('收回池底成功')
  }

  const handleSplitConfirm = (ids: string[]) => {
    if (pot === 0) { toast('池底为空，无法平分'); setShowSplitModal(false); return }
    splitPot(ids)
    toast('平分池底成功')
    setShowSplitModal(false)
  }

  const handleLeave = async () => {
    if (!(await confirm('确定退出房间吗？'))) return
    try { await leaveRoom(room.roomId); navigate('/') } catch { /* error in store */ }
  }

  const handleTransfer = async (targetUserId: string) => {
    const targetPlayer = room.players.find((p) => p.userId === targetUserId)
    if (!(await confirm(`确定将房主转让给 ${targetPlayer?.nickname}？`))) return
    if (room.players.length <= 1) { toast('房间内没有其他玩家，无法转让'); return }
    const res = await transferOwner(targetUserId)
    if (res.success) { toast(`${res.newHostNickname || targetPlayer?.nickname} 已成为房主`) }
    else { toast(res.error || '转让房主失败') }
  }

  const handleEndGame = async () => {
    if (pot > 0) { toast(`池底还有 ${pot} 未分配，请先收回或平分池底`); return }
    if (!(await confirm('确定结束牌局并进入结算？'))) return
    const res = await endGameSocket()
    if (res.success) { disconnect(); connectedRef.current = false; navigate(`/settlement/${room.roomId}`) }
    else { toast(res.error || '结束牌局失败') }
  }

/* PLACEHOLDER_ROOM_JSX */
  return (
    <div className="flex min-h-screen flex-col bg-bg">

      {/* 重连失败遮罩 */}
      <AnimatePresence>
        {!connected && !reconnecting && socket !== null && (
          <motion.div
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50"
          >
            <motion.div variants={modalContent} initial="initial" animate="animate" exit="exit" className="mx-4 rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-cute-lg)]">
              <div className="mb-3 h-3 w-3 mx-auto rounded-full bg-danger" />
              <p className="mb-4 text-sm text-text-primary">网络连接失败，请检查网络后点击重试</p>
              <motion.button
                onClick={manualReconnect}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                className="rounded-2xl bg-accent px-8 py-3 text-sm font-semibold text-white"
                style={{ minHeight: '44px' }}
              >
                重试连接
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 确认下注弹窗 */}
      <AnimatePresence>
        {confirmBet !== null && (
          <motion.div
            variants={modalOverlay}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
            onClick={() => setConfirmBet(null)}
          >
            <motion.div
              variants={modalContent}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mx-4 w-full max-w-xs rounded-3xl bg-card p-6 shadow-[var(--shadow-cute-lg)]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="mb-4 text-center text-lg text-text-primary">
                确认下注 <span className="font-bold text-accent">{confirmBet}</span> ？
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmBet(null)} className="flex-1 rounded-2xl border border-border py-2.5 text-sm text-text-secondary active:scale-95 transition-transform">
                  取消
                </button>
                <button onClick={handleConfirmBet} className="flex-1 rounded-2xl bg-accent py-2.5 text-sm font-semibold text-white active:scale-95 transition-transform">
                  确认
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 平分池底弹窗 */}
      <AnimatePresence>
        {showSplitModal && (
          <SplitPotModal
            players={room.players}
            pot={pot}
            onConfirm={handleSplitConfirm}
            onClose={() => setShowSplitModal(false)}
          />
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-4 py-3 text-white">
        <button onClick={handleLeave} className="text-sm hover:opacity-80">
          ← 退出
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">房间 {room.roomCode}</span>
          <div className="flex items-center gap-1">
            {reconnecting ? (
              <div className="h-2 w-2 animate-spin rounded-full border-2 border-yellow-300 border-t-transparent" title="重连中..." />
            ) : connected ? (
              <div className="h-2 w-2 rounded-full bg-success" title="已连接" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-danger" title="未连接" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center justify-center rounded-2xl p-1 hover:opacity-80"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <BookOpen size={18} />
          </button>
          <span className="text-xs">{room.status}</span>
        </div>
      </header>

      <motion.main
        className="flex flex-1 flex-col items-center gap-4 px-4 py-4 pb-56"
        variants={listContainer}
        initial="initial"
        animate="animate"
      >
        {error && (
          <div className="w-full max-w-sm rounded-2xl bg-danger/10 px-4 py-2 text-sm text-danger">
            {error}
          </div>
        )}

{/* 池底显示 */}
        <motion.div variants={listItem} className="w-full max-w-sm">
          <PotDisplay players={room.players} />
        </motion.div>

        {/* 玩家列表 */}
        <div className="w-full max-w-sm">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">
            玩家列表 ({room.players.length}/8)
          </h2>
          <motion.div className="space-y-2" variants={listContainer} initial="initial" animate="animate">
            {room.players.map((player) => (
              <motion.div
                key={player.userId}
                variants={listItem}
                whileHover={{ scale: 1.01, boxShadow: '0 4px 20px rgba(255,107,157,0.15)' }}
                className="flex items-center justify-between rounded-3xl bg-card px-4 py-3 shadow-[var(--shadow-cute)] transition-shadow"
              >
                <div className="flex items-center gap-2">
                  <span className="text-text-primary">{player.nickname}</span>
                  {player.userId === room.hostUserId && (
                    <span className="rounded-xl bg-accent/20 px-2 py-0.5 text-xs text-accent">房主</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-[20px] font-mono transition-all duration-300 ease-out"
                    style={{ color: (chips[player.userId] ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                  >
                    {chips[player.userId] ?? 0}
                  </span>
                  {isHost && player.userId !== user?.userId && (
                    <button
                      onClick={() => handleTransfer(player.userId)}
                      className="rounded-xl bg-bg px-2 py-0.5 text-xs text-text-secondary hover:bg-border transition-colors"
                    >
                      转让
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* 房间操作 */}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            onClick={() => roomId && fetchRoomInfo(roomId)}
            disabled={isLoading}
            className="rounded-2xl border border-border px-6 py-2 text-sm text-text-secondary hover:bg-card disabled:opacity-50 transition-colors"
          >
            刷新玩家列表
          </button>
          {isHost && (
            <button
              onClick={handleEndGame}
              disabled={isLoading}
              className="rounded-2xl bg-danger px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              结束牌局
            </button>
          )}
        </div>
      </motion.main>

      {/* 底部操作区 - 固定 */}
      <div className="fixed bottom-0 left-0 right-0 overflow-hidden border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {/* 快捷下注按钮 */}
        <div className="mb-3 flex gap-2">
          {[20, 50, 100, 1000].map((amount) => (
            <motion.button
              key={amount}
              onClick={() => handleBet(amount)}
              variants={buttonTap}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="flex-1 rounded-2xl bg-accent py-3 text-sm font-semibold text-white shadow-[var(--shadow-cute-accent)]"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {amount}
            </motion.button>
          ))}
        </div>

        {/* 自定义金额 */}
        <div className="mb-3 flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="自定义金额"
            className="flex-1 rounded-2xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <motion.button
            onClick={handleCustomBet}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-2xl bg-accent px-6 py-2 text-sm font-semibold text-white"
            style={{ minHeight: '44px' }}
          >
            下注
          </motion.button>
        </div>

        {/* 收回/平分 */}
        <div className="flex gap-2">
          <motion.button
            onClick={handleCollectPot}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 rounded-2xl border border-text-primary py-3 text-sm font-semibold text-text-primary"
            style={{ minHeight: '44px' }}
          >
            收回池底
          </motion.button>
          <motion.button
            onClick={() => {
              if (pot === 0) { toast('池底为空，无法平分'); return }
              setShowSplitModal(true)
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 rounded-2xl border border-text-primary py-3 text-sm font-semibold text-text-primary"
            style={{ minHeight: '44px' }}
          >
            平分池底
          </motion.button>
        </div>
      </div>

      <PokerRulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
  )
}
