import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores/use-auth-store'
import ProtectedRoute from '@/components/shared/protected-route'
import Loading from '@/components/shared/loading'
import GlobalToast from '@/components/shared/global-toast'
import ConfirmDialog from '@/components/shared/confirm-dialog'
import { pageTransition } from '@/lib/animations'

const LoginPage = lazy(() => import('@/pages/login'))
const HomePage = lazy(() => import('@/pages/home'))
const RoomPage = lazy(() => import('@/pages/room'))
const JoinPage = lazy(() => import('@/pages/join'))
const SettlementPage = lazy(() => import('@/pages/settlement'))

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageWrapper><LoginPage /></PageWrapper>} />
        <Route path="/" element={<ProtectedRoute><PageWrapper><HomePage /></PageWrapper></ProtectedRoute>} />
        <Route path="/room/:roomId" element={<ProtectedRoute><PageWrapper><RoomPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/join" element={<ProtectedRoute><PageWrapper><JoinPage /></PageWrapper></ProtectedRoute>} />
        <Route path="/settlement/:roomId" element={<ProtectedRoute><PageWrapper><SettlementPage /></PageWrapper></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <GlobalToast />
      <ConfirmDialog />
      <Suspense fallback={<Loading />}>
        <AnimatedRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
