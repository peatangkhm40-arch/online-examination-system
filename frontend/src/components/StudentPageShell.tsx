import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StudentNavbar } from '@/components/StudentNavbar';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';
import { isTeacher } from '@/utils/routing';

interface StudentPageShellProps {
  children: ReactNode;
  title?: string;
  contentPadding?: number;
}

/** โครงหน้านักเรียนร่วม: Icewall shell + ตรวจ auth */
export function StudentPageShell({ children, title, contentPadding }: StudentPageShellProps) {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    if (isTeacher(user.role)) {
      router.replace('/(teacher)/home');
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (authLoading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.shellBg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <StudentNavbar
      user={user}
      onLogout={handleLogout}
      title={title}
      maxContentWidth={900}
      contentPadding={contentPadding}
    >
      {children}
    </StudentNavbar>
  );
}
