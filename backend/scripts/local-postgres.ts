/**
 * Local PostgreSQL สำหรับพัฒนา — ใช้ embedded-postgres (ไม่ต้องติดตั้ง Docker/PostgreSQL แยก)
 *
 * คำสั่ง:
 *   npm run db:local:start  — เปิด PostgreSQL (ค้างรอใน terminal)
 *   npm run db:local:setup  — เปิด DB + migrate + seed ครั้งเดียว
 *   npm run db:local:stop   — หยุด PostgreSQL
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';
import EmbeddedPostgres from 'embedded-postgres';

const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const PGDATA = path.join(ROOT, '.pgdata');
const PID_FILE = path.join(PGDATA, 'local-postgres.pid');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'exam_user',
  password: 'exam_local_dev',
  database: 'online_exam',
};

function createEmbedded(): EmbeddedPostgres {
  return new EmbeddedPostgres({
    databaseDir: PGDATA,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    port: DB_CONFIG.port,
    persistent: true,
  });
}

async function isPostgresReady(): Promise<boolean> {
  try {
    const client = new Client({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      database: 'postgres',
      connectionTimeoutMillis: 2000,
    });
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function waitForReady(maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPostgresReady()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('PostgreSQL did not become ready in time');
}

async function ensureDatabase(): Promise<void> {
  const admin = new Client({
    host: DB_CONFIG.host,
    port: DB_CONFIG.port,
    user: DB_CONFIG.user,
    password: DB_CONFIG.password,
    database: 'postgres',
  });
  await admin.connect();

  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    DB_CONFIG.database,
  ]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${DB_CONFIG.database}`);
    console.log(`Created database: ${DB_CONFIG.database}`);
  }

  await admin.end();
}

/** ถ้ารันอยู่แล้ว คืน null เพื่อแค่ค้างรอ (ไม่ start ซ้ำ) */
async function startServer(): Promise<EmbeddedPostgres | null> {
  if (!fs.existsSync(PGDATA)) {
    fs.mkdirSync(PGDATA, { recursive: true });
  }

  // มี instance ค้างจากรอบก่อน — ใช้ต่อได้ทันที ไม่ต้อง start ซ้ำ
  if (await isPostgresReady()) {
    await ensureDatabase();
    console.log('Local PostgreSQL is already running — attaching to existing instance.');
    console.log(`  URL: postgresql://${DB_CONFIG.user}:****@localhost:${DB_CONFIG.port}/${DB_CONFIG.database}`);
    return null;
  }

  const pg = createEmbedded();
  const isInitialized = fs.existsSync(path.join(PGDATA, 'PG_VERSION'));

  if (!isInitialized) {
    await pg.initialise();
  }

  try {
    await pg.start();
  } catch (error) {
    // race: process อื่นเปิด DB ไปแล้วระหว่างนี้
    if (await isPostgresReady()) {
      await ensureDatabase();
      console.log('Local PostgreSQL became ready during start — attaching to existing instance.');
      return null;
    }
    throw error;
  }

  await waitForReady();
  await ensureDatabase();

  fs.writeFileSync(PID_FILE, String(process.pid));
  console.log('Local PostgreSQL is running.');
  console.log(`  URL: postgresql://${DB_CONFIG.user}:****@localhost:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  return pg;
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? `postgresql://${DB_CONFIG.user}:${DB_CONFIG.password}@localhost:${DB_CONFIG.port}/${DB_CONFIG.database}?schema=public`,
      },
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}

async function setup(): Promise<void> {
  const pg = await startServer();
  try {
    console.log('\nRunning migrations...');
    await runCommand('npx', ['prisma', 'migrate', 'deploy']);
    console.log('\nSeeding database...');
    await runCommand('npm', ['run', 'db:seed']);
    console.log('\nLocal database setup complete.');
  } finally {
    if (pg) {
      await pg.stop();
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    }
  }
}

async function stopServer(): Promise<void> {
  const pg = createEmbedded();
  try {
    await pg.stop();
    console.log('PostgreSQL stopped.');
  } catch {
    console.log('PostgreSQL was not running or already stopped.');
  }
  if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'start';

  switch (cmd) {
    case 'setup':
      await setup();
      break;
    case 'stop':
      await stopServer();
      break;
    case 'start': {
      const pg = await startServer();
      const shutdown = async () => {
        // หยุดเฉพาะ instance ที่ process นี้เป็นคนเปิด
        if (pg) {
          try {
            await pg.stop();
          } catch {
            // ignore
          }
          if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
        }
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // ค้าง event loop เสมอ (กรณี attach ตัวเดิมจะไม่มี handle จาก EmbeddedPostgres)
      await new Promise<never>(() => {
        setInterval(() => {}, 60_000);
      });
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
