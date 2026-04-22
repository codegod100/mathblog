import { readFileSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';

const stylesPath = new URL('styles.css', import.meta.url);

if (!existsSync(stylesPath)) {
	writeFileSync(stylesPath, '.mathblog-preview { padding: 16px; overflow: auto; }\n');
}

console.log('styles.css is ready');
