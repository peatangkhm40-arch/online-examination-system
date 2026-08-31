@echo off
chcp 65001 >nul
title ระบบทดสอบออนไลน์
cd /d "%~dp0"

echo.
echo  กำลังเปิดระบบทดสอบออนไลน์...
echo  อย่าปิดหน้าต่างนี้
echo.

REM ใช้ npm.cmd เลี่ยงปัญหา PowerShell ExecutionPolicy บล็อก npm.ps1
call npm.cmd start

if errorlevel 1 (
  echo.
  echo  เกิดข้อผิดพลาด — กดปุ่มใดๆ เพื่อปิด
  pause >nul
)
