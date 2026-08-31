# สตาร์ทระบบทั้งหมด (PostgreSQL + Backend + Frontend) พร้อม auto-restart
# ใช้งาน: .\scripts\dev.ps1

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ""
Write-Host "กำลังเริ่มระบบทดสอบออนไลน์..." -ForegroundColor Cyan
Write-Host "เปิดเบราว์เซอร์: http://localhost:8081/login" -ForegroundColor Green
Write-Host "กด Ctrl+C เพื่อหยุด" -ForegroundColor Yellow
Write-Host ""

npm run dev
