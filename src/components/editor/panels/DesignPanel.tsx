import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { cn } from '@/lib/utils'
import { Slider, Toggle, Segmented, ColorField, FieldGroup } from '../fields/Controls'
import { FontSelect } from '../fields/FontSelect'

const BULLET_OPTIONS = [
  ['disc', '●'],
  ['circle', '○'],
  ['square', '▪'],
  ['dash', '–'],
  ['arrow', '›'],
  ['check', '✓'],
  ['diamond', '◆'],
  ['none', '∅'],
] as const

const PALETTES: { name: string; color: string }[] = [
  { name: 'Indigo', color: '#2563eb' },
  { name: 'Royal', color: '#1d4ed8' },
  { name: 'Charcoal', color: '#1f2937' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Cyan', color: '#0891b2' },
  { name: 'Violet', color: '#7c3aed' },
  { name: 'Rose', color: '#e11d48' },
  { name: 'Crimson', color: '#9f1239' },
  { name: 'Amber', color: '#b45309' },
  { name: 'Navy', color: '#1e3a5f' },
  { name: 'Slate', color: '#475569' },
]

export function DesignPanel({ doc }: { doc: ResumeDocument }) {
  const update = useResumeStore((s) => s.updateMetadata)
  const m = doc.metadata
  const twoCol = m.layout.columns === 2

  return (
    <div className="space-y-6">
      <FieldGroup title="Accent color">
        <div className="grid grid-cols-6 gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.name}
              title={p.name}
              onClick={() => update((md) => { md.theme.primary = p.color })}
              className="h-8 w-full rounded-md border border-border transition-transform hover:scale-110"
              style={{ background: p.color, outline: m.theme.primary === p.color ? '2px solid hsl(var(--ring))' : undefined, outlineOffset: 2 }}
            />
          ))}
        </div>
        <ColorField label="Primary" value={m.theme.primary} onChange={(v) => update((md) => { md.theme.primary = v })} />
        <ColorField label="Body text" value={m.theme.text} onChange={(v) => update((md) => { md.theme.text = v })} />
        <ColorField label="Muted text" value={m.theme.muted} onChange={(v) => update((md) => { md.theme.muted = v })} />
        <ColorField label="Background" value={m.theme.background} onChange={(v) => update((md) => { md.theme.background = v })} />
        {twoCol && (
          <>
            <ColorField label="Sidebar" value={m.theme.sidebar} onChange={(v) => update((md) => { md.theme.sidebar = v })} />
            <ColorField label="Sidebar text" value={m.theme.sidebarText} onChange={(v) => update((md) => { md.theme.sidebarText = v })} />
          </>
        )}
      </FieldGroup>

      <FieldGroup title="Typography">
        <FontSelect label="Body font" value={m.typography.fontFamily} onChange={(v) => update((md) => { md.typography.fontFamily = v })} />
        <FontSelect label="Heading font" value={m.typography.headingFamily} onChange={(v) => update((md) => { md.typography.headingFamily = v })} allowInherit />
        <FontSelect label="Name font" value={m.typography.nameFamily} onChange={(v) => update((md) => { md.typography.nameFamily = v })} allowInherit />
        <Slider label="Font size" value={m.typography.fontSize} min={8} max={14} step={0.25} unit="pt" onChange={(v) => update((md) => { md.typography.fontSize = v })} />
        <Slider label="Line height" value={m.typography.lineHeight} min={1} max={2} step={0.02} onChange={(v) => update((md) => { md.typography.lineHeight = v })} format={(v) => v.toFixed(2)} />
        <Slider label="Letter spacing" value={m.typography.letterSpacing} min={-0.02} max={0.1} step={0.005} onChange={(v) => update((md) => { md.typography.letterSpacing = v })} format={(v) => `${v.toFixed(3)}em`} />
        <Slider label="Name size" value={m.typography.headingScale} min={1} max={2.4} step={0.05} onChange={(v) => update((md) => { md.typography.headingScale = v })} format={(v) => `${v.toFixed(2)}×`} />
        <Toggle label="Uppercase headings" checked={m.typography.uppercaseHeadings} onChange={(v) => update((md) => { md.typography.uppercaseHeadings = v })} />
        <div>
          <label className="label">Bullet style</label>
          <div className="grid grid-cols-4 gap-1.5">
            {BULLET_OPTIONS.map(([val, glyph]) => (
              <button
                key={val}
                type="button"
                title={val[0].toUpperCase() + val.slice(1)}
                onClick={() => update((md) => { md.typography.bulletStyle = val })}
                className={cn(
                  'flex h-9 items-center justify-center rounded-md border text-base leading-none transition',
                  m.typography.bulletStyle === val
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/50'
                )}
              >
                {glyph}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Skill &amp; language level</label>
          <Segmented
            value={m.typography.proficiency}
            options={[
              { value: 'dots', label: 'Dots' },
              { value: 'bars', label: 'Bars' },
              { value: 'stars', label: 'Stars' },
              { value: 'text', label: 'Text' },
              { value: 'none', label: 'Off' },
            ]}
            onChange={(v) => update((md) => { md.typography.proficiency = v })}
          />
          <p className="-mt-1 text-[11px] text-muted-foreground">How the 0–5 rating on skills &amp; languages is shown.</p>
        </div>
      </FieldGroup>

      <FieldGroup title="Layout">
        <div>
          <label className="label">Columns</label>
          <Segmented
            value={String(m.layout.columns) as '1' | '2'}
            options={[
              { value: '1', label: 'Single' },
              { value: '2', label: 'Two column' },
            ]}
            onChange={(v) => update((md) => {
              md.layout.columns = v === '2' ? 2 : 1
              // seed a sidebar if switching to two-column with none.
              if (md.layout.columns === 2 && md.layout.aside.length === 0) {
                const move = ['skills', 'languages', 'interests'].filter((k) => md.layout.main.includes(k))
                md.layout.main = md.layout.main.filter((k) => !move.includes(k))
                md.layout.aside = move
              }
              if (md.layout.columns === 1) {
                md.layout.main = [...md.layout.main, ...md.layout.aside]
                md.layout.aside = []
              }
            })}
          />
        </div>
        {twoCol && (
          <>
            <div>
              <label className="label">Sidebar position</label>
              <Segmented
                value={m.layout.sidebar}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'right', label: 'Right' },
                ]}
                onChange={(v) => update((md) => { md.layout.sidebar = v })}
              />
            </div>
            <Slider label="Sidebar width" value={m.layout.sidebarWidth} min={0.24} max={0.44} step={0.01} onChange={(v) => update((md) => { md.layout.sidebarWidth = v })} format={(v) => `${Math.round(v * 100)}%`} />
          </>
        )}
        <Slider label="Section spacing" value={m.layout.sectionGap} min={4} max={30} step={1} unit="pt" onChange={(v) => update((md) => { md.layout.sectionGap = v })} />
        <Slider label="Item spacing" value={m.layout.itemGap} min={2} max={20} step={1} unit="pt" onChange={(v) => update((md) => { md.layout.itemGap = v })} />
        <Toggle label="Show contact icons" checked={m.layout.icons} onChange={(v) => update((md) => { md.layout.icons = v })} />
        <Toggle label="Show photo" checked={m.layout.showPhoto} onChange={(v) => update((md) => { md.layout.showPhoto = v })} />
        {m.layout.showPhoto && (
          <>
            <div>
              <label className="label">Photo shape</label>
              <Segmented
                value={m.layout.photoShape}
                options={[
                  { value: 'circle', label: 'Circle' },
                  { value: 'rounded', label: 'Rounded' },
                  { value: 'square', label: 'Square' },
                ]}
                onChange={(v) => update((md) => { md.layout.photoShape = v })}
              />
            </div>
            <div>
              <label className="label">Photo size</label>
              <Segmented
                value={m.layout.photoSize}
                options={[
                  { value: 's', label: 'Small' },
                  { value: 'm', label: 'Medium' },
                  { value: 'l', label: 'Large' },
                ]}
                onChange={(v) => update((md) => { md.layout.photoSize = v })}
              />
            </div>
          </>
        )}
      </FieldGroup>

      <FieldGroup title="Page">
        <div>
          <label className="label">Page size</label>
          <Segmented
            value={m.page.format}
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'Letter', label: 'US Letter' },
            ]}
            onChange={(v) => update((md) => { md.page.format = v })}
          />
        </div>
        <Slider label="Margins" value={m.page.margin} min={6} max={30} step={1} unit="mm" onChange={(v) => update((md) => { md.page.margin = v })} />
        <Toggle label="Fit to one page" checked={m.page.autoFit} onChange={(v) => update((md) => { md.page.autoFit = v })} />
        <p className="-mt-1 text-[11px] text-muted-foreground">Auto-shrinks type &amp; spacing so a near-full resume fits one page.</p>
      </FieldGroup>
    </div>
  )
}
