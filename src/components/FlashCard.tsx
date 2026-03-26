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
      className="relative mx-auto h-56 w-full max-w-3xl cursor-pointer sm:h-72 md:h-[320px] [perspective:1000px]"
      aria-label="Flip flashcard"
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        className="relative h-full w-full rounded-3xl border border-brand-blue/50 bg-card p-8 text-left shadow-neon [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 flex h-full w-full items-center justify-center p-8 [backface-visibility:hidden]">
          <p className="text-center text-xl font-bold text-heading sm:text-2xl">{front}</p>
        </div>
        <div className="absolute inset-0 flex h-full w-full items-center justify-center p-8 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          <p className="text-center text-xl font-bold text-brand-green sm:text-2xl">{back}</p>
        </div>
      </motion.div>
    </button>
  )
}
