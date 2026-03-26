type ActivityHeatmapProps = {
  values: number[]
}

const intensityClass = ['bg-slate-800', 'bg-brand-violet/35', 'bg-brand-violet/60', 'bg-brand-violet', 'bg-brand-green']

export function ActivityHeatmap({ values }: ActivityHeatmapProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-100">Activity Heatmap</h3>
        <span className="text-xs uppercase tracking-widest text-slate-400">Last 6 weeks</span>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {values.map((value, idx) => (
          <div
            key={`${value}-${idx}`}
            className={`h-7 rounded-md ${intensityClass[value]} transition-transform hover:-translate-y-0.5`}
            title={`${value} study sessions`}
          />
        ))}
      </div>
    </section>
  )
}
