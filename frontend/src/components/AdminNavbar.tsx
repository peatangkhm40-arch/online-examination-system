import type { ReactNode } from 'react';
import { AppShell, type AppShellMenuItem } from '@/components/AppShell';
import type { User } from '@/types';

interface AdminNavbarProps {
  user: User;
  onLogout: () => void;
  children: ReactNode;
  title?: string;
  maxContentWidth?: number;
}

export const ADMIN_MENU: AppShellMenuItem[] = [
  { icon: 'home-outline', label: 'จัดการระบบ', route: '/(admin)/home', section: 'เมนูหลัก' },
];

export function AdminNavbar({ user, onLogout, children, title, maxContentWidth = 1100 }: AdminNavbarProps) {
  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      menuItems={ADMIN_MENU}
      roleLabel="ผู้ดูแลระบบ"
      appLabel="ผู้ดูแลระบบ"
      title={title}
      maxContentWidth={maxContentWidth}
    >
      {children}
    </AppShell>
  );
}
