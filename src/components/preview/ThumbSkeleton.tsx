/**
 * The shape of a resume while the real one renders - a tinted header band,
 * a name bar, section stubs and text lines, softly shimmering. A blank white
 * card read as the template failing to load; a sketch in the template's own
 * accent reads as the template arriving.
 */
export function ThumbSkeleton({ accent = '#b9995a' }: { accent?: string }) {
  const line = (w: string, h = 4) => (
    <div style={{ width: w, height: h }} className="rounded-sm bg-slate-200/90" />
  )
  return (
    <div className="h-full w-full animate-pulse bg-white p-[9%]" aria-hidden>
      <div className="mb-[7%] space-y-[5px]">
        <div style={{ width: '55%', height: 9, background: accent, opacity: 0.85 }} className="rounded-sm" />
        {line('38%', 5)}
        {line('72%', 4)}
      </div>
      {[0, 1, 2].map((sec) => (
        <div key={sec} className="mb-[7%] space-y-[5px]">
          <div style={{ width: '30%', height: 5, background: accent, opacity: 0.45 }} className="rounded-sm" />
          {line('96%')}
          {line('88%')}
          {sec < 2 ? line('64%') : null}
        </div>
      ))}
    </div>
  )
}
