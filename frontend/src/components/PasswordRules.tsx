import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PASSWORD_RULES } from '@/constants/auth';
import { colors, fonts } from '@/theme';

interface PasswordRulesProps {
  password: string;
  /** อีเมลของผู้ใช้ — ใช้ตรวจว่ารหัสผ่านไม่มีอีเมลอยู่ข้างใน */
  email?: string;
  style?: object;
}

/** รายการเงื่อนไขรหัสผ่าน — ติ๊กถูกทีละข้อขณะพิมพ์ */
export function PasswordRules({ password, email, style }: PasswordRulesProps) {
  return (
    <View style={[{ marginTop: -8, marginBottom: 16, gap: 6 }, style]}>
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password, email);
        return (
          <View key={rule.key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                marginTop: 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: passed ? colors.success : colors.border,
              }}
            >
              {passed ? <Ionicons name="checkmark" size={11} color="#fff" /> : null}
            </View>
            <Text
              style={{
                flex: 1,
                fontFamily: fonts.regular,
                fontSize: 12,
                lineHeight: 18,
                color: passed ? colors.success : colors.textMuted,
              }}
            >
              {rule.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
