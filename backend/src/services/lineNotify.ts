/**
 * ส่งแจ้งเตือน LINE Notify (ถ้าตั้ง LINE_NOTIFY_TOKEN / teacher.lineNotifyToken)
 * ไม่ throw ออกนอก — การทุจริตต้องบันทึกได้แม้ LINE ล้มเหลว
 */
export async function sendLineNotify(message: string, token?: string | null) {
  const accessToken = (token || process.env.LINE_NOTIFY_TOKEN || '').trim();
  if (!accessToken) return { ok: false as const, skipped: true as const };

  try {
    const body = new URLSearchParams({ message });
    const res = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[LINE Notify]', res.status, text.slice(0, 200));
      return { ok: false as const, skipped: false as const };
    }
    return { ok: true as const, skipped: false as const };
  } catch (error) {
    console.warn('[LINE Notify] failed', error);
    return { ok: false as const, skipped: false as const };
  }
}
