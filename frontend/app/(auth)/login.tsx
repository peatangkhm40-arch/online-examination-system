import { useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link, useRouter } from 'expo-router';
import { AuthSplitLayout } from '@/components/AuthLayout';
import { AuthInput, PasswordInput } from '@/components/AuthInput';
import { GradientButton } from '@/components/GradientButton';
import { useAuth } from '@/context/AuthContext';
import { getHomeRoute } from '@/utils/routing';
import { useSubmitOnEnter } from '@/hooks/useSubmitOnEnter';
import { colors, fonts } from '@/theme';

const REMEMBER_EMAIL_KEY = 'remember_email';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_EMAIL_KEY).then((saved) => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  // นำทางจากจุดเดียว — ไม่ replace ซ้ำหลัง login
  useEffect(() => {
    if (loading || !user || redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(getHomeRoute(user.role));
  }, [user, loading, router]);

  const handleLogin = useCallback(async () => {
    if (inFlightRef.current || submitting) return;
    setError('');
    if (!email.trim() || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);

      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      } else {
        await AsyncStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      // รอ useEffect นำทางเมื่อ user พร้อม — กันฟอร์มกระพริบ
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เข้าสู่ระบบไม่สำเร็จ');
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [email, password, rememberMe, login, submitting]);

  useSubmitOnEnter(handleLogin, !submitting && !user);

  if (loading || user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.shellBg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthSplitLayout>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.primary, marginBottom: 4 }}>
        ยินดีต้อนรับกลับ!
      </Text>
      <Text style={{ fontFamily: fonts.bold, fontSize: 28, color: colors.text, marginBottom: 6 }}>
        เข้าสู่ระบบ
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginBottom: 28 }}>
        กรุณาเข้าสู่ระบบเพื่อใช้งานต่อ
      </Text>

      {error ? (
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.regular, fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      <AuthInput
        label="อีเมล"
        icon="mail-outline"
        placeholder="example@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        returnKeyType="next"
      />

      <PasswordInput
        label="รหัสผ่าน"
        placeholder="กรอกรหัสผ่าน"
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            opacity: pressed ? 0.85 : 1,
            cursor: 'pointer' as const,
            flexShrink: 1,
          })}
          onPress={() => setRememberMe((v) => !v)}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              borderWidth: 1.5,
              borderColor: rememberMe ? colors.primary : colors.border,
              backgroundColor: rememberMe ? colors.primary : colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            {rememberMe ? <Text style={{ color: '#fff', fontSize: 11, fontFamily: fonts.bold }}>✓</Text> : null}
          </View>
          <Text style={{ fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted }}>จดจำฉัน</Text>
        </Pressable>

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              cursor: 'pointer' as const,
              paddingVertical: 4,
            })}
          >
            <Text style={{ fontSize: 13, fontFamily: fonts.semibold, color: colors.link }}>ลืมรหัสผ่าน?</Text>
          </Pressable>
        </Link>
      </View>

      <GradientButton label="เข้าสู่ระบบ" icon="arrow-forward" onPress={handleLogin} loading={submitting} disabled={submitting} />

      <Link href="/(auth)/register" asChild>
        <Pressable
          style={({ pressed }) => ({
            marginTop: 28,
            opacity: pressed ? 0.8 : 1,
            cursor: 'pointer' as const,
          })}
        >
          <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 14 }}>
            <Text style={{ color: colors.textMuted }}>ยังไม่มีบัญชีใช่ไหม? </Text>
            <Text style={{ color: colors.link, fontFamily: fonts.bold }}>สมัครสมาชิก</Text>
          </Text>
        </Pressable>
      </Link>
    </AuthSplitLayout>
  );
}
