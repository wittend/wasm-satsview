import { execFileSync } from 'node:child_process';
const base=process.argv[2];
if (!base) throw new Error('Usage: node scripts/check-docs.mjs BASE_REF');
const files=execFileSync('git',['diff','--name-only',`${base}...HEAD`],{encoding:'utf8'}).trim().split('\n');
if(files.some(f=>/^(src|web|demo)\//.test(f))) {
  if(!files.includes('CHANGES.md') || !files.some(f=>f.startsWith('docs/'))) {
    console.error('Runtime changes require docs/ updates and a CHANGES.md entry.');process.exit(1);
  }
}
console.log('Documentation change policy passed.');
