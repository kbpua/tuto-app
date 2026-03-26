import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layout/AppShell'
import { flushCloudQueue, initCloudQueueState } from './lib/cloudSyncQueue'
import { initAudioOnFirstInteraction } from './lib/sound'
import { useAuthStore } from './store/useAuthStore'
import { useAppStore } from './store/useAppStore'
import { useDecksStore } from './store/useDecksStore'
import { useQuizStore } from './store/useQuizStore'

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const DecksPage = lazy(() =>
  import('./pages/DecksPage').then((m) => ({ default: m.DecksPage })),
)
const StudyPage = lazy(() =>
  import('./pages/StudyPage').then((m) => ({ default: m.StudyPage })),
)
const QuizPage = lazy(() =>
  import('./pages/QuizPage').then((m) => ({ default: m.QuizPage })),
)
const TutorPage = lazy(() =>
  import('./pages/TutorPage').then((m) => ({ default: m.TutorPage })),
)
const LeaderboardPage = lazy(() =>
  import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
)
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const AuthPage = lazy(() =>
  import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })),
)
const MagicImportPage = lazy(() =>
  import('./pages/MagicImportPage').then((m) => ({ default: m.MagicImportPage })),
)

function PageFallback() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-52 animate-pulse rounded bg-rail" />
      <div className="h-24 animate-pulse rounded-2xl bg-card" />
      <div className="h-24 animate-pulse rounded-2xl bg-card" />
    </div>
  )
}

function ProtectedLayout() {
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const isEmailVerified = useAuthStore((s) => s.isEmailVerified)

  if (isLoading) return <PageFallback />
  if (!user || !isEmailVerified) return <Navigate to="/auth" replace />
  return <AppShell />
}

function AuthOnly() {
  const isLoading = useAuthStore((s) => s.isLoading)
  const user = useAuthStore((s) => s.user)
  const isEmailVerified = useAuthStore((s) => s.isEmailVerified)

  if (isLoading) return <PageFallback />
  if (user && isEmailVerified) return <Navigate to="/" replace />
  return <AuthPage />
}

function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const user = useAuthStore((s) => s.user)
  const restoreDecksFromCloud = useDecksStore((s) => s.restoreDecksFromCloud)
  const hydrateProgressFromCloud = useAppStore((s) => s.hydrateProgressFromCloud)
  const hydrateStudyHistoryFromCloud = useAppStore((s) => s.hydrateStudyHistoryFromCloud)
  const hydrateAttemptsFromCloud = useQuizStore((s) => s.hydrateAttemptsFromCloud)

  useEffect(() => {
    let unsubscribe: () => void = () => { }
    initialize().then((cleanup) => {
      unsubscribe = cleanup
    })
    return () => unsubscribe()
  }, [initialize])

  useEffect(() => {
    initCloudQueueState()
    initAudioOnFirstInteraction()
    const onOnline = () => {
      void flushCloudQueue()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  useEffect(() => {
    if (!user) return
    void restoreDecksFromCloud().catch((e: unknown) => {
      console.error('Initial cloud restore failed:', e)
    })
    void hydrateProgressFromCloud().catch((e: unknown) => {
      console.error('User progress cloud hydrate failed:', e)
    })
    void hydrateStudyHistoryFromCloud().catch((e: unknown) => {
      console.error('Study history cloud hydrate failed:', e)
    })
    void hydrateAttemptsFromCloud().catch((e: unknown) => {
      console.error('Quiz attempts cloud hydrate failed:', e)
    })
    void flushCloudQueue().catch((e: unknown) => {
      console.error('Cloud queue flush failed:', e)
    })
  }, [
    user,
    restoreDecksFromCloud,
    hydrateProgressFromCloud,
    hydrateStudyHistoryFromCloud,
    hydrateAttemptsFromCloud,
  ])

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/auth" element={<AuthOnly />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/decks" element={<DecksPage />} />
          {/* /study shows deck picker; /study/:deckId runs a session */}
          <Route path="/study" element={<StudyPage />} />
          <Route path="/study/:deckId" element={<StudyPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/tutor" element={<TutorPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/import" element={<MagicImportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App
