import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChatBubble } from '../components/ChatBubble'

type ChatMsg = {
  id: string
  role: 'assistant' | 'user'
  text: string
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

const QUICK_PROMPTS = [
  'Explain this concept simply',
  'Quiz me (5 questions)',
  'Help me make flashcards from my notes',
]

export function TutorPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'seed-1',
      role: 'assistant',
      text: "Yo! I'm Tuto. Paste a concept or ask anything—I'll explain, quiz you, or help you turn notes into flashcards.",
    },
  ])
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const canSend = input.trim().length > 0 && !isSending

  const apiPayload = useMemo(
    () => ({
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        text: m.text,
      })),
    }),
    [messages],
  )

  const send = async (text: string) => {
    const t = text.trim()
    if (!t || isSending) return
    setError('')
    setIsSending(true)

    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: 'user', text: t }
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    try {
      const res = await fetch('/api/tutor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...apiPayload.messages, { role: 'user', text: t }],
        }),
      })

      const rawText = await res.text()
      const parsed = tryParseJson(rawText)
      const json = (parsed ?? {}) as { reply?: string; error?: string }

      if (!res.ok || !json.reply) {
        const msgFromJson = json.error ?? ''
        const msgFromBody = rawText.trim()
        const msg = msgFromJson || msgFromBody || `Tutor chat failed (HTTP ${res.status}).`
        const hint =
          res.status === 404
            ? 'Hint: are you running `npx vercel dev` and opening the app on that port? Vite dev does not serve /api routes.'
            : ''
        setError([msg, hint].filter(Boolean).join('\n'))
        return
      }
      const assistantMsg: ChatMsg = { id: crypto.randomUUID(), role: 'assistant', text: json.reply }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-heading">Tuto the Tuko🦎</h1>

      <div className="rounded-2xl border border-edge bg-card p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              disabled={isSending}
              className="rounded-full border border-brand-violet/40 bg-brand-violet/10 px-3 py-1 text-xs font-semibold text-brand-violet disabled:opacity-60"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {messages.map((message) => (
            <ChatBubble key={message.id} role={message.role} text={message.text} />
          ))}
          {isSending && (
            <motion.div
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="inline-flex items-center gap-2 rounded-xl border border-edge bg-inset px-3 py-2 text-xs text-muted"
            >
              Tuto is typing...
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void send(input)
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask anything…"
          className="flex-1 rounded-xl border border-edge bg-inset px-4 py-3 text-sm text-heading outline-none focus:border-brand-blue"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  )
}
