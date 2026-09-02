import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { CheatEventType } from '../types';

interface AntiCheatOptions {
  attemptId: string;
  onEvent: (type: CheatEventType, metadata?: Record<string, unknown>) => void;
  enabled?: boolean;
}

/**
 * ตรวจจับทุจริตระหว่างสอบ (Web) — พบแล้วรายงานทันทีเพื่อให้ระบบล็อก
 * - สลับแท็บ / ซ่อนหน้า / ปัดแอป
 * - เสียโฟกัสหน้าต่าง (รวมกรณีเปิดแชทลอย/แอปทับจอแล้วแตะ)
 * - คัดลอก / วาง / คลิกขวา
 * - ออกจากเต็มจอ
 * - เปิด DevTools (F12)
 *
 * หมายเหตุ: แชทหัวกลมที่ลอยทับจอโดยไม่แย่งโฟกัส เว็บตรวจจับโดยตรงไม่ได้
 * แต่เมื่อผู้สอบแตะแชทหรือสลับไปแอปแชท ระบบจะจับผ่าน blur / visibility / hasFocus
 */
export function useAntiCheat({ attemptId, onEvent, enabled = true }: AntiCheatOptions) {
  const attemptIdRef = useRef(attemptId);
  const lockedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  attemptIdRef.current = attemptId;
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;
    lockedRef.current = false;

    const report = (type: CheatEventType, metadata?: Record<string, unknown>) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      onEventRef.current(type, {
        ...metadata,
        attemptId: attemptIdRef.current,
        timestamp: Date.now(),
      });
    };

    /** โฟกัสยังอยู่ในหน้าข้อสอบหรือไม่ (กัน false positive จากคีย์บอร์ดมือถือ) */
    const focusStillInExam = () => {
      const active = document.activeElement;
      if (!active || active === document.body || active === document.documentElement) {
        return document.hasFocus() && !document.hidden;
      }
      return document.documentElement.contains(active) && !document.hidden;
    };

    const reportFocusLoss = (reason: string) => {
      if (document.hidden) {
        report('APP_SWITCH', { reason, visibilityState: document.visibilityState });
        return;
      }
      if (!document.hasFocus()) {
        report('WINDOW_BLUR', { reason, visibilityState: document.visibilityState });
      }
    };

    const handleVisibility = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        report('PAGE_HIDDEN', { reason: 'document_hidden', visibilityState: document.visibilityState });
      }
    };

    const handlePageHide = () => {
      report('APP_SWITCH', { reason: 'pagehide' });
    };

    const handleFreeze = () => {
      report('APP_SWITCH', { reason: 'page_freeze' });
    };

    const handleBlur = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      // หน่วงสั้น ๆ — ถ้าโฟกัสกลับมาที่ช่องตอบในหน้าเดิมไม่นับ
      blurTimerRef.current = setTimeout(() => {
        if (!focusStillInExam()) {
          reportFocusLoss('window_blur');
        }
      }, 250);
    };

    const handleFocus = () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      report('COPY_ATTEMPT', { reason: 'copy' });
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      report('PASTE_ATTEMPT', { reason: 'paste' });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      report('RIGHT_CLICK', { reason: 'contextmenu' });
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        report('FULLSCREEN_EXIT', { reason: 'fullscreen_exit' });
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (['c', 'v', 'x'].includes(key)) {
          e.preventDefault();
          report(key === 'v' ? 'PASTE_ATTEMPT' : 'COPY_ATTEMPT', { key: e.key });
        }
      }
      if (e.key === 'F12') {
        e.preventDefault();
        report('DEVTOOLS_SUSPECTED', { key: 'F12' });
      }
    };

    // สำรวจโฟกัสเป็นระยะ — จับแชทลอย/แอปทับที่แย่งโฟกัส (ต้องเสียโฟกัสต่อเนื่องกันเพื่อกัน false positive)
    let lostFocusStreak = 0;
    const focusPoll = setInterval(() => {
      if (lockedRef.current) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        report('PAGE_HIDDEN', { reason: 'poll_hidden' });
        return;
      }
      if (!document.hasFocus()) {
        lostFocusStreak += 1;
        // ~2.4 วินาที เสียโฟกัสต่อเนื่อง จึงนับ — ลดโอกาสตัดสิทธิ์ผิดจากคีย์บอร์ด/แถบเบราว์เซอร์
        if (lostFocusStreak >= 2) {
          report('WINDOW_BLUR', { reason: 'poll_no_focus', streak: lostFocusStreak });
        }
      } else {
        lostFocusStreak = 0;
      }
    }, 1200);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('freeze', handleFreeze as EventListener);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // browser บางตัวต้องมี user gesture — ไม่ถือว่าทุจริต
      });
    }

    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      clearInterval(focusPoll);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('freeze', handleFreeze as EventListener);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [enabled]);
}
