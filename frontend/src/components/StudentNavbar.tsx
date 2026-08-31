import type { ReactNode } from 'react';
import { AppShell, type AppShellMenuItem } from '@/components/AppShell';
import type { User } from '@/types';

interface StudentNavbarProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  title?: string;
  maxContentWidth?: number;
  contentPadding?: number;
}

export const STUDENT_MENU: AppShellMenuItem[] = [
  { icon: 'home-outline', label: 'หน้าหลัก', route: '/(app)/dashboard', section: 'เมนูหลัก' },
  { icon: 'time-outline', label: 'ประวัติการสอบ', route: '/(app)/history', section: 'ผลการเรียน' },
  { icon: 'help-circle-outline', label: 'ช่วยเหลือ / ติดต่อ', route: '/(app)/help', section: 'ข้อมูลระบบ' },
];

export function StudentNavbar({
  user,
  onLogout,
  children,
  title,
  maxContentWidth = 900,
  contentPadding,
}: StudentNavbarProps) {
  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      menuItems={STUDENT_MENU}
      roleLabel="นักเรียน"
      appLabel="นักเรียน"
      title={title}
      maxContentWidth={maxContentWidth}
      contentPadding={contentPadding}
    >
      {children}
    </AppShell>
  );
}
