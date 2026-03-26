import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid2x2, List, Plus, Trash2, BrainCircuit } from 'lucide-react'
import { ImportSourceButton } from '../components/ImportSourceButton'
import { CreateDeckModal } from '../components/CreateDeckModal'
import { useDecksStore } from '../store/useDecksStore'
import { importSources } from '../data/mockData'
import { nextReviewLabel } from '../lib/sm2'

export function DecksPage() {
  const navigate = useNavigate()
  const decks = useDecksStore((s) => s.decks)
  const deleteDeck = useDecksStore((s) => s.deleteDeck)
  const getDueCount = useDecksStore((s) => s.getDueCount)
  const getMastery = useDecksStore((s) => s.getMastery)

  const [isGrid, setIsGrid] = useState(true)
  const [activeFolder, setActiveFolder] = useState('All Decks')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const allFolders = ['All Decks', ...Array.from(new Set(decks.map((d) => d.folder)))]

  const visibleDecks = useMemo(() => {
    if (activeFolder === 'All Decks') return decks
    return decks.filter((d) => d.folder === activeFolder)
  }, [activeFolder, decks])

  const formatLastStudied = (iso: string | null) => {
    if (!iso) return 'Never studied'
    const diffMs = Date.now() - new Date(iso).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
  }

  return (
    <>
      {showCreateModal && (
        <CreateDeckModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => navigate(`/study/${id}`)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="rounded-2xl border border-edge bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Folders</h2>
          <div className="space-y-1">
            {allFolders.map((folder) => (
              <button
                key={folder}
                type="button"
                onClick={() => setActiveFolder(folder)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${activeFolder === folder
                    ? 'bg-brand-violet/20 font-semibold text-brand-violet'
                    : 'text-sub hover:bg-heading/5'
                  }`}
              >
                {folder}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <section className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-black text-heading">Deck Library</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsGrid(true)}
                className={`rounded-lg border p-2 ${isGrid ? 'border-brand-blue text-brand-blue' : 'border-edge text-muted'}`}
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsGrid(false)}
                className={`rounded-lg border p-2 ${!isGrid ? 'border-brand-blue text-brand-blue' : 'border-edge text-muted'}`}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950"
              >
                <Plus className="h-4 w-4" /> Create Deck
              </button>
            </div>
          </div>

          {/* Deck grid/list */}
          {visibleDecks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-edge py-16 text-center text-muted">
              <p>No decks in this folder yet.</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-3 text-sm text-brand-blue underline"
              >
                Create your first deck
              </button>
            </div>
          ) : (
            <div className={isGrid ? 'grid gap-4 md:grid-cols-2' : 'space-y-3'}>
              {visibleDecks.map((deck) => {
                const due = getDueCount(deck.id)
                const mastery = getMastery(deck.id)

                return (
                  <article
                    key={deck.id}
                    className="group relative rounded-2xl border border-edge bg-card p-5 transition hover:-translate-y-0.5 hover:border-brand-blue/50"
                  >
                    {/* Delete button */}
                    {confirmDelete === deck.id ? (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-inset/90 p-4">
                        <p className="text-sm text-heading">Delete <strong>{deck.title}</strong>?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-edge px-4 py-2 text-sm text-sub">Cancel</button>
                          <button onClick={() => { deleteDeck(deck.id); setConfirmDelete(null) }} className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white">Delete</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(deck.id)}
                        className="absolute right-4 top-4 opacity-0 text-dim transition hover:text-red-500 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {/* Content */}
                    <div className="mb-3 flex items-start justify-between gap-8 pr-6">
                      <h3 className="text-base font-bold text-heading">{deck.title}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${due > 0 ? 'bg-brand-green/20 text-brand-green' : 'bg-rail text-muted'}`}>
                        {due > 0 ? `${due} due` : '✓ caught up'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted">
                      <p>{deck.cards.length} cards · {formatLastStudied(deck.lastStudied)} · {mastery}% mastered</p>
                      <p>Next review: {nextReviewLabel(deck.cards.find((c) => c.dueDate !== null)?.dueDate ?? null)}</p>
                    </div>

                    <div className="my-3 h-1.5 rounded-full bg-rail">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-green" style={{ width: `${mastery}%` }} />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/study/${deck.id}`)}
                        disabled={due === 0}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-blue/20 px-3 py-2 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue/30 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <BrainCircuit className="h-4 w-4" />
                        {due > 0 ? `Study (${due})` : 'Nothing due'}
                      </button>
                    </div>

                    {/* Tags */}
                    {deck.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {deck.tags.map((t) => (
                          <span key={t} className="rounded-full bg-rail px-2 py-0.5 text-[11px] text-muted">{t}</span>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}

          {/* Import sources */}
          <section className="rounded-2xl border border-edge bg-card p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Import Sources</h2>
            <div className="flex flex-wrap gap-2">
              {importSources.map((source) => (
                <ImportSourceButton key={source} label={source} disabled />
              ))}
            </div>
          </section>
        </section>
      </div>
    </>
  )
}
