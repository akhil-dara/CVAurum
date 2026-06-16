/**
 * Rasterize the app icons. Run after editing icon.svg / favicon.svg:
 *   node scripts/make-icons.cjs
 *
 * - public/icon.svg    -> icon-192.png, icon-512.png  (PWA manifest; Chrome
 *                         needs concrete PNGs before it offers "Install app")
 * - public/favicon.svg -> favicon-16/32/48.png + favicon.ico  (Google shows the
 *                         favicon in search results; a multi-size .ico at the
 *                         site root is the most reliably picked-up format —
 *                         SVG-only often isn't crawled for new sites)
 */
const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')

const root = path.join(__dirname, '..')
const pub = (f) => path.join(root, 'public', f)
const render = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()

// PWA manifest icons
const iconSvg = fs.readFileSync(pub('icon.svg'), 'utf8')
for (const size of [192, 512]) {
  const png = render(iconSvg, size)
  fs.writeFileSync(pub(`icon-${size}.png`), png)
  console.log(`wrote public/icon-${size}.png — ${(png.length / 1024).toFixed(1)} KB`)
}

// Favicons (browser tab + Google search result)
const faviconSvg = fs.readFileSync(pub('favicon.svg'), 'utf8')
const faviconPngs = [16, 32, 48, 96].map((size) => {
  const png = render(faviconSvg, size)
  fs.writeFileSync(pub(`favicon-${size}.png`), png)
  console.log(`wrote public/favicon-${size}.png — ${png.length} B`)
  return { size, png }
})

/** Pack PNG buffers into a single multi-size .ico (PNG-encoded entries). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + images.length * 16
  const entries = []
  for (const { size, png } of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0) // width (0 = 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2) // palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // color planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(png.length, 8) // image size
    e.writeUInt32LE(offset, 12) // image offset
    offset += png.length
    entries.push(e)
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

const ico = buildIco(faviconPngs)
fs.writeFileSync(pub('favicon.ico'), ico)
console.log(`wrote public/favicon.ico — ${(ico.length / 1024).toFixed(1)} KB (${faviconPngs.map((p) => p.size).join('/')})`)
