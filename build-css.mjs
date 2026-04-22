import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const katexCssPath = new URL('node_modules/katex/dist/katex.min.css', import.meta.url);
const stylesPath = new URL('styles.css', import.meta.url);

if (!existsSync(katexCssPath)) {
	console.error('katex.min.css not found. Run npm install first.');
	process.exit(1);
}

const katexCss = readFileSync(katexCssPath, 'utf-8');
let existing = '';
try { existing = readFileSync(stylesPath, 'utf-8'); } catch { /* empty */ }

const MARKER_START = '/* === KATEX STYLES === */';
const MARKER_END = '/* === END KATEX STYLES === */';

let pluginStyles = existing;
const startIdx = existing.indexOf(MARKER_START);
if (startIdx !== -1) {
	pluginStyles = existing.slice(0, startIdx).trimEnd();
}

const combined = `${pluginStyles}\n\n${MARKER_START}\n${katexCss}\n${MARKER_END}`;
writeFileSync(stylesPath, combined);
console.log('Updated styles.css with inlined KaTeX CSS');
