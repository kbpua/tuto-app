import { motion } from 'framer-motion'

type XPBarProps = {
  current: number
  max: number
  level: number
}

export function XPBar({ current, max, level }: XPBarProps) {
  const progress = Math.min((current / max) * 100, 100)

  return (
    <section className="rounded-2xl border border-edge bg-card p-5 shadow-neon">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted">XP Level</p>
        <span className="rounded-full border border-brand-violet/60 bg-brand-violet/20 px-3 py-1 text-xs font-semibold text-brand-violet">
          Lv. {level}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-rail">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-brand-blue via-brand-violet to-brand-green"
        />
      </div>
      <p className="mt-2 text-sm text-sub">
        {current} / {max} XP to next level
      </p>
    </section>
  )
}
