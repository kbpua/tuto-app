import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { useDecksStore } from '../store/useDecksStore'

type NewCard = { front: string; back: string }

type CreateDeckModalProps = {
  onClose: () => void
  onCreated?: (deckId: string) => void
}

const FOLDERS = ['Science', 'Humanities', 'Languages', 'Custom']

export function CreateDeckModal({ onClose, onCreated }: CreateDeckModalProps) {
  const createDeck = useDecksStore((s) => s.createDeck)
  const addCard = useDecksStore((s) => s.addCard)

  const [title, setTitle] = useState('')
  const [folder, setFolder] = useState('Custom')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [cards, setCards] = useState<NewCard[]>([{ front: '', back: '' }])
  const [error, setError] = useState('')

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const addCardRow = () => setCards((prev) => [...prev, { front: '', back: '' }])

  const updateCard = (idx: number, field: 'front' | 'back', value: string) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const removeCard = (idx: number) => {
    setCards((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Deck title is required.'); return }
    const validCards = cards.filter((c) => c.front.trim() && c.back.trim())
    if (validCards.length === 0) { setError('Add at least one complete card.'); return }

    const deckId = createDeck(title.trim(), folder, tags)
    validCards.forEach((c) => addCard(deckId, c.front.trim(), c.back.trim()))
    onCreated?.(deckId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-edge bg-inset p-6 shadow-neon">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-heading">Create New Deck</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-edge p-2 text-muted hover:text-heading">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Deck info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Deck Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Calculus II Derivatives"
                className="w-full rounded-xl border border-edge bg-card px-4 py-3 text-sm text-heading outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Folder</label>
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="w-full rounded-xl border border-edge bg-card px-4 py-3 text-sm text-heading outline-none focus:border-brand-blue"
              >
                {FOLDERS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-widest text-muted">Tags</label>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Add tag + Enter"
                  className="flex-1 rounded-xl border border-edge bg-card px-3 py-3 text-sm text-heading outline-none focus:border-brand-blue"
                />
                <button type="button" onClick={addTag} className="rounded-xl bg-brand-violet/20 px-3 text-brand-violet hover:bg-brand-violet/30">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 rounded-full bg-brand-violet/20 px-2 py-1 text-xs text-brand-violet">
                      {t}
                      <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-muted">Cards</label>
              <button type="button" onClick={addCardRow} className="inline-flex items-center gap-1 rounded-lg bg-brand-green/10 px-3 py-1 text-xs font-semibold text-brand-green hover:bg-brand-green/20">
                <Plus className="h-3 w-3" /> Add Card
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
              {cards.map((card, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                  <input
                    value={card.front}
                    onChange={(e) => updateCard(idx, 'front', e.target.value)}
                    placeholder="Front (question)"
                    className="rounded-xl border border-edge bg-card px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
                  />
                  <input
                    value={card.back}
                    onChange={(e) => updateCard(idx, 'back', e.target.value)}
                    placeholder="Back (answer)"
                    className="rounded-xl border border-edge bg-card px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
                  />
                  <button type="button" onClick={() => removeCard(idx)} disabled={cards.length === 1} className="mt-2 text-dim hover:text-red-500 disabled:opacity-30">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-edge py-3 text-sm text-sub hover:bg-heading/5">
              Cancel
            </button>
            <button type="submit" className="flex-1 rounded-xl bg-brand-green py-3 text-sm font-bold text-slate-950">
              Create Deck
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
