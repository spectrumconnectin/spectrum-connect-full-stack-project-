/**
 * Stitches the kit's stylesheet.
 *
 * Everything is local by design: the render harness (and possibly the design
 * runtime) has no network, so a CDN @import means invisible icons and a
 * fallback typeface in every design built from this kit.
 *
 *   dist/styles.css = Inter @font-face + Font Awesome + compiled Tailwind
 *   dist/fonts/     = the woff2s both halves reference
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;
const dist = path.join(root, 'dist');
fs.mkdirSync(path.join(dist, 'fonts'), { recursive: true });

// Tailwind first — it owns the utility layer the components are written in.
const tw = path.join(dist, '.tailwind.css');
execFileSync('npx', ['tailwindcss', '-c', 'tailwind.config.js', '-i', './src/styles.css', '-o', tw, '--minify'],
  { cwd: root, stdio: 'inherit' });

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
fs.writeFileSync(
  path.join(dist, 'styles.css'),
  [read('assets/inter.css'), read('assets/fa.min.css'), fs.readFileSync(tw, 'utf8')].join('\n'),
);
fs.rmSync(tw);

for (const f of fs.readdirSync(path.join(root, 'assets/fonts'))) {
  fs.copyFileSync(path.join(root, 'assets/fonts', f), path.join(dist, 'fonts', f));
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
console.log(`styles.css ${kb(fs.statSync(path.join(dist, 'styles.css')).size)} · ` +
            `${fs.readdirSync(path.join(dist, 'fonts')).length} font files`);
