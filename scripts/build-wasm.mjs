import { execFileSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';
execFileSync('cargo', ['build', '--locked', '--release', '--target', 'wasm32-unknown-unknown'], { stdio: 'inherit' });
mkdirSync('dist', { recursive: true });
copyFileSync('target/wasm32-unknown-unknown/release/wasm_satsview.wasm', 'dist/wasm_satsview.wasm');
