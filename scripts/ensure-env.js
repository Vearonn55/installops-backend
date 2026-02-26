#!/usr/bin/env node
/**
 * Ensure .env has required vars. Prompt for DB_PASS and SESSION_SECRET if missing.
 * Writes/updates .env in backend root. Run from backend/.
 */
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function question(prompt, opts = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const def = opts.default !== undefined ? String(opts.default) : '';
  const p = def ? `${prompt} [${opts.sensitive ? '***' : def}]: ` : `${prompt}: `;
  return new Promise((resolve) => {
    rl.question(p, (answer) => {
      rl.close();
      resolve((answer || def).trim());
    });
  });
}

async function main() {
  if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
  }
  if (!fs.existsSync(envPath)) {
    console.error('.env not found and no .env.example to copy.');
    process.exit(1);
  }

  let content = fs.readFileSync(envPath, 'utf8');
  const needDbPass = /^DB_PASS=\s*$/m.test(content) || !/^DB_PASS=/m.test(content);
  const needSecret =
    /^SESSION_SECRET=\s*$/m.test(content) || !/^SESSION_SECRET=/m.test(content);

  if (needDbPass || needSecret) {
    console.log('Set required environment values (used for .env):\n');
    if (needDbPass) {
      const dbPass = await question('Database password (DB_PASS)', { sensitive: true });
      content = content.replace(/^DB_PASS=.*/m, `DB_PASS=${dbPass}`);
    }
    if (needSecret) {
      const secret = await question('Session secret, min 16 chars (SESSION_SECRET)', { sensitive: true });
      if (secret.length < 16) {
        console.error('SESSION_SECRET must be at least 16 characters.');
        process.exit(1);
      }
      content = content.replace(/^SESSION_SECRET=.*/m, `SESSION_SECRET=${secret}`);
    }
    fs.writeFileSync(envPath, content);
    console.log('Wrote .env.\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
