import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: requireEnv('JWT_SECRET', 'dev-only-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:8081').split(',').map((o) => o.trim()),
  // จำนวน cheat events ก่อนระบบจะตัดสิทธิ์ทันที (1 = พบทุจริตครั้งแรกแล้วล็อก)
  maxCheatFlags: parseInt(process.env.MAX_CHEAT_FLAGS ?? '1', 10),
};
