import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

// The 1200x630 link-preview card for a shared restoration: the before and
// after prints in photo corners on the oxblood album page. satori lays it out
// as SVG (plain flexbox and inline styles), and resvg turns that into a PNG.
// (@vercel/og wraps the same two libraries, but its Node build fails to load
// as an ES module.)

const localRequire = createRequire(import.meta.url);
let wasmPromise: Promise<void> | null = null;
const loadWasm = () => {
  wasmPromise ??= readFile(localRequire.resolve('@resvg/resvg-wasm/index_bg.wasm')).then(initWasm);
  return wasmPromise;
};

const C = {
  page: '#2b1517',
  bone: '#f0e5d7',
  bone2: '#c9b8ab',
  corner: '#e6d8c3',
  brass: '#e3a95e',
  rule: '#4a2a2c',
};

// Read once per cold start. vercel.json includes the folder in the function.
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700; style: 'normal' }[]> | null = null;
const loadFonts = () => {
  fontsPromise ??= Promise.all([
    readFile(new URL('./fonts/YoungSerif-Regular.ttf', import.meta.url)),
    readFile(new URL('./fonts/AtkinsonHyperlegible-Regular.ttf', import.meta.url)),
    readFile(new URL('./fonts/AtkinsonHyperlegible-Bold.ttf', import.meta.url)),
  ]).then(([serif, regular, bold]) => [
    { name: 'Young Serif', data: serif, weight: 400, style: 'normal' },
    { name: 'Atkinson', data: regular, weight: 400, style: 'normal' },
    { name: 'Atkinson', data: bold, weight: 700, style: 'normal' },
  ]);
  return fontsPromise;
};

type Style = Record<string, string | number>;
type Node = { type: string; props: Record<string, unknown> } | string;

// A tiny createElement, so this file needs no JSX setup. satori counts an
// empty children array as several children, so leaf nodes get none at all.
const h = (type: string, style: Style, ...children: Node[]): Node => ({
  type,
  props: children.length === 0 ? { style } : { style, children: children.length === 1 ? children[0] : children },
});

const corner = (angle: number, pos: Style, size: number): Node =>
  h('div', {
    position: 'absolute',
    width: size,
    height: size,
    backgroundImage: `linear-gradient(${angle}deg, ${C.corner} 50%, transparent 50%)`,
    ...pos,
  });

// A print of a given size, held in four photo corners, with a caption under it.
const print = (src: string, w: number, ht: number, label: string): Node => {
  const s = Math.round(w * 0.085);
  const o = -Math.round(s * 0.25);
  return h('div', { display: 'flex', flexDirection: 'column', gap: 14 },
    h('div', { display: 'flex', position: 'relative', width: w, height: ht },
      { type: 'img', props: { src, width: w, height: ht, style: { width: w, height: ht, objectFit: 'cover' } } },
      corner(135, { top: o, left: o }, s),
      corner(225, { top: o, right: o }, s),
      corner(45, { bottom: o, left: o }, s),
      corner(315, { bottom: o, right: o }, s),
    ),
    h('div', { display: 'flex', fontSize: 22, fontWeight: 700, color: C.bone }, label),
  );
};

/** before/after are data URIs (PNG or JPEG). before may be null if it can't be drawn. */
export async function renderShareCard(after: string, before: string | null): Promise<Buffer> {
  const prints = before
    ? h('div', { display: 'flex', alignItems: 'flex-end', gap: 32 },
        print(before, 224, 280, 'Before'),
        print(after, 292, 365, 'After'))
    : h('div', { display: 'flex' }, print(after, 340, 425, 'Restored'));

  const card = h('div', {
    display: 'flex',
    width: 1200,
    height: 630,
    padding: '64px 76px',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.page,
    color: C.bone,
    fontFamily: 'Atkinson',
  },
    h('div', { display: 'flex', flexDirection: 'column', width: 470, gap: 24 },
      h('div', { display: 'flex', fontFamily: 'Young Serif', fontSize: 32 },
        'NanoRewind ', h('span', { color: C.brass, marginLeft: 9 }, '4K')),
      h('div', { display: 'flex', width: 64, height: 2, backgroundColor: C.rule }),
      h('div', { display: 'flex', fontFamily: 'Young Serif', fontSize: 62, lineHeight: 1.04 }, 'A restored photograph'),
      h('div', { display: 'flex', fontSize: 26, lineHeight: 1.4, color: C.bone2 }, 'Open the link to compare it with the original.'),
    ),
    prints,
  );

  const [fonts] = await Promise.all([loadFonts(), loadWasm()]);
  const svg = await satori(card as never, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return Buffer.from(png);
}
