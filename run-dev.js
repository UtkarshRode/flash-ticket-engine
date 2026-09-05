import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n=============================================================');
console.log('🚀 FLASH-TICKET ENGINE: STARTING SERVER & CLIENT CONCURRENTLY');
console.log('=============================================================\n');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// 1. Start Server
console.log('📦 Launching Express + Socket.io Server (Port 5000)...');
const serverProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true,
});

// 2. Start Client
console.log('⚡ Launching React + Vite Client (Port 5173)...');
const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  stdio: 'inherit',
  shell: true,
});

// Handle termination signals
const handleShutdown = () => {
  console.log('\n🛑 Shutting down FlashTicket processes...');
  try {
    if (isWindows) {
      // Force kill tree on Windows
      if (serverProcess.pid) spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t']);
      if (clientProcess.pid) spawn('taskkill', ['/pid', String(clientProcess.pid), '/f', '/t']);
    } else {
      serverProcess.kill('SIGTERM');
      clientProcess.kill('SIGTERM');
    }
  } catch (err) {
    // Ignore cleanup errors on exit
  }
  process.exit(0);
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

serverProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[Server] Process exited with code ${code}`);
  }
});

clientProcess.on('exit', (code) => {
  if (code !== null && code !== 0) {
    console.error(`[Client] Process exited with code ${code}`);
  }
});
