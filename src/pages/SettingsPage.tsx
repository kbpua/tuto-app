import { CloudUpload, Download, RotateCcw, Volume2, MoonStar, Flame } from 'lucide-react'
import { useState } from 'react'
import { flushCloudQueue } from '../lib/cloudSyncQueue'
import { useCloudSyncStore } from '../store/useCloudSyncStore'
import { useDecksStore } from '../store/useDecksStore'
import { useSettingsStore } from '../store/useSettingsStore'

function Row({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-edge bg-card p-4">
      <div>
        <p className="text-sm font-semibold text-heading">{title}</p>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-brand-blue"
        aria-label={title}
      />
    </label>
  )
}

export function SettingsPage() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const soundEnabled = useSettingsStore((s) => s.soundEnabled)
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled)
  const freezeStreakOnBreak = useSettingsStore((s) => s.freezeStreakOnBreak)
  const setFreezeStreakOnBreak = useSettingsStore((s) => s.setFreezeStreakOnBreak)
  const backupDecksToCloud = useDecksStore((s) => s.backupDecksToCloud)
  const restoreDecksFromCloud = useDecksStore((s) => s.restoreDecksFromCloud)
  const pendingCount = useCloudSyncStore((s) => s.pendingCount)
  const lastStatus = useCloudSyncStore((s) => s.lastStatus)
  const lastError = useCloudSyncStore((s) => s.lastError)
  const lastSyncedAt = useCloudSyncStore((s) => s.lastSyncedAt)
  const [cloudStatus, setCloudStatus] = useState<string>('')
  const [isSyncing, setIsSyncing] = useState(false)

  const resetAllData = () => {
    const approved = window.confirm(
      'Reset all local app data? This clears decks, progress, quiz history, and settings.',
    )
    if (!approved) return

    localStorage.removeItem('studyforge-app')
    localStorage.removeItem('studyforge-decks')
    localStorage.removeItem('studyforge-quiz')
    localStorage.removeItem('tuto-settings')
    window.location.reload()
  }

  const backupToCloud = async () => {
    const approved = window.confirm(
      'Backup local Decks + Cards to Supabase? This will REPLACE your current cloud decks for your account.',
    )
    if (!approved) return
    try {
      setIsSyncing(true)
      setCloudStatus('Backing up to cloud...')
      const res = await backupDecksToCloud()
      setCloudStatus(`Backup complete: ${res.decks} decks, ${res.cards} cards.`)
    } catch (e) {
      setCloudStatus(`Backup failed: ${(e as Error).message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const restoreFromCloud = async () => {
    const approved = window.confirm(
      'Restore Decks + Cards from Supabase? This will OVERWRITE your current local decks on this device.',
    )
    if (!approved) return
    try {
      setIsSyncing(true)
      setCloudStatus('Restoring from cloud...')
      const res = await restoreDecksFromCloud({ overwriteLocalIfCloudEmpty: true })
      setCloudStatus(`Restore complete: ${res.decks} decks, ${res.cards} cards.`)
    } catch (e) {
      setCloudStatus(`Restore failed: ${(e as Error).message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  const retryPendingSync = async () => {
    setIsSyncing(true)
    try {
      await flushCloudQueue()
      setCloudStatus('Retry complete. Pending sync queue processed.')
    } catch (e) {
      setCloudStatus(`Retry failed: ${(e as Error).message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <h1 className="text-2xl font-black text-heading">Settings</h1>

      <section className="space-y-3 rounded-2xl border border-edge bg-card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sub">Experience</h2>

        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-start gap-3 rounded-xl border border-edge bg-card p-4 text-left transition hover:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
          >
            <MoonStar className="mt-0.5 h-4 w-4 text-brand-blue" />
            <div>
              <p className="text-sm font-semibold text-heading">Theme</p>
              <p className="mt-1 text-xs text-muted">
                Current mode: <span className="font-semibold capitalize text-heading">{theme}</span>
              </p>
            </div>
          </button>

          <Row
            title="Sound Effects"
            description="Enable subtle click/feedback sounds for study actions."
            checked={soundEnabled}
            onChange={setSoundEnabled}
          />
        </div>

        <Row
          title="Streak Protection"
          description="Keep your streak if you miss a day (casual mode)."
          checked={freezeStreakOnBreak}
          onChange={setFreezeStreakOnBreak}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-violet/25 bg-brand-violet/10 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-heading">Cloud Sync (Supabase)</h2>
        <p className="text-sm text-sub">
          This lets you move your <span className="font-semibold text-heading">Decks + Cards</span> between this device and your Supabase account.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={backupToCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-edge bg-card px-3 py-2 text-sm font-semibold text-heading transition hover:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/60 disabled:opacity-70"
          >
            <CloudUpload className="h-4 w-4 text-brand-blue" />
            Backup to Cloud
          </button>
          <button
            type="button"
            onClick={restoreFromCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-edge bg-card px-3 py-2 text-sm font-semibold text-heading transition hover:border-brand-green/50 focus:outline-none focus:ring-2 focus:ring-brand-green/60 disabled:opacity-70"
          >
            <Download className="h-4 w-4 text-brand-green" />
            Restore from Cloud
          </button>
        </div>
        {cloudStatus && (
          <p className="rounded-xl border border-edge bg-inset px-3 py-2 text-xs text-heading">
            {cloudStatus}
          </p>
        )}
        <div className="rounded-xl border border-edge bg-inset px-3 py-2 text-xs text-sub">
          <p>
            Sync status: <span className="font-semibold capitalize text-heading">{lastStatus}</span> · Pending: <span className="font-semibold text-heading">{pendingCount}</span>
          </p>
          {lastSyncedAt && (
            <p className="mt-1 text-muted">Last synced: {new Date(lastSyncedAt).toLocaleString()}</p>
          )}
          {lastError && (
            <p className="mt-1 text-red-500">Last error: {lastError}</p>
          )}
          <button
            type="button"
            onClick={retryPendingSync}
            disabled={isSyncing || pendingCount === 0}
            className="mt-2 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-heading disabled:opacity-50"
          >
            Retry Pending Sync
          </button>
        </div>
        <p className="text-xs text-muted">
          Tip: Run <span className="font-semibold text-heading">Backup</span> once after you're happy with your local decks, then you can restore on any device after logging in.
        </p>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-red-500">Danger Zone</h2>
        <p className="mt-2 text-sm text-sub">
          This action permanently clears all saved local progress for Tuto on this browser.
        </p>
        <button
          type="button"
          onClick={resetAllData}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/60"
        >
          <RotateCcw className="h-4 w-4" />
          Reset All Data
        </button>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-edge bg-card p-4 text-sm text-sub">
          <p className="mb-2 flex items-center gap-2 font-semibold text-heading">
            <Volume2 className="h-4 w-4 text-brand-green" />
            Audio
          </p>
          Sound integration is ready; interaction sounds can be added page-by-page.
        </div>
        <div className="rounded-xl border border-edge bg-card p-4 text-sm text-sub">
          <p className="mb-2 flex items-center gap-2 font-semibold text-heading">
            <Flame className="h-4 w-4 text-brand-violet" />
            Streak Rules
          </p>
          Casual mode allows learning without pressure while still tracking progress.
        </div>
      </section>
    </div>
  )
}
