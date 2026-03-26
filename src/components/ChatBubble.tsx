type ChatBubbleProps = {
  role: 'user' | 'assistant'
  text: string
}

export function ChatBubble({ role, text }: ChatBubbleProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isUser ? 'bg-brand-blue text-slate-950' : 'border border-edge bg-card text-heading'}`}>
        {text}
      </div>
    </div>
  )
}
