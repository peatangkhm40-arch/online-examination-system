import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  onPress?: () => void;
}

function withAlpha(hex: string, alpha: number) {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export function StatCard({ title, value, icon, accent = colors.primary, onPress }: StatCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 220,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 18,
        paddingHorizontal: 18,
        opacity: pressed && onPress ? 0.92 : 1,
        transform: pressed && onPress ? [{ scale: 0.99 }] : undefined,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: withAlpha(accent, 0.12),
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={26} color={accent} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 30, color: colors.text, lineHeight: 34 }}>{value}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>
          {title}
        </Text>
        {onPress ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: accent }}>ดูรายละเอียด</Text>
            <Ionicons name="chevron-forward" size={14} color={accent} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}
