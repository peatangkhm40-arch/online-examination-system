import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '@/theme';

interface SelectFieldProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  hideLabel?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  hideLabel,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={hideLabel ? undefined : { marginBottom: 12 }}>
      {hideLabel ? null : (
        <Text style={{ fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, marginBottom: 6 }}>
          {label}
        </Text>
      )}
      <Pressable
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: 12,
          backgroundColor: colors.inputBg,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
        onPress={() => setOpen(true)}
      >
        <Text
          style={{
            flex: 1,
            color: selected ? colors.text : colors.textMuted,
            fontSize: 15,
            fontFamily: fonts.regular,
          }}
        >
          {selected?.label ?? placeholder ?? 'เลือก...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              maxHeight: 360,
              padding: 8,
              maxWidth: 420,
              width: '100%',
              alignSelf: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 17, fontFamily: fonts.semibold, padding: 12, color: colors.text }}>
              {label}
            </Text>
            <ScrollView>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    backgroundColor: option.value === value ? colors.backgroundSoft : 'transparent',
                  }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Text style={{ fontSize: 15, fontFamily: fonts.regular, color: colors.text }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
