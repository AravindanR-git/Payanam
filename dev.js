import { spawn } from 'node:child_process';
import process from 'node:process';

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';

const vite = spawn(cmd, ['vite'], { stdio: 'inherit', shell: true });
const server = spawn('node', ['server/index.js'], { stdio: 'inherit', shell: true });

function exit(code = 0) {
  vite.kill('SIGTERM');
  server.kill('SIGTERM');
  process.exit(code);
}

process.on('SIGINT', () => exit(0));
process.on('SIGTERM', () => exit(0));

vite.on('exit', (code) => exit(code));
server.on('exit', (code) => exit(code));
