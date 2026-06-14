/**
 * Rasterize public/og.svg -> public/og.png (1200x630) for social link previews.
 * WhatsApp / iMessage / X / LinkedIn / Facebook don't render SVG og:images, so
 * we ship a PNG. Run after editing og.svg:  node scripts/make-og.cjs
 */
const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')

const root = path.join(__dirname, '..')
const svg = fs.readFileSync(path.join(root, 'public', 'og.svg'), 'utf8')

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  background: '#0b0d12',
  font: { loadSystemFonts: true },
  shapeRendering: 2, // geometricPrecision
  textRendering: 2, // geometricPrecision
})

const png = resvg.render().asPng()
const out = path.join(root, 'public', 'og.png')
fs.writeFileSync(out, png)
console.log(`wrote ${path.relative(root, out)} — ${(png.length / 1024).toFixed(1)} KB`)
