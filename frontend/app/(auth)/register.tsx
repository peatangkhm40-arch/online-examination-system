import { useState, useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthCenterLayout } from '@/components/AuthLayout';
import { AuthInput, PasswordInput } from '@/components/AuthInput';
import { GradientButton, OutlineButton } from '@/components/GradientButton';
import { PasswordRules } from '@/components/PasswordRules';
import { SelectField } from '@/components/SelectField';
import { isValidPassword, PASSWORD_RULES, PASSWORD_RULES_MESSAGE } from '@/constants/auth';
import { YEAR_OPTIONS, ROOM_OPTIONS, buildGradeLevel } from '@/constants/gradeLevels';
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

function getPasswordStrength(pw: string, email: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: colors.border, width: '0%' };
  const passed = PASSWORD_RULES.filter((rule) => rule.test(pw, email)).length;
  const width = `${Math.round((passed / PASSWORD_RULES.length) * 100)}%`;
  if (passed <= 1) return { label: 'อ่อน', color: colors.danger, width };
  if (passed < PASSWORD_RULES.length) return { label: 'พอใช้', color: colors.warning, width };
  return { label: 'แข็งแรง', color: colors.success, width };
}

export default function RegisterScreen() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const { isMobile } = useResponsiveLayout();
  const redirectedRef = useRef(false);

  const [prefix, setPrefix] = useState<TitlePrefix>('MR');
  const [yearLevel, setYearLevel] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const gradeLevel = yearLevel && roomNumber ? buildGradeLevel(yearLevel, roomNumber) : '';

  const strength = getPasswordStrength(password, email);

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
    if (!yearLevel) return 'กรุณาเลือกระดับชั้น';
    if (!roomNumber) return 'กรุณาเลือกห้อง (1–10)';
    if (!studentNumber) return 'กรุณาเลือกเลขที่';
    if (!isValidPassword(password, email)) return PASSWORD_RULES_MESSAGE;
    if (password !== confirmPassword) return 'รหัสผ่านไม่ตรงกัน กรุณากรอกใหม่อีกครั้ง';
    return null;
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // เมื่ออีเมลผ่าน regex แล้ว ให้ซ่อนกล่องแดงทันที
    if (validateStudentEmail(value) === null) {
      setError((prev) =>
        prev === STUDENT_EMAIL_FORMAT_ERROR || prev === 'กรุณากรอกอีเมล' ? '' : prev
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
      const registered = await register({
        prefix,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizeEmail(email),
        password,
        gradeLevel,
        studentNumber: Number(studentNumber),
      });
      setSuccess(
        registered.isCollegeVerified
          ? 'ลงทะเบียนสำเร็จ! อีเมลวิทยาลัยพร้อมใช้งาน — กำลังเข้าสู่ระบบ...'
          : 'ลงทะเบียนสำเร็จ! ใช้อีเมลนี้เข้าสู่ระบบได้ รอแอดมินยืนยันก่อนเข้าสอบ...'
      );
      // รอ useEffect นำทางเมื่อ user พร้อม — กันฟอร์มกระพริบ
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
      setSubmitting(false);
    }
  }, [prefix, firstName, lastName, email, password, confirmPassword, yearLevel, roomNumber, gradeLevel, studentNumber, register]);

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
          <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12, alignItems: 'stretch', width: '100%' }}>
            <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined, minWidth: 0 }}>
              <AuthInput
                label="ชื่อ"
                icon="person-outline"
                required
                placeholder="ชื่อจริง"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? '100%' : undefined, minWidth: 0 }}>
              <AuthInput label="นามสกุล" required placeholder="นามสกุล" value={lastName} onChangeText={setLastName} />
            </View>
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
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
          <View style={{ flex: 1, minWidth: 140, flexBasis: 140 }}>
            <AuthInput
              label="ชื่อ"
              icon="person-outline"
              required
              placeholder="ชื่อจริง"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View style={{ flex: 1, minWidth: 140, flexBasis: 140 }}>
            <AuthInput label="นามสกุล" required placeholder="นามสกุล" value={lastName} onChangeText={setLastName} />
          </View>
        </View>
      )}

      <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
            ระดับชั้น <Text style={{ color: colors.danger }}>*</Text>
          </Text>
          <SelectField
            hideLabel
            label="ระดับชั้น"
            value={yearLevel}
            options={YEAR_OPTIONS}
            onChange={setYearLevel}
            placeholder="เช่น ปวช. 1"
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
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
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
          ห้อง <Text style={{ color: colors.danger }}>*</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}> (สูงสุด 10 ห้อง)</Text>
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROOM_OPTIONS.map((room) => {
            const selected = roomNumber === room.value;
            return (
              <Pressable
                key={room.value}
                onPress={() => setRoomNumber(room.value)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 40,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.backgroundSoft : colors.inputBg,
                  opacity: pressed ? 0.85 : 1,
                  cursor: 'pointer' as const,
                })}
              >
                <Text
                  style={{
                    fontFamily: fonts.semibold,
                    fontSize: 14,
                    color: selected ? colors.primary : colors.text,
                  }}
                >
                  {room.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <PasswordInput label="รหัสผ่านใหม่" required placeholder="ตั้งรหัสผ่าน" value={password} onChangeText={setPassword} />
      <PasswordRules password={password} email={email} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: strength.width as `${number}%`, backgroundColor: strength.color, borderRadius: 2 }} />
        </View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: strength.color }}>
          {password.length > 0 ? strength.label : 'เงื่อนไขรหัสผ่าน'}
        </Text>
      </View>

      <PasswordInput
        label="ยืนยันรหัสผ่านใหม่"
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
