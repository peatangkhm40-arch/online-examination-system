import { useState } from 'react';
import { Pressable, Text, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, gradients } from '@/theme';

interface GradientButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function GradientButton({ label, onPress, disabled, loading, icon, style }: GradientButtonProps) {
  const [hovered, setHovered] = useState(false);
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        {
          opacity: inactive ? 0.6 : pressed ? 0.92 : 1,
          transform: [{ scale: !inactive && (pressed || hovered) ? 0.985 : 1 }],
          cursor: inactive ? ('default' as const) : ('pointer' as const),
        },
        style,
      ]}
    >
      <LinearGradient
        colors={hovered && !inactive ? [colors.primaryDark, colors.primary] : [...gradients.button]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 14,
          paddingHorizontal: 24,
          minHeight: 48,
          borderRadius: 12,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: hovered ? 8 : 4 },
          shadowOpacity: hovered ? 0.35 : 0.18,
          shadowRadius: hovered ? 16 : 10,
          elevation: hovered ? 6 : 3,
        }}
      >
        <Text style={{ color: '#fff', fontFamily: fonts.semibold, fontSize: 15 }}>
          {loading ? 'กำลังดำเนินการ...' : label}
        </Text>
        {icon && !loading ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      </LinearGradient>
    </Pressable>
  );
}

interface OutlineButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  style?: ViewStyle;
}

export function OutlineButton({ label, onPress, disabled, color = colors.danger, style }: OutlineButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        {
          paddingVertical: 14,
          paddingHorizontal: 24,
          minHeight: 48,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: hovered || pressed ? `${color}12` : 'transparent',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? ('default' as const) : ('pointer' as const),
        },
        style,
      ]}
    >
      <Text style={{ color, fontFamily: fonts.semibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}
