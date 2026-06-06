const fs = require('fs');
const path = require('path');

const variant = process.argv[2];

if (!['host', 'reception'].includes(variant)) {
  console.error('Usage: node scripts/sync-tauri-config.cjs <host|reception>');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, `src-tauri-${variant}`);
const target = path.join(root, 'src-tauri');

if (!fs.existsSync(source)) {
  console.error(`Tauri source directory not found: ${source}`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(source, target, { recursive: true });

console.log(`Synced ${path.relative(root, source)} -> ${path.relative(root, target)}`);
