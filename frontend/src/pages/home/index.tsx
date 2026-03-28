import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/use-auth-store'
import { useRoomStore } from '@/stores/use-room-store'
import { listItem, listContainer, shakeError } from '@/lib/animations'
import PokerRulesModal from '@/components/shared/poker-rules-modal'

export default function HomePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { createRoom, joinRoom, isLoading, error } = useRoomStore()
  const [roomCode, setRoomCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [showRules, setShowRules] = useState(false)

  // 如果用户已在房间中，自动跳转到该房间
  useEffect(() => {
    if (user?.currentRoomId) {
      navigate(`/room/${user.currentRoomId}`, { replace: true })
    }
  }, [user?.currentRoomId, navigate])

  const handleCreateRoom = async () => {
    setLocalError('')
    try {
      const { roomId } = await createRoom()
      navigate(`/room/${roomId}`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setLocalError(err.response?.data?.message || err.message || '创建房间失败')
    }
  }

  const handleJoinRoom = async () => {
    setLocalError('')
    if (!/^\d{6}$/.test(roomCode)) {
      setLocalError('请输入6位数字房间号')
      return
    }
    try {
      const { roomId } = await joinRoom(roomCode)
      navigate(`/room/${roomId}`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string }
      setLocalError(err.response?.data?.message || err.message || '加入房间失败')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const displayError = localError || error

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between bg-gradient-to-r from-primary to-accent px-4 py-3 text-white">
        <div>
          <div className="text-lg font-bold">suoha</div>
          <div className="text-xs opacity-80">线下德州扑克筹码记账</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm">{user?.nickname}</span>
          <button
            onClick={() => setShowRules(true)}
            className="flex items-center justify-center rounded-2xl bg-white/20 p-1 hover:bg-white/30"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="rounded-2xl bg-white/20 px-3 py-1 text-sm hover:bg-white/30"
          >
            退出
          </button>
        </div>
      </header>

      <motion.main
        className="flex flex-1 flex-col items-center justify-center gap-6 px-4"
        variants={listContainer}
        initial="initial"
        animate="animate"
      >
        <div className="w-full max-w-sm space-y-4">
          <motion.div variants={listItem} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full rounded-3xl bg-gradient-to-r from-primary to-accent py-4 text-lg font-semibold text-white shadow-[var(--shadow-cute)] hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? '处理中...' : '创建房间'}
            </button>
          </motion.div>

          <motion.div variants={listItem} className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-bg px-3 text-text-secondary">✦</span>
            </div>
          </motion.div>

          <motion.div variants={listItem} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="输入6位房间号"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.replace(/\D/g, ''))}
              className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-center text-lg tracking-widest outline-none focus:ring-2 focus:ring-primary"
            />
            <motion.button
              onClick={handleJoinRoom}
              disabled={isLoading || roomCode.length !== 6}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-2xl bg-accent px-6 py-3 font-semibold text-white shadow-[var(--shadow-cute-accent)] hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              加入
            </motion.button>
          </motion.div>

          <AnimatePresence>
            {displayError && (
              <motion.p
                variants={shakeError}
                animate="animate"
                className="text-center text-sm text-danger"
              >
                {displayError}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.main>

      <PokerRulesModal open={showRules} onClose={() => setShowRules(false)} />
    </div>
  )
}
