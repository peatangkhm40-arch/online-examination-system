import { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { commonStyles } from '@/theme';

interface FormRowProps {
  label: string;
  children: ReactNode;
  required?: boolean;
}

export function FormRow({ label, children, required }: FormRowProps) {
  return (
    <View style={commonStyles.formRow}>
      <Text style={commonStyles.formLabel}>
        {label}
        {required ? <Text style={commonStyles.requiredMark}> *</Text> : null}
      </Text>
      <View style={commonStyles.formField}>{children}</View>
    </View>
  );
}
