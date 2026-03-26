import { motion } from 'framer-motion'

type FlashCardProps = {
  front: string
  back: string
  flipped: boolean
  onFlip: () => void
}

export function FlashCard({ front, back, flipped, onFlip }: FlashCardProps) {
  return (
    <button
      type="button"
      onClick={onFlip}
      className="relative mx-auto h-[320px] w-full max-w-3xl cursor-pointer [perspective:1000px]"
      aria-label="Flip flashcard"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        className="relative h-full w-full rounded-3xl border border-brand-blue/50 bg-slate-900/90 p-8 text-left shadow-neon [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 flex h-full w-full items-center justify-center p-8 [backface-visibility:hidden]">
          <p className="text-center text-2xl font-bold text-slate-50">{front}</p>
        </div>
        <div className="absolute inset-0 flex h-full w-full items-center justify-center p-8 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <p className="text-center text-2xl font-bold text-brand-green">{back}</p>
        </div>
      </motion.div>
    </button>
  )
}
