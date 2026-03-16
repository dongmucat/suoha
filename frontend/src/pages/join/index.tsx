import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { useRoomStore } from '@/stores/use-room-store'
import Loading from '@/components/shared/loading'
import { listItem } from '@/lib/animations'

export default function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { joinRoom } = useRoomStore()
  const code = searchParams.get('code')
  const codeInvalid = !code || !/^\d{6}$/.test(code)
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(!codeInvalid)
  const error = codeInvalid ? '无效的房间链接' : joinError

  useEffect(() => {
    if (codeInvalid) {
      return
    }

    joinRoom(code)
      .then(({ roomId }) => {
        navigate(`/room/${roomId}`, { replace: true })
      })
      .catch((e: unknown) => {
        const err = e as { response?: { data?: { message?: string } }; message?: string }
        setJoinError(err.response?.data?.message || err.message || '加入房间失败')
        setJoining(false)
      })
  }, [searchParams, joinRoom, navigate, codeInvalid, code])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      {joining ? (
        <Loading />
      ) : (
        <motion.div
          variants={listItem}
          initial="initial"
          animate="animate"
          className="flex flex-col items-center gap-4"
        >
          <p className="text-danger">{error}</p>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-2xl bg-primary px-6 py-2.5 text-white shadow-[var(--shadow-cute)]"
          >
            返回首页
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
