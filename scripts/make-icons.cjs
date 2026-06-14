/**
 * Rasterize public/icon.svg -> public/icon-192.png and icon-512.png. Chrome
 * requires concrete 192px + 512px PNG icons in the web app manifest before it
 * will offer "Install app" (an SVG with sizes:"any" isn't enough). Run after
 * editing icon.svg:  node scripts/make-icons.cjs
 */
const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')

const root = path.join(__dirname, '..')
const svg = fs.readFileSync(path.join(root, 'public', 'icon.svg'), 'utf8')

for (const size of [192, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  fs.writeFileSync(path.join(root, 'public', `icon-${size}.png`), png)
  console.log(`wrote public/icon-${size}.png — ${(png.length / 1024).toFixed(1)} KB`)
}
