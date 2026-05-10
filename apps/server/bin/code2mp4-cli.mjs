#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const distCli = path.join(serverDir, 'dist', 'code2mp4-cli.js');
const srcCli = path.join(serverDir, 'src', 'code2mp4-cli.ts');

const args = process.argv.slice(2);
const command = existsSync(distCli)
  ? ['node', distCli, ...args]
  : ['npx', 'tsx', srcCli, ...args];

const result = spawnSync(command[0], command.slice(1), {
  cwd: path.resolve(serverDir, '..', '..'),
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
