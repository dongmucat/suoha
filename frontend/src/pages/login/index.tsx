import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/use-auth-store'
import { Button } from '@/components/ui/button'
import { shakeError, listItem, listContainer } from '@/lib/animations'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const phoneValid = /^1\d{10}$/.test(phone)
  const passwordValid = password.length >= 6

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!phoneValid) {
      setError('请输入正确的11位手机号')
      return
    }
    if (!passwordValid) {
      setError('密码至少6位')
      return
    }

    setLoading(true)
    try {
      await login(phone, password)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '登录失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <motion.div
        className="w-full max-w-sm px-6"
        variants={listContainer}
        initial="initial"
        animate="animate"
      >
        <motion.h1
          variants={listItem}
          className="text-4xl font-bold text-center text-primary mb-2 tracking-wide"
        >
          suoha
        </motion.h1>
        <motion.p
          variants={listItem}
          className="text-center text-sm text-text-secondary mb-6"
        >
          线下德州扑克筹码记账系统
        </motion.p>

        <motion.form variants={listItem} onSubmit={handleSubmit} className="space-y-4 rounded-3xl bg-card p-6 shadow-[var(--shadow-cute)]">
          <div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="w-full h-12 px-4 rounded-2xl border border-border bg-card text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {phone.length > 0 && !phoneValid && (
              <p className="mt-1 text-sm text-danger">请输入正确的11位手机号</p>
            )}
          </div>

          <div>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl border border-border bg-card text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {password.length > 0 && !passwordValid && (
              <p className="mt-1 text-sm text-danger">密码至少6位</p>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                variants={shakeError}
                animate="animate"
                className="text-sm text-danger text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-white text-base font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </motion.div>
        </motion.form>

        <motion.p variants={listItem} className="mt-6 text-center text-sm text-text-secondary">
          未注册的手机号将自动创建账号
        </motion.p>
      </motion.div>
    </div>
  )
}
