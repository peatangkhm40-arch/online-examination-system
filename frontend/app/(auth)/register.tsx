import { useState, useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthCenterLayout } from '@/components/AuthLayout';
import { AuthInput, PasswordInput } from '@/components/AuthInput';
import { GradientButton, OutlineButton } from '@/components/GradientButton';
import { SelectField } from '@/components/SelectField';
import { isValidPassword, PASSWORD_RULES_MESSAGE } from '@/constants/auth';
import { GRADE_LEVEL_OPTIONS } from '@/constants/gradeLevels';
import { useAuth } from '@/context/AuthContext';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useSubmitOnEnter } from '@/hooks/useSubmitOnEnter';
import type { TitlePrefix } from '@/types';
import { colors, fonts } from '@/theme';
import { getHomeRoute } from '@/utils/routing';
import { STUDENT_EMAIL_HINT, STUDENT_EMAIL_FORMAT_ERROR, validateStudentEmail, normalizeEmail } from '@/utils/emailPolicy';

const PREFIX_OPTIONS: { label: string; value: TitlePrefix }[] = [
  { label: 'นาย', value: 'MR' },
  { label: 'นางสาว', value: 'MISS' },
  { label: 'นาง', value: 'MRS' },
];

const STUDENT_NUMBER_OPTIONS = Array.from({ length: 40 }, (_, i) => {
  const num = String(i + 1);
  return { label: num, value: num };
});

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: colors.border, width: '0%' };
  if (pw.length < 6) return { label: 'อ่อน', color: colors.danger, width: '25%' };
  if (!isValidPassword(pw)) return { label: 'ปานกลาง', color: colors.warning, width: '55%' };
  return { label: 'แข็งแรง', color: colors.success, width: '100%' };
}

export default function RegisterScreen() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const { isMobile } = useResponsiveLayout();
  const redirectedRef = useRef(false);

  const [prefix, setPrefix] = useState<TitlePrefix>('MR');
  const [gradeLevel, setGradeLevel] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (loading || !user || redirectedRef.current) return;
    redirectedRef.current = true;
    router.replace(getHomeRoute(user.role));
  }, [user, loading, router]);

  const validateForm = (): string | null => {
    if (!email.trim()) return 'กรุณากรอกอีเมล';
    const emailError = validateStudentEmail(email);
    if (emailError) return emailError;
    if (!firstName.trim()) return 'กรุณากรอกชื่อ';
    if (!lastName.trim()) return 'กรุณากรอกนามสกุล';
    if (!gradeLevel) return 'กรุณาเลือกระดับชั้น';
    if (!studentNumber) return 'กรุณาเลือกเลขที่';
    if (!isValidPassword(password)) return PASSWORD_RULES_MESSAGE;
    if (password !== confirmPassword) return 'รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง';
    return null;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // เมื่ออีเมลผ่าน regex แล้ว ให้ซ่อนกล่องแดงทันที
    if (validateStudentEmail(value) === null) {
      setError((prev) =>
        prev === STUDENT_EMAIL_FORMAT_ERROR || prev === 'กรุณากรอกอีเมล' || prev.includes('OTP') ? '' : prev
      );
    }
  };

  const handleRegister = useCallback(async () => {
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        prefix,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizeEmail(email),
        password,
        gradeLevel,
        studentNumber: Number(studentNumber),
      });
      setSuccess('ลงทะเบียนสำเร็จ! กำลังเข้าสู่ระบบ...');
      // รอ useEffect นำทางเมื่อ user พร้อม — กันฟอร์มกระพริบ
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
      setSubmitting(false);
    }
  }, [prefix, firstName, lastName, email, password, confirmPassword, gradeLevel, studentNumber, register]);

  useSubmitOnEnter(handleRegister, !submitting && !success && !user);

  if (loading || user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.shellBg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthCenterLayout>
      <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 4 }}>
        สร้างบัญชีนักเรียน
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24 }}>
        เริ่มต้นการเดินทางครั้งใหม่ไปกับเรา
      </Text>

      {error ? (
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={{ backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#a7f3d0' }}>
          <Text style={{ color: colors.success, fontFamily: fonts.medium, fontSize: 14, textAlign: 'center' }}>{success}</Text>
        </View>
      ) : null}

      <AuthInput
        label="อีเมล"
        icon="mail-outline"
        required
        placeholder="กรอกอีเมลจริงของตนเอง"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={handleEmailChange}
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: -8, marginBottom: 16 }}>
        {STUDENT_EMAIL_HINT}
      </Text>

      {isMobile ? (
        <>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
              คำนำหน้า <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <SelectField
              hideLabel
              label="คำนำหน้าชื่อ"
              value={prefix}
              options={PREFIX_OPTIONS}
              onChange={(v) => setPrefix(v as TitlePrefix)}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AuthInput
                label="ชื่อ"
                icon="person-outline"
                required
                placeholder="ชื่อจริง"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AuthInput label="นามสกุล" required placeholder="นามสกุล" value={lastName} onChangeText={setLastName} />
            </View>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 0 }}>
          <View style={{ width: 120, flexShrink: 0 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
              คำนำหน้า <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <SelectField
              hideLabel
              label="คำนำหน้าชื่อ"
              value={prefix}
              options={PREFIX_OPTIONS}
              onChange={(v) => setPrefix(v as TitlePrefix)}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AuthInput
              label="ชื่อ"
              icon="person-outline"
              required
              placeholder="ชื่อจริง"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AuthInput label="นามสกุล" required placeholder="นามสกุล" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
      )}

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
          ระดับชั้น <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <SelectField
          hideLabel
          label="ระดับชั้น"
          value={gradeLevel}
          options={GRADE_LEVEL_OPTIONS}
          onChange={setGradeLevel}
          placeholder="เลือกระดับชั้น"
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
          เลขที่ <Text style={{ color: colors.danger }}>*</Text>
        </Text>
        <SelectField
          hideLabel
          label="เลขที่"
          value={studentNumber}
          options={STUDENT_NUMBER_OPTIONS}
          onChange={setStudentNumber}
          placeholder="เลือก"
        />
      </View>

      <PasswordInput label="รหัสผ่าน" required placeholder="อย่างน้อย 8 ตัว มีตัวอักษรและตัวเลข" value={password} onChangeText={setPassword} />
      {password.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: 12 }}>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: strength.width as `${number}%`, backgroundColor: strength.color, borderRadius: 2 }} />
          </View>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: strength.color }}>{strength.label}</Text>
        </View>
      ) : null}

      <PasswordInput
        label="ยืนยันรหัสผ่าน"
        required
        placeholder="กรอกรหัสผ่านอีกครั้ง"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <View style={{ flex: 1 }}>
          <GradientButton label="ลงทะเบียน" icon="arrow-forward" onPress={handleRegister} loading={submitting} disabled={submitting || !!success} />
        </View>
        <View style={{ flex: 0.4 }}>
          <OutlineButton label="ยกเลิก" onPress={() => router.replace('/(auth)/login')} disabled={submitting} />
        </View>
      </View>

      <Link href="/(auth)/login" asChild>
        <Pressable
          style={({ pressed }) => ({
            marginTop: 20,
            opacity: pressed ? 0.8 : 1,
            cursor: 'pointer' as const,
          })}
        >
          <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 14 }}>
            <Text style={{ color: colors.textMuted }}>มีบัญชีอยู่แล้ว? </Text>
            <Text style={{ color: colors.link, fontFamily: fonts.bold }}>เข้าสู่ระบบ</Text>
          </Text>
        </Pressable>
      </Link>
    </AuthCenterLayout>
  );
}
