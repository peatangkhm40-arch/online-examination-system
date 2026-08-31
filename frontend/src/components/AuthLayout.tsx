import { type ReactNode } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Logo } from '@/components/Logo';
import { APP_NAME, APP_TAGLINE } from '@/constants/app';
import { colors, fonts } from '@/theme';

interface AuthSplitLayoutProps {
  children: ReactNode;
}

const FEATURES = [
  { icon: 'shield-checkmark-outline' as const, title: 'ป้องกันการทุจริต', desc: 'ตรวจจับพฤติกรรมผิดปกติระหว่างสอบ' },
  { icon: 'document-text-outline' as const, title: 'ห้องสอบออนไลน์', desc: 'สร้างและจัดการข้อสอบได้ทันที' },
  { icon: 'people-outline' as const, title: 'ห้องเรียนและรายงาน', desc: 'ติดตามคะแนนและแจ้งเตือนได้ครบ' },
];

function DecorPanel() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.shellBgDeep, padding: 40, justifyContent: 'center' }}>
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: 'rgba(99,102,241,0.18)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 60,
          left: -50,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: 'rgba(59,130,246,0.12)',
        }}
      />

      <Logo size="lg" variant="light" />
      <Text style={{ fontFamily: fonts.bold, fontSize: 22, color: '#fff', marginTop: 20, lineHeight: 30 }}>
        ExamGuard
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.shellMuted, marginTop: 8, lineHeight: 22 }}>
        {APP_TAGLINE}
      </Text>

      <View style={{ marginTop: 36, gap: 14 }}>
        {FEATURES.map((item) => (
          <View
            key={item.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: 'rgba(148,163,184,0.16)',
              borderRadius: 14,
              padding: 14,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: colors.shellSidebarActive,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon} size={20} color="#c7d2fe" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.shellText }}>{item.title}</Text>
              <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.shellMuted, marginTop: 2 }}>
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text
        style={{
          position: 'absolute',
          bottom: 36,
          left: 40,
          right: 40,
          fontFamily: fonts.regular,
          fontSize: 11,
          color: colors.shellMuted,
          lineHeight: 16,
        }}
        numberOfLines={2}
      >
        {APP_NAME}
      </Text>
    </View>
  );
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  if (!isWide) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.shellBg }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16, justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Logo size="md" variant="light" />
          </View>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 22,
              padding: 24,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              shadowColor: '#020617',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.28,
              shadowRadius: 28,
              elevation: 6,
            }}
          >
            {children}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.shellBg }}>
      <View style={{ flex: 0.42, minWidth: 320 }}>
        <DecorPanel />
      </View>
      <View style={{ flex: 0.58, padding: 28, justifyContent: 'center' }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              maxWidth: 460,
              width: '100%',
              alignSelf: 'center',
              backgroundColor: colors.surface,
              borderRadius: 24,
              padding: 36,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
              shadowColor: '#020617',
              shadowOffset: { width: 0, height: 14 },
              shadowOpacity: 0.28,
              shadowRadius: 32,
              elevation: 8,
            }}
          >
            {children}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

interface AuthCenterLayoutProps {
  children: ReactNode;
}

export function AuthCenterLayout({ children }: AuthCenterLayoutProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.shellBg }}>
      <View
        style={{
          position: 'absolute',
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: 'rgba(99,102,241,0.16)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -40,
          left: -40,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(59,130,246,0.12)',
        }}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <Logo size="md" variant="light" />
          <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#fff', marginTop: 12 }}>ExamGuard</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.shellMuted, marginTop: 4 }}>
            สมัครสมาชิกเพื่อเริ่มใช้งาน
          </Text>
        </View>

        <View
          style={{
            maxWidth: 560,
            width: '100%',
            alignSelf: 'center',
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: 32,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)',
            shadowColor: '#020617',
            shadowOffset: { width: 0, height: 14 },
            shadowOpacity: 0.28,
            shadowRadius: 32,
            elevation: 8,
          }}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  );
}
