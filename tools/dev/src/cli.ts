#!/usr/bin/env node
/**
 * ov-dev — Open Video development lifecycle CLI.
 *
 * Usage:
 *   ov-dev start          Start server
 *   ov-dev status         Check server health
 *   ov-dev stop           Stop the server (via SIGTERM to process on port)
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const SERVER_PORT = process.env.OV_SERVER_PORT ?? '7456';
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const SERVER_ENTRY = path.join(PROJECT_ROOT, 'apps', 'server', 'src', 'server.ts');

const cmd = process.argv[2];

async function main() {
  if (!cmd || cmd === 'help') {
    console.log('Open Video Dev Tools');
    console.log('  ov-dev start     Start the server');
    console.log('  ov-dev status    Check server health');
    console.log('  ov-dev stop      Stop the server');
    console.log('  ov-dev build     Build all packages');
    console.log('  ov-dev typecheck Typecheck all packages');
    process.exit(0);
  }

  if (cmd === 'status') {
    await checkStatus();
  } else if (cmd === 'start') {
    await startServer();
  } else if (cmd === 'stop') {
    await stopServer();
  } else if (cmd === 'build') {
    execSync('pnpm build', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  } else if (cmd === 'typecheck') {
    execSync('pnpm typecheck', { cwd: PROJECT_ROOT, stdio: 'inherit' });
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

async function checkStatus() {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`);
    const body = await res.json();
    console.log(`Server: ${body.status || 'ok'}`);
    console.log(`  Port: ${SERVER_PORT}`);
    console.log(`  Agents: ${body.detectedAgents ?? '?'}`);
    console.log(`  Projects: ${body.dbProjects ?? '?'}`);
    console.log(`  HF: ${body.system?.hyperframes ?? '?'}`);

    // Also check agents
    try {
      const agents = await fetch(`${SERVER_URL}/api/agents`).then(r => r.json());
      const detected = agents.agents?.filter((a: {detected: boolean}) => a.detected) ?? [];
      console.log('  Detected:', detected.map((a: {name: string}) => a.name).join(', ') || 'none');
    } catch {}
  } catch {
    console.log('Server: not running');
    process.exit(1);
  }
}

async function startServer() {
  console.log(`Starting server on port ${SERVER_PORT}...`);

  // Check if already running
  try {
    await fetch(`${SERVER_URL}/api/health`);
    console.log('Server is already running.');
    process.exit(0);
  } catch {
    // Not running — proceed
  }

  // Use tsx to run the server directly
  const { spawn } = await import('node:child_process');
  const child = spawn('npx', ['tsx', SERVER_ENTRY], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: { ...process.env, OV_SERVER_PORT: SERVER_PORT },
  });

  child.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  // Wait briefly then check
  await new Promise(r => setTimeout(r, 2000));
  try {
    await fetch(`${SERVER_URL}/api/health`);
    console.log('Server started successfully.');
  } catch {
    console.log('Server starting (may take a moment)...');
  }
}

async function stopServer() {
  try {
    const { execSync } = await import('node:child_process');
    const stdout = execSync(`lsof -ti:${SERVER_PORT}`, { encoding: 'utf8' });
    const pid = stdout.trim();
    if (pid) {
      process.kill(parseInt(pid, 10), 'SIGTERM');
      console.log(`Stopped server (PID ${pid})`);
    } else {
      console.log('No server process found.');
    }
  } catch {
    console.log('No server process found on port', SERVER_PORT);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
