import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** กด Enter เพื่อส่งฟอร์ม (เว็บ) — กันยิงซ้ำในรอบเดียว */
export function useSubmitOnEnter(onSubmit: () => void, enabled = true) {
  const onSubmitRef = useRef(onSubmit);
  const lockedRef = useRef(false);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'textarea') return;

      // กัน onSubmitEditing ของ TextInput + keydown ยิงซ้อนกัน
      e.preventDefault();
      if (lockedRef.current) return;
      lockedRef.current = true;
      try {
        onSubmitRef.current();
      } finally {
        window.setTimeout(() => {
          lockedRef.current = false;
        }, 400);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled]);
}
