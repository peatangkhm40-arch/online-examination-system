#!/usr/bin/env node
/**
 * ตรวจสอบสถานะบริการทั้งหมด
 * ใช้งาน: npm run status
 */
const CHECKS = [
  { name: 'PostgreSQL (via Backend)', url: 'http://localhost:3001/health' },
  { name: 'Backend API', url: 'http://localhost:3001/health' },
  { name: 'Frontend Web', url: 'http://localhost:8081' },
];

async function check(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\nสถานะบริการ:\n');
  let allOk = true;

  for (const { name, url } of CHECKS) {
    const ok = await check(url);
    const status = ok ? '✓ ทำงาน' : '✗ หยุด';
    console.log(`  ${status.padEnd(12)} ${name}  (${url})`);
    if (!ok) allOk = false;
  }

  console.log('');
  if (allOk) {
    console.log('  เปิดใช้งาน: http://localhost:8081/login\n');
  } else {
    console.log('  รัน: npm run dev   (จากโฟลเดอร์ root)\n');
  }
}

main();
