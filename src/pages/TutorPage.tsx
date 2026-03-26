import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChatBubble } from '../components/ChatBubble'
import { tutorMessages, tutorPrompts } from '../data/mockData'

export function TutorPage() {
  const [input, setInput] = useState('')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-heading">AI Tutor Chat</h1>

      <div className="rounded-2xl border border-edge bg-card p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {tutorPrompts.map((prompt) => (
            <button key={prompt} type="button" className="rounded-full border border-brand-violet/40 bg-brand-violet/10 px-3 py-1 text-xs font-semibold text-brand-violet">
              {prompt}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tutorMessages.map((message) => (
            <ChatBubble key={message.id} role={message.role} text={message.text} />
          ))}
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="inline-flex items-center gap-2 rounded-xl border border-edge bg-inset px-3 py-2 text-xs text-muted"
          >
            Tutor is typing...
          </motion.div>
        </div>
      </div>

      <form className="flex gap-2" onSubmit={(event) => event.preventDefault()}>
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything..." className="flex-1 rounded-xl border border-edge bg-inset px-4 py-3 text-sm text-heading outline-none focus:border-brand-blue" />
        <button type="submit" className="rounded-xl bg-brand-green px-4 py-3 text-sm font-semibold text-slate-950">Send</button>
      </form>
    </div>
  )
}
