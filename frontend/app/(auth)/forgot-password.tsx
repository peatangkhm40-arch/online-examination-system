import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthCenterLayout } from '@/components/AuthLayout';
import { AuthInput, PasswordInput } from '@/components/AuthInput';
import { GradientButton } from '@/components/GradientButton';
import { SelectField } from '@/components/SelectField';
import { isValidPassword, PASSWORD_RULES_MESSAGE } from '@/constants/auth';
import { GRADE_LEVEL_OPTIONS } from '@/constants/gradeLevels';
import { api } from '@/lib/api';
import { colors, fonts } from '@/theme';

type AccountKind = 'student' | 'staff';

const STUDENT_NUMBER_OPTIONS = Array.from({ length: 40 }, (_, i) => {
  const num = String(i + 1);
  return { label: num, value: num };
});

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<AccountKind>('student');
  const [email, setEmail] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError('');
    setSuccess('');
    if (!email.trim()) {
      setError('กรุณากรอกอีเมล');
      return;
    }
    if (kind === 'student') {
      if (!gradeLevel || !studentNumber) {
        setError('กรุณาเลือกระดับชั้นและเลขที่เพื่อยืนยันตัวตน');
        return;
      }
    } else if (!fullName.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุลตามในระบบ');
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_RULES_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.forgotPassword({
        email: email.trim().toLowerCase(),
        newPassword,
        confirmPassword,
        ...(kind === 'student'
          ? { gradeLevel, studentNumber: Number(studentNumber) }
          : { fullName: fullName.trim() }),
      });
      setSuccess(res.message);
      setTimeout(() => router.replace('/(auth)/login'), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }, [kind, email, gradeLevel, studentNumber, fullName, newPassword, confirmPassword, router]);

  return (
    <AuthCenterLayout>
      <Text style={{ fontFamily: fonts.bold, fontSize: 24, color: colors.text, textAlign: 'center', marginBottom: 4 }}>
        ลืมรหัสผ่าน
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 20 }}>
        ยืนยันตัวตนแล้วตั้งรหัสผ่านใหม่ได้ทันที
      </Text>

      {error ? (
        <View style={{ backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#fecaca' }}>
          <Text style={{ color: colors.danger, fontFamily: fonts.regular, fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={{ backgroundColor: '#ecfdf5', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#a7f3d0' }}>
          <Text style={{ color: colors.success, fontFamily: fonts.regular, fontSize: 14 }}>{success}</Text>
        </View>
      ) : null}

      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 8 }}>ประเภทบัญชี</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {(
          [
            { key: 'student' as const, label: 'นักเรียน' },
            { key: 'staff' as const, label: 'อาจารย์ / แอดมิน' },
          ] as const
        ).map((opt) => {
          const active = kind === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setKind(opt.key)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? colors.backgroundSoft : colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer' as const,
              }}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: active ? colors.primary : colors.textMuted }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AuthInput
        label="อีเมล"
        icon="mail-outline"
        placeholder="อีเมลที่ใช้สมัคร / ในระบบ"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      {kind === 'student' ? (
        <>
          <SelectField label="ระดับชั้น *" value={gradeLevel} options={GRADE_LEVEL_OPTIONS} onChange={setGradeLevel} />
          <SelectField
            label="เลขที่ *"
            value={studentNumber}
            options={STUDENT_NUMBER_OPTIONS}
            onChange={setStudentNumber}
          />
        </>
      ) : (
        <AuthInput
          label="ชื่อ-นามสกุล ตามในระบบ"
          icon="person-outline"
          required
          placeholder="เช่น ครูกัญญา ผัดไทย"
          value={fullName}
          onChangeText={setFullName}
        />
      )}

      <PasswordInput label="รหัสผ่านใหม่" required value={newPassword} onChangeText={setNewPassword} />
      <PasswordInput label="ยืนยันรหัสผ่านใหม่" required value={confirmPassword} onChangeText={setConfirmPassword} />
      <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
        {PASSWORD_RULES_MESSAGE}
      </Text>

      <GradientButton label="ตั้งรหัสผ่านใหม่" icon="key-outline" onPress={handleSubmit} loading={submitting} disabled={submitting || !!success} />

      <Link href="/(auth)/login" asChild>
        <Pressable
          style={({ pressed }) => ({
            marginTop: 20,
            opacity: pressed ? 0.8 : 1,
            cursor: 'pointer' as const,
          })}
        >
          <Text style={{ textAlign: 'center', fontFamily: fonts.regular, fontSize: 14 }}>
            <Text style={{ color: colors.textMuted }}>จำรหัสได้แล้ว? </Text>
            <Text style={{ color: colors.link, fontFamily: fonts.bold }}>กลับไปเข้าสู่ระบบ</Text>
          </Text>
        </Pressable>
      </Link>
    </AuthCenterLayout>
  );
}
