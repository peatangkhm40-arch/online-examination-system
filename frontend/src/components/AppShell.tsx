import { useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Logo } from '@/components/Logo';
import { APP_NAME } from '@/constants/app';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { User } from '@/types';
import { colors, fonts } from '@/theme';

export type AppShellMenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  section?: string;
};

type AppShellProps = {
  user: User;
  onLogout: () => void;
  menuItems: AppShellMenuItem[];
  roleLabel: string;
  /** ชื่อหน้าใน breadcrumb / ท็อปบาร์ */
  title?: string;
  /** breadcrumb ระดับแอป เช่น "ผู้ดูแลระบบ" */
  appLabel?: string;
  children: ReactNode;
  maxContentWidth?: number;
  contentPadding?: number;
};

function isRouteActive(pathname: string | null, route: string) {
  if (!pathname) return false;
  const clean = route.replace(/^\/\([^)]+\)/, '');
  if (pathname === clean || pathname.endsWith(clean)) return true;
  // หน้าแก้ไขห้องสอบ → ไฮไลต์เมนูจัดการห้องสอบ / จัดการระบบ
  if ((clean === '/manage-exam' || clean === '/home') && /\/exam\/[^/]+$/.test(pathname)) {
    return clean === '/manage-exam' || (clean === '/home' && route.includes('(admin)'));
  }
  return false;
}

export function AppShell({
  user,
  onLogout,
  menuItems,
  roleLabel,
  title,
  appLabel,
  children,
  maxContentWidth = 1200,
  contentPadding,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile, contentPadding: responsivePadding } = useResponsiveLayout();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const pad = contentPadding ?? responsivePadding;
  const brandShort = 'ExamGuard';

  const displayName = (user.fullName || '').trim() || roleLabel;
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || roleLabel.slice(0, 1);

  const activeTitle = useMemo(() => {
    if (title) return title;
    const hit = menuItems.find((m) => isRouteActive(pathname, m.route));
    return hit?.label ?? 'หน้าหลัก';
  }, [title, menuItems, pathname]);

  const navigate = (route: string) => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
    router.push(route as never);
  };

  const SidebarBody = ({ compact }: { compact?: boolean }) => (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: compact ? 28 : 24,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(148,163,184,0.15)',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Logo size="sm" variant="light" showText={false} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 16, color: '#fff' }} numberOfLines={1}>
              {brandShort}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.shellMuted, marginTop: 2 }} numberOfLines={1}>
              {roleLabel}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {menuItems.map((item, index) => {
          const active = isRouteActive(pathname, item.route);
          const showSection = item.section && (index === 0 || menuItems[index - 1]?.section !== item.section);
          return (
            <View key={item.route}>
              {showSection ? (
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 10,
                    color: colors.shellMuted,
                    paddingHorizontal: 20,
                    paddingTop: index === 0 ? 4 : 16,
                    paddingBottom: 8,
                    letterSpacing: 0.9,
                    textTransform: 'uppercase',
                  }}
                >
                  {item.section}
                </Text>
              ) : null}
              <Pressable
                onPress={() => navigate(item.route)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  marginHorizontal: 12,
                  marginVertical: 2,
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  backgroundColor: active
                    ? colors.shellSidebarActive
                    : pressed
                      ? colors.shellSidebarHover
                      : 'transparent',
                  borderLeftWidth: 3,
                  borderLeftColor: active ? '#fff' : 'transparent',
                  cursor: 'pointer' as const,
                })}
              >
                <Ionicons name={item.icon} size={18} color={active ? '#fff' : colors.shellMuted} />
                <Text
                  style={{
                    fontFamily: active ? fonts.semibold : fonts.medium,
                    fontSize: 14,
                    color: active ? '#fff' : colors.shellText,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => {
          setMobileMenuOpen(false);
          onLogout();
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          margin: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderTopWidth: 1,
          borderTopColor: 'rgba(148,163,184,0.15)',
          backgroundColor: pressed ? 'rgba(239,68,68,0.12)' : 'transparent',
          cursor: 'pointer' as const,
        })}
      >
        <Ionicons name="log-out-outline" size={18} color="#f87171" />
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: '#fca5a5' }}>ออกจากระบบ</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.shellBg }}>
      {/* Desktop sidebar */}
      {!isMobile ? (
        <View
          style={{
            width: 260,
            backgroundColor: colors.shellSidebar,
            borderRightWidth: 1,
            borderRightColor: 'rgba(148,163,184,0.12)',
          }}
        >
          <SidebarBody />
        </View>
      ) : null}

      {/* Main column */}
      <View style={{ flex: 1, minWidth: 0 }}>
        {/* Top bar */}
        <View
          style={{
            height: 64,
            paddingHorizontal: isMobile ? 12 : 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.shellTopbar,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(148,163,184,0.12)',
            zIndex: 40,
          }}
        >
          {isMobile ? (
            <Pressable
              onPress={() => {
                setProfileOpen(false);
                setMobileMenuOpen(true);
              }}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(255,255,255,0.1)' : 'transparent',
                cursor: 'pointer' as const,
              })}
              accessibilityLabel="เปิดเมนู"
            >
              <Ionicons name="menu" size={22} color="#fff" />
            </Pressable>
          ) : null}

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.shellMuted }} numberOfLines={1}>
              {(appLabel || roleLabel) + '  ›  ' + activeTitle}
            </Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff', marginTop: 2 }} numberOfLines={1}>
              {activeTitle}
            </Text>
          </View>

          {!isMobile ? (
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 11,
                color: colors.shellMuted,
                maxWidth: 220,
                textAlign: 'right',
              }}
              numberOfLines={2}
            >
              {APP_NAME}
            </Text>
          ) : null}

          <Pressable
            onPress={() => setProfileOpen((v) => !v)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingLeft: 10,
              paddingRight: 6,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: pressed ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
              cursor: 'pointer' as const,
              maxWidth: isMobile ? 160 : 220,
            })}
            accessibilityLabel="โปรไฟล์ผู้ใช้"
          >
            {!isMobile ? (
              <View style={{ alignItems: 'flex-end', maxWidth: 140 }}>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: '#fff' }} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.shellMuted }} numberOfLines={1}>
                  {roleLabel}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 13 }}>{initials}</Text>
            </View>
          </Pressable>
        </View>

        {profileOpen ? (
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
            onPress={() => setProfileOpen(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: 72,
                right: isMobile ? 12 : 24,
                width: 280,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.25,
                shadowRadius: 24,
                elevation: 10,
                overflow: 'hidden',
              }}
            >
              <View style={{ backgroundColor: colors.shellBgDeep, padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 16 }}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: '#fff' }} numberOfLines={2}>
                      {displayName}
                    </Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.shellMuted, marginTop: 4 }}>
                      {roleLabel}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.shellText, marginTop: 12 }}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setProfileOpen(false);
                  onLogout();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: 14,
                  backgroundColor: pressed ? '#fef2f2' : colors.surface,
                  cursor: 'pointer' as const,
                })}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.danger }}>ออกจากระบบ</Text>
              </Pressable>
            </View>
          </Pressable>
        ) : null}

        {/* White content panel */}
        <View style={{ flex: 1, padding: isMobile ? 10 : 18, paddingTop: isMobile ? 10 : 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: isMobile ? 18 : 24,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              shadowColor: '#020617',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.22,
              shadowRadius: 28,
              elevation: 6,
            }}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                padding: pad,
                paddingBottom: 48,
                maxWidth: maxContentWidth,
                width: '100%',
                alignSelf: 'center',
              }}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Mobile drawer */}
      <Modal visible={mobileMenuOpen} transparent animationType="fade" onRequestClose={() => setMobileMenuOpen(false)}>
        <Pressable
          style={{ flex: 1, flexDirection: 'row', backgroundColor: 'rgba(15,23,42,0.55)' }}
          onPress={() => setMobileMenuOpen(false)}
        >
          <Pressable
            style={{
              width: 290,
              maxWidth: '86%',
              height: '100%',
              backgroundColor: colors.shellSidebar,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <SidebarBody compact />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
