import type { ResumeDocument } from '@/types/document'
import { useResumeStore } from '@/store/useResumeStore'
import { cn, DATE_LANGUAGE_OPTIONS } from '@/lib/utils'
import { Slider, Toggle, Segmented, Select, ColorField, FieldGroup } from '../fields/Controls'
import { TextField } from '../fields/Inputs'
import { FontSelect } from '../fields/FontSelect'
import { HEADER_STYLES, HeaderMini } from '@/templates/_shared/headerStyles'
import { DESIGN_RANGES } from '@/lib/designRanges'
import { OFFERED_WEIGHTS } from '@/lib/typeStyle'
import type { ElementColorKey } from '@/lib/elementColors'
import { getTemplate } from '@/templates/registry'

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

/** Button labels for the named weights the panel offers. */
const WEIGHT_LABELS = { bold: 'Bold', regular: 'Regular', light: 'Light' } as const

/** The five element colours, each with the theme colour the base stylesheet
 *  derives it from while it is unset (a template may derive differently). */
const ELEMENT_COLOR_ROWS: { key: ElementColorKey; label: string; from: 'primary' | 'text' | 'muted' }[] = [
  { key: 'name', label: 'Name', from: 'text' },
  { key: 'headline', label: 'Headline', from: 'primary' },
  { key: 'headings', label: 'Section titles', from: 'primary' },
  { key: 'contacts', label: 'Contacts', from: 'muted' },
  { key: 'links', label: 'Links', from: 'text' },
]

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
              onClick={() =>
                update((md) => {
                  md.theme.primary = p.color
                })
              }
              className="h-8 w-full rounded-md border border-border transition-transform hover:scale-110"
              style={{
                background: p.color,
                outline: m.theme.primary === p.color ? '2px solid hsl(var(--ring))' : undefined,
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
        <ColorField
          label="Primary"
          value={m.theme.primary}
          onChange={(v) =>
            update((md) => {
              md.theme.primary = v
            })
          }
        />
        <ColorField
          label="Body text"
          value={m.theme.text}
          onChange={(v) =>
            update((md) => {
              md.theme.text = v
            })
          }
        />
        <ColorField
          label="Muted text"
          value={m.theme.muted}
          onChange={(v) =>
            update((md) => {
              md.theme.muted = v
            })
          }
        />
        <ColorField
          label="Background"
          value={m.theme.background}
          onChange={(v) =>
            update((md) => {
              md.theme.background = v
            })
          }
        />
        {twoCol && (
          <>
            <ColorField
              label="Sidebar"
              value={m.theme.sidebar}
              onChange={(v) =>
                update((md) => {
                  md.theme.sidebar = v
                })
              }
            />
            <ColorField
              label="Sidebar text"
              value={m.theme.sidebarText}
              onChange={(v) =>
                update((md) => {
                  md.theme.sidebarText = v
                })
              }
            />
          </>
        )}
      </FieldGroup>

      <FieldGroup title="Element colors">
        {ELEMENT_COLOR_ROWS.map((r) => (
          <ColorField
            key={r.key}
            label={r.label}
            value={m.theme[r.key]}
            fallback={m.theme[r.from]}
            onChange={(v) =>
              update((md) => {
                // An emptied box is Auto again, not a colour of nothing.
                if (v) md.theme[r.key] = v
                else delete md.theme[r.key]
              })
            }
            onClear={() =>
              update((md) => {
                delete md.theme[r.key]
              })
            }
          />
        ))}
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Auto follows the template. A sidebar keeps its own text colour; a linked title keeps the title&apos;s.
        </p>
      </FieldGroup>

      <FieldGroup title="Typography">
        <FontSelect
          label="Body font"
          value={m.typography.fontFamily}
          onChange={(v) =>
            update((md) => {
              md.typography.fontFamily = v
            })
          }
        />
        <FontSelect
          label="Heading font"
          value={m.typography.headingFamily}
          onChange={(v) =>
            update((md) => {
              md.typography.headingFamily = v
            })
          }
          allowInherit
        />
        <FontSelect
          label="Name font"
          value={m.typography.nameFamily}
          onChange={(v) =>
            update((md) => {
              md.typography.nameFamily = v
            })
          }
          allowInherit
        />
        <Slider
          label="Font size"
          value={m.typography.fontSize}
          {...DESIGN_RANGES.fontSize}
          unit="pt"
          onChange={(v) =>
            update((md) => {
              md.typography.fontSize = v
            })
          }
        />
        <Slider
          label="Line height"
          value={m.typography.lineHeight}
          {...DESIGN_RANGES.lineHeight}
          onChange={(v) =>
            update((md) => {
              md.typography.lineHeight = v
            })
          }
          format={(v) => v.toFixed(2)}
        />
        <Slider
          label="Letter spacing"
          value={m.typography.letterSpacing}
          {...DESIGN_RANGES.letterSpacing}
          onChange={(v) =>
            update((md) => {
              md.typography.letterSpacing = v
            })
          }
          format={(v) => `${v.toFixed(3)}em`}
        />
        <Slider
          label="Name size"
          value={m.typography.headingScale}
          {...DESIGN_RANGES.headingScale}
          onChange={(v) =>
            update((md) => {
              md.typography.headingScale = v
            })
          }
          format={(v) => `${v.toFixed(2)}×`}
        />
        <Slider
          label="Section title size"
          value={m.typography.sectionTitleScale}
          {...DESIGN_RANGES.sectionTitleScale}
          onChange={(v) =>
            update((md) => {
              md.typography.sectionTitleScale = v
            })
          }
          format={(v) => `${v.toFixed(2)}×`}
        />
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Headline size"
              value={m.typography.headlineScale}
              {...DESIGN_RANGES.headlineScale}
              onChange={(v) =>
                update((md) => {
                  md.typography.headlineScale = v
                })
              }
              format={(v) => `${v.toFixed(2)}×`}
            />
            <Slider
              label="Contact size"
              value={m.typography.contactScale}
              {...DESIGN_RANGES.contactScale}
              onChange={(v) =>
                update((md) => {
                  md.typography.contactScale = v
                })
              }
              format={(v) => `${v.toFixed(2)}×`}
            />
          </div>
          <p className="-mt-1 text-[11px] text-muted-foreground">Each as a multiple of the body size.</p>
        </div>
        <div>
          <label className="label">Heading case</label>
          <Segmented
            value={m.typography.headingCase ?? 'auto'}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'upper', label: 'Upper' },
              { value: 'smallcaps', label: 'Small caps' },
              { value: 'none', label: 'As typed' },
            ]}
            onChange={(v) =>
              update((md) => {
                // Auto hands the case back to the template: no explicit
                // choice, and the legacy flag on the template's own default.
                if (v === 'auto') {
                  delete md.typography.headingCase
                  md.typography.uppercaseHeadings = getTemplate(md.template).defaults.typography.uppercaseHeadings
                } else {
                  md.typography.headingCase = v
                  md.typography.uppercaseHeadings = v === 'upper'
                }
              })
            }
          />
          <p className="-mt-1 text-[11px] text-muted-foreground">Auto follows the template.</p>
        </div>
        <div>
          <label className="label">Name weight</label>
          <Segmented
            value={m.typography.nameWeight ?? 'auto'}
            options={[
              { value: 'auto', label: 'Auto' },
              // Only weights a bundled face can draw; see OFFERED_WEIGHTS.
              ...OFFERED_WEIGHTS.map((w) => ({ value: w, label: WEIGHT_LABELS[w] })),
            ]}
            onChange={(v) =>
              update((md) => {
                if (v === 'auto') delete md.typography.nameWeight
                else md.typography.nameWeight = v
              })
            }
          />
        </div>
        <div>
          <label className="label">Heading weight</label>
          <Segmented
            value={m.typography.headingWeight ?? 'auto'}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: 'bold', label: 'Bold' },
              { value: 'regular', label: 'Regular' },
            ]}
            onChange={(v) =>
              update((md) => {
                if (v === 'auto') delete md.typography.headingWeight
                else md.typography.headingWeight = v
              })
            }
          />
          <p className="-mt-1 text-[11px] text-muted-foreground">Auto keeps the template's own weights.</p>
        </div>
        <Slider
          label="Heading spacing"
          value={m.typography.headingGap}
          {...DESIGN_RANGES.headingGap}
          onChange={(v) =>
            update((md) => {
              md.typography.headingGap = v
            })
          }
          format={(v) => `${v.toFixed(2)}×`}
        />
        <div>
          <label className="label">Heading rule</label>
          <Segmented
            value={m.typography.headingRuleWidth ? String(m.typography.headingRuleWidth) : 'auto'}
            options={[
              { value: 'auto', label: 'Auto' },
              { value: '1', label: 'Thin' },
              { value: '2', label: 'Thick' },
            ]}
            onChange={(v) =>
              update((md) => {
                if (v === 'auto') delete md.typography.headingRuleWidth
                else md.typography.headingRuleWidth = v === '2' ? 2 : 1
              })
            }
          />
          <p className="-mt-1 text-[11px] text-muted-foreground">
            The air under a section title, and the weight of its rule. Auto keeps the template's rule.
          </p>
        </div>
        <div>
          <label className="label">Bullet style</label>
          <div className="grid grid-cols-4 gap-1.5">
            {BULLET_OPTIONS.map(([val, glyph]) => (
              <button
                key={val}
                type="button"
                title={val[0].toUpperCase() + val.slice(1)}
                onClick={() =>
                  update((md) => {
                    md.typography.bulletStyle = val
                  })
                }
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
          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="Bullet indent"
              value={m.typography.bulletIndent}
              {...DESIGN_RANGES.bulletIndent}
              onChange={(v) =>
                update((md) => {
                  md.typography.bulletIndent = v
                })
              }
              format={(v) => `${v.toFixed(2)}em`}
            />
            <Slider
              label="Bullet spacing"
              value={m.typography.bulletGap}
              {...DESIGN_RANGES.bulletGap}
              onChange={(v) =>
                update((md) => {
                  md.typography.bulletGap = v
                })
              }
              format={(v) => `${v.toFixed(2)}em`}
            />
          </div>
          <p className="-mt-1 text-[11px] text-muted-foreground">
            How far bullets sit in, and the air between them.
          </p>
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
            onChange={(v) =>
              update((md) => {
                md.typography.proficiency = v
              })
            }
          />
          <p className="-mt-1 text-[11px] text-muted-foreground">
            How the 0–5 rating on skills &amp; languages is shown.
          </p>
        </div>
      </FieldGroup>

      <FieldGroup title="Dates">
        <div>
          <label className="label">Month</label>
          <Segmented
            value={m.dates?.month ?? 'short'}
            options={[
              { value: 'short', label: 'Jan' },
              { value: 'long', label: 'January' },
              { value: 'numeric', label: '01' },
              { value: 'none', label: 'Year' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.dates.month = v
              })
            }
          />
          <p className="-mt-0 text-[11px] text-muted-foreground">
            How every date reads — on the page, in the PDF, in the Word file and in the ATS text.
          </p>
        </div>
        <div>
          <label className="label">Between dates</label>
          <Segmented
            value={m.dates?.separator ?? 'emdash'}
            options={[
              { value: 'emdash', label: '—' },
              { value: 'endash', label: '–' },
              { value: 'hyphen', label: '-' },
              { value: 'to', label: 'to' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.dates.separator = v
              })
            }
          />
        </div>
        <TextField
          label="Word for current roles"
          value={m.dates?.present ?? 'Present'}
          placeholder="Present"
          hint="Ends an open range: Present, Current, Now, or a word in your language."
          onChange={(v) =>
            update((md) => {
              md.dates.present = v
            })
          }
        />
        <Select
          label="Language"
          value={m.dates?.language ?? 'en'}
          options={DATE_LANGUAGE_OPTIONS}
          onChange={(v) =>
            update((md) => {
              md.dates.language = v
            })
          }
        />
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Month names and time-span words; the PDF declares this language too.
        </p>
      </FieldGroup>

      <FieldGroup title="Layout">
        <div>
          <label className="label">Header layout</label>
          <div className="flex flex-wrap gap-1.5">
            {HEADER_STYLES.map((h) => {
              const on = (m.layout.headerStyle ?? '') === h.value
              return (
                <button
                  key={h.value || 'auto'}
                  type="button"
                  title={h.label}
                  onClick={() =>
                    update((md) => {
                      md.layout.headerStyle = (h.value || undefined) as typeof md.layout.headerStyle
                    })
                  }
                  className={`flex w-[64px] flex-col items-center gap-1 rounded-lg border p-1.5 transition ${on ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface hover:border-primary/50'}`}
                >
                  <span className="flex h-8 w-full items-center justify-center overflow-hidden rounded-[3px] border border-border/70 bg-white p-1">
                    <HeaderMini kind={h.value} />
                  </span>
                  <span
                    className={`text-[9px] font-medium leading-none ${on ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {h.label}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="-mt-0 text-[11px] text-muted-foreground">
            How your name &amp; contacts compose — on top of any template.
          </p>
        </div>
        <div>
          <label className="label">Columns</label>
          <Segmented
            value={String(m.layout.columns) as '1' | '2'}
            options={[
              { value: '1', label: 'Single' },
              { value: '2', label: 'Two column' },
            ]}
            onChange={(v) =>
              update((md) => {
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
              })
            }
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
                onChange={(v) =>
                  update((md) => {
                    md.layout.sidebar = v
                  })
                }
              />
            </div>
            <Slider
              label="Sidebar width"
              value={Math.round(m.layout.sidebarWidth * 100)}
              min={Math.round(DESIGN_RANGES.sidebarWidth.min * 100)}
              max={Math.round(DESIGN_RANGES.sidebarWidth.max * 100)}
              step={1}
              unit="%"
              onChange={(v) =>
                update((md) => {
                  md.layout.sidebarWidth = v / 100
                })
              }
            />
          </>
        )}
        <Slider
          label="Section spacing"
          value={m.layout.sectionGap}
          {...DESIGN_RANGES.sectionGap}
          unit="pt"
          onChange={(v) =>
            update((md) => {
              md.layout.sectionGap = v
            })
          }
        />
        <Slider
          label="Item spacing"
          value={m.layout.itemGap}
          {...DESIGN_RANGES.itemGap}
          unit="pt"
          onChange={(v) =>
            update((md) => {
              md.layout.itemGap = v
            })
          }
        />
        <Toggle
          label="Show contact icons"
          checked={m.layout.icons}
          onChange={(v) =>
            update((md) => {
              md.layout.icons = v
            })
          }
        />
        <div>
          <label className="label">Between contacts</label>
          <Segmented
            value={m.layout.contactSeparator ?? 'none'}
            options={[
              { value: 'none', label: 'Space' },
              { value: 'dot', label: '·' },
              { value: 'pipe', label: '|' },
              { value: 'slash', label: '/' },
              { value: 'dash', label: '–' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.layout.contactSeparator = v
              })
            }
          />
          <p className="-mt-0 text-[11px] text-muted-foreground">
            What sits between inline contacts — on the page, in the PDF and in the Word file.
          </p>
        </div>
        <div>
          <label className="label">Section icons</label>
          <Segmented
            wrap
            value={m.layout.sectionIconStyle ?? 'folio'}
            options={[
              { value: 'folio', label: 'Folio' },
              { value: 'chip', label: 'Chip' },
              { value: 'plain', label: 'Plain' },
              { value: 'filled', label: 'Filled' },
              { value: 'circle', label: 'Circle' },
              { value: 'outline', label: 'Outline' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.layout.sectionIconStyle = v
              })
            }
          />
        </div>
        <div>
          <label className="label">Icon size</label>
          <Segmented
            value={m.layout.sectionIconSize ?? 'm'}
            options={[
              { value: 's', label: 'S' },
              { value: 'm', label: 'M' },
              { value: 'l', label: 'L' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.layout.sectionIconSize = v
              })
            }
          />
        </div>
        <Toggle
          label="Show photo"
          checked={m.layout.showPhoto}
          onChange={(v) =>
            update((md) => {
              md.layout.showPhoto = v
            })
          }
        />
        {(m.layout.showPhoto || m.layout.monogram) && (
          <>
            <div>
              <label className="label">Photo shape</label>
              <Segmented
                value={m.layout.photoShape}
                options={[
                  { value: 'circle', label: 'Circle' },
                  { value: 'rounded', label: 'Rounded' },
                  { value: 'square', label: 'Square' },
                  { value: 'diamond', label: 'Diamond' },
                ]}
                onChange={(v) =>
                  update((md) => {
                    md.layout.photoShape = v
                  })
                }
              />
              <p className="-mt-0 text-[11px] text-muted-foreground">
                Shape of the photo or monogram badge. Diamond turns the badge; a photo keeps square corners.
              </p>
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
                onChange={(v) =>
                  update((md) => {
                    md.layout.photoSize = v
                  })
                }
              />
            </div>
            <div>
              <label className="label">Photo position</label>
              <Segmented
                value={m.layout.photoAlign}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
                onChange={(v) =>
                  update((md) => {
                    md.layout.photoAlign = v
                  })
                }
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
            onChange={(v) =>
              update((md) => {
                md.page.format = v
              })
            }
          />
        </div>
        <Slider
          label="Margins"
          value={m.page.margin}
          {...DESIGN_RANGES.margin}
          unit="mm"
          onChange={(v) =>
            update((md) => {
              md.page.margin = v
            })
          }
        />
        <Toggle
          label="Fit to one page"
          checked={m.page.autoFit}
          onChange={(v) =>
            update((md) => {
              md.page.autoFit = v
            })
          }
        />
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Auto-shrinks type &amp; spacing so a near-full resume fits one page.
        </p>
        <Toggle
          label="Keep entries whole"
          checked={m.page.keepEntriesWhole}
          onChange={(v) =>
            update((md) => {
              md.page.keepEntriesWhole = v
            })
          }
        />
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Moves a whole entry to the next page instead of breaking one across it; any section can decide for itself in
          its Style sheet.
        </p>
      </FieldGroup>

      <FieldGroup title="Links">
        <div>
          <label className="label">Link style</label>
          <Segmented
            value={m.links?.style ?? 'tag'}
            options={[
              { value: 'tag', label: 'Tag' },
              { value: 'plain', label: 'Plain' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.links.style = v
              })
            }
          />
        </div>
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Tag sets named links (a project&apos;s Portfolio, a credential&apos;s Verify) in a small paper tag; Plain
          prints the bare word. Contact links are never tagged.
        </p>
        <div>
          <label className="label">Show URLs as</label>
          <Segmented
            value={m.links?.display ?? 'pretty'}
            options={[
              { value: 'pretty', label: 'Tidy' },
              { value: 'full', label: 'Full' },
              { value: 'short', label: 'Short' },
            ]}
            onChange={(v) =>
              update((md) => {
                md.links.display = v
              })
            }
          />
        </div>
        <p className="-mt-1 text-[11px] text-muted-foreground">
          Tidy drops https://, Full shows the address exactly as entered, Short keeps just the handle. How a link
          reads is separate from whether it is clickable - the toggle below decides that.
        </p>
        <Toggle
          label="Clickable links (PDF and Word)"
          checked={m.links?.clickable !== false}
          onChange={(v) =>
            update((md) => {
              md.links.clickable = v
            })
          }
        />
        <Toggle
          label="Underline links"
          checked={m.links?.underline ?? false}
          onChange={(v) =>
            update((md) => {
              md.links.underline = v
            })
          }
        />
      </FieldGroup>
    </div>
  )
}
