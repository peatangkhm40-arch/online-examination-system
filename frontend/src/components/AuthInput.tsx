import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme';

/** กันสี autofill ของเบราว์เซอร์ทำให้ช่องกรอกสีไม่เท่ากัน */
const inputFieldStyle = {
  flex: 1,
  paddingVertical: 13,
  fontSize: 15,
  fontFamily: fonts.regular,
  color: colors.text,
  backgroundColor: colors.inputBg,
  outlineStyle: 'none' as const,
  ...(Platform.OS === 'web'
    ? ({
        // RN Web / Chromium autofill
        WebkitBoxShadow: `0 0 0 1000px ${colors.inputBg} inset`,
        WebkitTextFillColor: colors.text,
        transition: 'background-color 9999s ease-out 0s',
      } as object)
    : null),
};

interface AuthInputProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
}

export function AuthInput({ label, icon, required, style, ...props }: AuthInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: focused ? colors.primary : colors.border,
          borderRadius: 12,
          backgroundColor: colors.inputBg,
          paddingHorizontal: 14,
          minHeight: 48,
        }}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
        ) : null}
        <TextInput
          {...props}
          style={[inputFieldStyle, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
      </View>
    </View>
  );
}

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  label: string;
  required?: boolean;
}

export function PasswordInput({ label, required, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const [eyeHovered, setEyeHovered] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 8 }}>
        {label}
        {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor: focused ? colors.primary : colors.border,
          borderRadius: 12,
          backgroundColor: colors.inputBg,
          paddingHorizontal: 14,
          minHeight: 48,
        }}
      >
        <Ionicons name="lock-closed-outline" size={18} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: 10 }} />
        <TextInput
          {...props}
          secureTextEntry={!visible}
          style={inputFieldStyle}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          onSubmitEditing={props.onSubmitEditing}
          returnKeyType={props.returnKeyType ?? 'done'}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          onHoverIn={() => setEyeHovered(true)}
          onHoverOut={() => setEyeHovered(false)}
          hitSlop={8}
          accessibilityLabel={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
          style={{
            padding: 4,
            borderRadius: 8,
            backgroundColor: eyeHovered ? colors.backgroundSoft : 'transparent',
            cursor: 'pointer' as const,
          }}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={eyeHovered ? colors.primary : colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
  );
}
