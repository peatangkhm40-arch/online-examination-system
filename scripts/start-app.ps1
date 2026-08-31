# เปิดระบบสอบออนไลน์ทั้งชุด + รอพร้อมใช้แล้วเปิดเบราว์เซอร์
# ดับเบิลคลิก: start-app.bat หรือ รัน: .\scripts\start-app.ps1

$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = 'd:\online-examination-system' }
Set-Location $Root

function Write-Info($msg) {
  Write-Host $msg -ForegroundColor Cyan
}

function Write-Ok($msg) {
  Write-Host $msg -ForegroundColor Green
}

function Stop-Port($port) {
  try {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
      $procId = $c.OwningProcess
      if ($procId -and $procId -ne 0) {
        Write-Info "กำลังเคลียร์พอร์ต $port (PID $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      }
    }
  } catch {}
}

function Test-Url($url) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    return $r.StatusCode -ge 200 -and $r.StatusCode -lt 400
  } catch {
    return $false
  }
}

Write-Host ''
Write-Host '══════════════════════════════════════════════════════════' -ForegroundColor Magenta
Write-Host '  ระบบทดสอบออนไลน์ — กำลังเปิดใช้งาน' -ForegroundColor Magenta
Write-Host '══════════════════════════════════════════════════════════' -ForegroundColor Magenta
Write-Host ''

# เคลียร์พอร์ตค้าง (ป้องกัน Connection Refused จาก process เก่า)
Stop-Port 8081
Stop-Port 3001
Start-Sleep -Seconds 1

Write-Info 'กำลังสตาร์ท PostgreSQL + Backend + Frontend...'
Write-Info 'อย่าปิดหน้าต่างนี้ระหว่างใช้งาน'
Write-Host ''

# เปิดเบราว์เซอร์เมื่อพร้อม (รันขนานกับ npm run dev)
$watchJob = Start-Job -ScriptBlock {
  $max = 90
  for ($i = 0; $i -lt $max; $i++) {
    Start-Sleep -Seconds 2
    try {
      $fe = Invoke-WebRequest -Uri 'http://localhost:8081/login' -UseBasicParsing -TimeoutSec 2
      $be = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 2
      if ($fe.StatusCode -eq 200 -and $be.StatusCode -eq 200) {
        Start-Process 'http://localhost:8081/login'
        return
      }
    } catch {}
  }
}

try {
  npm.cmd start
} finally {
  Stop-Job $watchJob -ErrorAction SilentlyContinue
  Remove-Job $watchJob -Force -ErrorAction SilentlyContinue
}
