import type { ReactNode } from 'react';
import { AppShell, type AppShellMenuItem } from '@/components/AppShell';
import type { User } from '@/types';

interface TeacherNavbarProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  title?: string;
  maxContentWidth?: number;
}

export const TEACHER_MENU: AppShellMenuItem[] = [
  { icon: 'home-outline', label: 'หน้าหลัก', route: '/(teacher)/home', section: 'เมนูหลัก' },
  { icon: 'people-outline', label: 'รายชื่อผู้เข้าสอบ', route: '/(teacher)/student-list' },
  { icon: 'school-outline', label: 'จัดการห้องเรียน', route: '/(teacher)/manage-classroom' },
  { icon: 'document-text-outline', label: 'จัดการห้องสอบ', route: '/(teacher)/manage-exam' },
  { icon: 'bar-chart-outline', label: 'ข้อมูลรวม/แจ้งเตือน', route: '/(teacher)/summary' },
];

export function TeacherNavbar({
  user,
  onLogout,
  children,
  title,
  maxContentWidth = 1200,
}: TeacherNavbarProps) {
  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      menuItems={TEACHER_MENU}
      roleLabel="อาจารย์"
      appLabel="อาจารย์"
      title={title}
      maxContentWidth={maxContentWidth}
    >
      {children}
    </AppShell>
  );
}
