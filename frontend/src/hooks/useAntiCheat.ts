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
 * - สลับแท็บ / ซ่อนหน้า
 * - คัดลอก / วาง / คลิกขวา
 * - ออกจากเต็มจอ
 * - เปิด DevTools (F12)
 */
export function useAntiCheat({ attemptId, onEvent, enabled = true }: AntiCheatOptions) {
  const attemptIdRef = useRef(attemptId);
  const lockedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  attemptIdRef.current = attemptId;
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return;
    lockedRef.current = false;

    const report = (type: CheatEventType, metadata?: Record<string, unknown>) => {
      if (lockedRef.current) return;
      lockedRef.current = true; // กันยิงซ้ำหลาย event พร้อมกัน
      onEventRef.current(type, {
        ...metadata,
        attemptId: attemptIdRef.current,
        timestamp: Date.now(),
      });
    };

    const handleVisibility = () => {
      if (document.hidden) {
        report('PAGE_HIDDEN', { reason: 'document_hidden' });
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
      // ล็อกเฉพาะเมื่อเคยเข้าเต็มจอแล้วถูกออก
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

    document.addEventListener('visibilitychange', handleVisibility);
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
      document.removeEventListener('visibilitychange', handleVisibility);
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
