# ระบบสอบออนไลน์พร้อม Anti-Cheat

โปรเจกต์ระบบสอบออนไลน์ที่รองรับการป้องกันการทุจริต สร้างด้วย **React Native Web (Expo)**, **Node.js**, **PostgreSQL** และพร้อม Deploy บน **Railway**

## โครงสร้างโปรเจกต์

```
online-examination-system/
├── backend/          # Node.js + Express + Prisma API
├── frontend/         # Expo React Native Web
└── project.md        # ข้อตกลงและแนวทางการทำงาน
```

## บทบาทผู้ใช้

| Role | สิทธิ์ |
|------|--------|
| **ADMIN** | จัดการผู้ใช้ทั้งหมด |
| **TEACHER** | สร้างข้อสอบ, เพิ่มคำถาม, เผยแพร่ข้อสอบ |
| **STUDENT** | ทำข้อสอบ, ดูผลสอบ |

## ฟีเจอร์ Anti-Cheat (เวอร์ชันแรก)

- ตรวจจับการสลับแท็บ / หน้าต่างเสียโฟกัส
- ป้องกัน Copy / Paste / Right-click
- ตรวจจับการออกจาก Fullscreen
- บันทึก   Cheat Events ลง PostgreSQL
- Auto-disqualify เมื่อเกิน 5 ครั้ง (ปรับได้ผ่าน `MAX_CHEAT_FLAGS`)

---

## เริ่มต้นใช้งาน (Local)

### 1. PostgreSQL Local (เลือกวิธีใดวิธีหนึ่ง)

#### วิธี A — Embedded PostgreSQL (แนะนำ, ไม่ต้องติดตั้งอะไรเพิ่ม)

รันคำสั่งเดียวเพื่อสร้าง DB + migrate + seed:

```powershell
cd backend
npm install
npm run db:local:setup
```

จากนั้นเปิด PostgreSQL ค้างไว้ใน terminal หนึ่ง:

```powershell
npm run db:local:start
```

| ค่า | รายละเอียด |
|-----|------------|
| Host | `localhost:5432` |
| Database | `online_exam` |
| User | `exam_user` |
| Password | `exam_local_dev` |

ข้อมูลเก็บใน `backend/.pgdata/` (ไม่ commit ขึ้น git)

#### วิธี B — Docker Compose

```powershell
docker compose up -d
cd backend
npx prisma migrate deploy
npm run db:seed
```

#### วิธี C — PostgreSQL ติดตั้งบนเครื่อง

```powershell
winget install PostgreSQL.PostgreSQL.17
.\scripts\setup-local-db.ps1
```

---

### 2. Backend

```powershell
cd backend
# ไฟล์ .env ถูกสร้างไว้แล้วสำหรับ local — ตรวจสอบ DATABASE_URL

npm run dev
```

API จะรันที่ `http://localhost:3001`

### 3. Frontend

```powershell
cd frontend
npm install
npm run web
```

เปิดเบราว์เซอร์ที่ URL ที่ Expo แสดง (ปกติ `http://localhost:8081`)

### บัญชีทดสอบ (หลัง seed)

| อีเมล | รหัสผ่าน | บทบาท |
|-------|----------|--------|
| `admin@exam.local` | `password123` | Admin |
| `teacher@exam.local` | `password123` | Teacher |
| `student@exam.local` | `password123` | Student |

ข้อสอบตัวอย่าง: **Introduction to Pad Thai**

---

## Deploy บน Railway

> **หมายเหตุ:** ทดสอบ local ให้ครบก่อน deploy — ใช้ `npm run db:local:setup` บนเครื่อง dev แล้วค่อย deploy ขึ้น Railway

### Backend + PostgreSQL

1. สร้าง Project บน Railway
2. เพิ่ม **PostgreSQL** service
3. เพิ่ม **Backend** service จาก repo โฟลเดอร์ `backend/`
4. ตั้ง Environment Variables:
   - `DATABASE_URL` — Railway จะ inject อัตโนมัติถ้า link กับ Postgres
   - `JWT_SECRET` — สตริงสุ่มยาวๆ
   - `CORS_ORIGIN` — URL ของ frontend
   - `NODE_ENV=production`
5. Deploy — `railway.json` จะรัน `prisma migrate deploy` ก่อน start

### Frontend (Static Web)

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://your-backend.railway.app npm run build:web
```

Deploy โฟลเดอร์ `dist/` ไปยัง Railway Static หรือ hosting อื่น

---

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/auth/login` | เข้าสู่ระบบ |
| POST | `/api/auth/register` | สมัครนักเรียน |
| GET | `/api/exams` | รายการข้อสอบ |
| POST | `/api/exams` | สร้างข้อสอบ (Teacher+) |
| POST | `/api/attempts/start/:examId` | เริ่มทำข้อสอบ |
| POST | `/api/attempts/:id/cheat-events` | รายงานพฤติกรรมน่าสงสัย |
| POST | `/api/attempts/:id/submit` | ส่งข้อสอบ |

---

## ขั้นตอนถัดไป (แนะนำ)

- [ ] หน้าสร้าง/แก้ไขข้อสอบสำหรับ Teacher
- [ ] Webcam / Face detection
- [ ] Proctoring dashboard สำหรับ Teacher
- [ ] Export ผลสอบเป็น PDF/CSV

ดูรายละเอียดการทำงานร่วมกับ AI ใน [`project.md`](./project.md)
