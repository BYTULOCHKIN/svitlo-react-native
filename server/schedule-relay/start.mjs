import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(new URL('.', import.meta.url));
const children = new Set();
let stopping = false;
let secretDirectory;

async function stop(code) {
  if (stopping)
    return;
  stopping = true;
  for (const child of children)
    child.kill('SIGTERM');
  const force = setTimeout(() => {
    for (const child of children)
      child.kill('SIGKILL');
  }, 5000);
  await Promise.all([...children].map(child => new Promise(resolve => child.once('exit', resolve))));
  clearTimeout(force);
  if (secretDirectory)
    await rm(secretDirectory, { recursive: true, force: true });
  process.exit(code);
}

function launch(command, args, { env, quiet = false }) {
  const child = spawn(command, args, { env, stdio: quiet ? 'ignore' : 'inherit' });
  children.add(child);
  child.once('error', () => {
    children.delete(child);
    console.error('Backend subprocess failed to start');
    void stop(1);
  });
  child.once('exit', () => {
    children.delete(child);
    if (!stopping) {
      console.error('Backend subprocess exited');
      void stop(1);
    }
  });
}

async function proxyReady() {
  for (let attempt = 0; attempt < 100; attempt++) {
    const ready = await new Promise((resolve) => {
      const socket = connect({ host: '127.0.0.1', port: 18080 });
      socket.setTimeout(200);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ready)
      return;
    await delay(100);
  }
  throw new Error('WireGuard proxy startup timeout');
}

async function main() {
  const env = { ...process.env };
  const config = env.WIREGUARD_CONFIG ?? (env.WIREGUARD_CONFIG_FILE ? await readFile(env.WIREGUARD_CONFIG_FILE, 'utf8') : undefined);
  delete env.WIREGUARD_CONFIG;
  delete env.WIREGUARD_CONFIG_FILE;
  if (config !== undefined) {
    const sections = [...config.matchAll(/^\s*\[([^\]]+)\]/gm)].map(match => match[1]);
    if (sections.join(',') !== 'Interface,Peer' || !/^AllowedIPs\s*=/m.test(config))
      throw new Error('Invalid WireGuard profile');
    secretDirectory = await mkdtemp(join(tmpdir(), 'svitlo-wireguard-'));
    const filename = join(secretDirectory, 'wireproxy.conf');
    // Routes exist only inside wireproxy, never in the operating system.
    const profile = config.replace(/^AllowedIPs\s*=.*$/m, 'AllowedIPs = 0.0.0.0/0');
    await writeFile(filename, `${profile}\n[http]\nBindAddress = 127.0.0.1:18080\n`, { mode: 0o600 });
    // Quiet mode also prevents dependency errors from exposing config contents.
    launch(env.WIREPROXY_BINARY ?? join(directory, 'dist/wireproxy'), ['--silent', '--config', filename], { env, quiet: true });
    await proxyReady();
    env.POE_PROXY_URL = 'http://127.0.0.1:18080';
    console.info('WireGuard source proxy started');
  }
  launch(process.execPath, [join(directory, 'dist/server.cjs')], { env });
}

process.on('SIGTERM', () => {
  void stop(0);
});
process.on('SIGINT', () => {
  void stop(0);
});
main().catch(() => {
  console.error('Backend startup failed');
  void stop(1);
});
