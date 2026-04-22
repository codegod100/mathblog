import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const katexCssPath = new URL('node_modules/katex/dist/katex.min.css', import.meta.url);
const fontsDir = new URL('node_modules/katex/dist/fonts/', import.meta.url);
const stylesPath = new URL('styles.css', import.meta.url);

if (!existsSync(katexCssPath)) {
	console.error('katex.min.css not found. Run npm install first.');
	process.exit(1);
}

let katexCss = readFileSync(katexCssPath, 'utf-8');

// Strip fallback font formats (woff, ttf) since modern Electron supports woff2
katexCss = katexCss.replace(/,url\(fonts\/[^)]+\.woff\)\s*format\("woff"\)/g, '');
katexCss = katexCss.replace(/,url\(fonts\/[^)]+\.ttf\)\s*format\("truetype"\)/g, '');

// Collect unique woff2 filenames
const filenames = new Set();
katexCss.replace(/url\(fonts\/([^)]+\.woff2)\)\s*format\("woff2"\)/g, (_m, filename) => {
	filenames.add(filename);
	return '';
});

// Replace each font reference with an inlined base64 data URI
for (const filename of filenames) {
	const fontPath = new URL(filename, fontsDir);
	if (!existsSync(fontPath)) {
		console.warn(`Font not found: ${filename}`);
		continue;
	}

	const data = readFileSync(fontPath);
	const b64 = data.toString('base64');
	const dataUri = `url(data:font/woff2;base64,${b64}) format("woff2")`;

	const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	katexCss = katexCss.replace(
		new RegExp(`url\\(fonts/${escapedFilename}\\)\\s*format\\("woff2"\\)`, 'g'),
		dataUri
	);
}

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
console.log(`Updated styles.css with fully self-contained KaTeX CSS + ${filenames.size} inlined fonts`);
