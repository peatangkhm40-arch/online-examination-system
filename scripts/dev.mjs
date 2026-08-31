#!/usr/bin/env node
/**
 * สตาร์ท PostgreSQL + Backend + Frontend พร้อมกัน
 * รีสตาร์ทอัตโนมัติเมื่อ process หยุดทำงาน และตรวจสุขภาพเป็นระยะ
 *
 * ใช้งาน: npm run dev   (จากโฟลเดอร์ root)
 */
import { spawn, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');

const HEALTH_INTERVAL_MS = 30_000;
const RESTART_DELAY_MS = 4_000;
const MAX_HEALTH_FAILURES = 3;

const COLORS = {
  PostgreSQL: '\x1b[36m',
  Backend: '\x1b[32m',
  Frontend: '\x1b[35m',
  reset: '\x1b[0m',
};

function log(name, message) {
  const color = COLORS[name] ?? '';
  const time = new Date().toLocaleTimeString('th-TH');
  console.log(`${color}[${time}] [${name}]${COLORS.reset} ${message}`);
}

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function npxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

async function checkUrl(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForUrl(url, label, maxAttempts = 40, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkUrl(url)) {
      log(label, `พร้อมใช้งานที่ ${url}`);
      return true;
    }
    await sleep(intervalMs);
  }
  log(label, `ยังไม่ตอบสนองที่ ${url} (จะลองรีสตาร์ทถ้าจำเป็น)`);
  return false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

class ManagedService {
  constructor({
    name,
    cwd,
    command,
    args,
    healthUrl,
    startDelay = 0,
    maxRestarts = Infinity,
    restartOnExitCode0 = true,
    freePorts = [],
    env = {},
    ignoreStdin = false,
  }) {
    this.name = name;
    this.cwd = cwd;
    this.command = command;
    this.args = args;
    this.healthUrl = healthUrl;
    this.startDelay = startDelay;
    this.maxRestarts = maxRestarts;
    this.restartOnExitCode0 = restartOnExitCode0;
    this.freePorts = freePorts;
    this.env = env;
    this.ignoreStdin = ignoreStdin;
    this.child = null;
    this.stopping = false;
    this.healthFailures = 0;
    this.restartCount = 0;
  }

  start() {
    if (this.stopping) return;

    setTimeout(() => {
      if (this.stopping) return;
      void this.spawnProcess();
    }, this.startDelay);
  }

  async spawnProcess() {
    log(this.name, this.restartCount > 0 ? `กำลังรีสตาร์ท (ครั้งที่ ${this.restartCount})...` : 'กำลังเริ่ม...');

    for (const port of this.freePorts) {
      await freePort(port);
    }

    this.child = spawn(this.command, this.args, {
      cwd: this.cwd,
      // ปิด stdin สำหรับ Expo — กัน crash จาก raw mode / ปุ่มกดหลุดเข้า process
      stdio: this.ignoreStdin ? ['ignore', 'inherit', 'inherit'] : 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        ...this.env,
      },
    });

    this.child.on('exit', (code, signal) => {
      this.child = null;
      if (this.stopping) return;

      const reason = signal ? `signal ${signal}` : `exit code ${code}`;

      // PostgreSQL ที่ attach ตัวเดิมไม่ควรวน restart เมื่อจบแบบปกติ
      if (code === 0 && !this.restartOnExitCode0) {
        log(this.name, `ทำงานเสร็จ/ค้างใช้งานแล้ว (${reason}) — ไม่รีสตาร์ท`);
        return;
      }

      if (this.restartCount >= this.maxRestarts) {
        log(this.name, `หยุดทำงาน (${reason}) — ครบจำนวนรีสตาร์ทสูงสุดแล้ว`);
        return;
      }
      log(this.name, `หยุดทำงาน (${reason}) — จะรีสตาร์ทใน ${RESTART_DELAY_MS / 1000} วินาที`);
      this.restartCount += 1;
      setTimeout(() => this.start(), RESTART_DELAY_MS);
    });

    this.child.on('error', (err) => {
      log(this.name, `เกิดข้อผิดพลาด: ${err.message}`);
    });
  }

  async checkHealth() {
    if (!this.healthUrl || this.stopping) return;

    const ok = await checkUrl(this.healthUrl);
    if (ok) {
      this.healthFailures = 0;
      return;
    }

    this.healthFailures += 1;
    if (this.healthFailures >= MAX_HEALTH_FAILURES) {
      log(this.name, `ไม่ตอบสนอง health check — กำลังรีสตาร์ท...`);
      this.healthFailures = 0;
      this.restart();
    }
  }

  killChildTree() {
    if (!this.child) return;
    if (process.platform === 'win32' && this.child.pid) {
      // ฆ่าทั้ง process tree — kill เฉพาะ shell ครอบจะทิ้ง Metro/Node ค้างพอร์ตไว้
      spawn('taskkill', ['/F', '/T', '/PID', String(this.child.pid)], { stdio: 'ignore' });
    } else {
      this.child.kill('SIGTERM');
    }
  }

  restart() {
    if (this.child) {
      this.killChildTree();
    } else {
      this.restartCount += 1;
      void this.spawnProcess();
    }
  }

  stop() {
    this.stopping = true;
    this.killChildTree();
  }
}

async function ensureDependencies() {
  for (const dir of [BACKEND, FRONTEND]) {
    if (!fs.existsSync(path.join(dir, 'node_modules'))) {
      log('Setup', `ติดตั้ง dependencies ใน ${path.basename(dir)}...`);
      await new Promise((resolve, reject) => {
        const child = spawn(npmCommand(), ['install'], {
          cwd: dir,
          stdio: 'inherit',
          shell: process.platform === 'win32',
        });
        child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`npm install failed in ${dir}`))));
      });
    }
  }
}

async function listListeningPids(port) {
  if (process.platform !== 'win32') {
    try {
      const { stdout } = await execFileAsync('sh', ['-c', `lsof -ti:${port} || true`]);
      return String(stdout)
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s));
    } catch {
      return [];
    }
  }

  try {
    const { stdout } = await execFileAsync(
      'cmd.exe',
      ['/c', `netstat -ano | findstr :${port}`],
      { windowsHide: true }
    );
    const pids = new Set();
    for (const line of String(stdout).split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      // กันจับพอร์ตผิด เช่น 80810
      if (!new RegExp(`:${port}\\s`).test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

async function freePort(port) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const pids = await listListeningPids(port);
    if (pids.length === 0) {
      // เผื่อ process กำลัง bind อยู่ ให้รอแล้วเช็กอีกครั้ง
      if (attempt === 0) {
        await sleep(800);
        continue;
      }
      return;
    }

    for (const pid of pids) {
      try {
        if (process.platform === 'win32') {
          await execFileAsync('taskkill', ['/F', '/T', '/PID', String(pid)], { windowsHide: true });
        } else {
          await execFileAsync('kill', ['-9', pid]);
        }
        log('System', `เคลียร์พอร์ต ${port} (PID ${pid})`);
      } catch {
        // process อาจหายไปแล้ว
      }
    }
    await sleep(1200);
  }
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
  } else if (process.platform === 'darwin') {
    spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
  } else {
    spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
  }
}

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  ระบบทดสอบออนไลน์ — Dev Server (Auto-restart)');
  console.log('  Frontend: http://localhost:8081');
  console.log('  Backend:  http://localhost:3001');
  console.log('  กด Ctrl+C เพื่อหยุดทั้งหมด');
  console.log('══════════════════════════════════════════════════════════');
  console.log('');

  await ensureDependencies();

  // เคลียร์พอร์ตแอปก่อนเปิด (ไม่แตะ 5432 ของ PostgreSQL)
  log('System', 'กำลังเคลียร์พอร์ต 8081 / 3001...');
  await freePort(8081);
  await freePort(3001);
  await sleep(2000);

  const services = [
    new ManagedService({
      name: 'PostgreSQL',
      cwd: BACKEND,
      command: npmCommand(),
      args: ['run', 'db:local:start'],
      healthUrl: null,
      startDelay: 0,
      maxRestarts: 3,
      restartOnExitCode0: false,
    }),
    new ManagedService({
      name: 'Backend',
      cwd: BACKEND,
      command: npmCommand(),
      args: ['run', 'dev'],
      healthUrl: 'http://localhost:3001/health',
      startDelay: 6_000,
      maxRestarts: 10,
      freePorts: [3001],
    }),
    new ManagedService({
      name: 'Frontend',
      cwd: FRONTEND,
      command: npxCommand(),
      // --host localhost: ไม่ bind ไป LAN — ตัดปัญหา Windows Firewall ขออนุญาตทุกครั้ง
      args: ['expo', 'start', '--web', '--port', '8081', '--host', 'localhost'],
      healthUrl: 'http://localhost:8081',
      startDelay: 12_000,
      maxRestarts: 10,
      freePorts: [8081],
      ignoreStdin: true,
    }),
  ];

  services.forEach((s) => s.start());

  // รอให้บริการขึ้นครั้งแรก (Backend ก่อน แล้วค่อย Frontend ของ process นี้)
  await sleep(8_000);
  const backendOk = await waitForUrl('http://localhost:3001/health', 'Backend', 30, 2000);

  // รอ Frontend จาก child จริง ไม่นับ process ค้างเก่า
  let frontendOk = false;
  for (let i = 0; i < 45; i++) {
    const frontend = services.find((s) => s.name === 'Frontend');
    if (frontend?.child && (await checkUrl('http://localhost:8081/login'))) {
      log('Frontend', 'พร้อมใช้งานที่ http://localhost:8081/login');
      frontendOk = true;
      break;
    }
    await sleep(2000);
  }
  if (!frontendOk) {
    log('Frontend', 'ยังไม่ตอบสนองที่ http://localhost:8081/login (จะลองรีสตาร์ทถ้าจำเป็น)');
  }

  if (backendOk && frontendOk) {
    log('System', 'เปิดเบราว์เซอร์ไปที่ http://localhost:8081/login');
    openBrowser('http://localhost:8081/login');
  }

  const healthTimer = setInterval(() => {
    services.forEach((s) => s.checkHealth());
  }, HEALTH_INTERVAL_MS);

  const shutdown = () => {
    log('System', 'กำลังหยุดบริการทั้งหมด...');
    clearInterval(healthTimer);
    services.forEach((s) => s.stop());
    setTimeout(() => process.exit(0), 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
