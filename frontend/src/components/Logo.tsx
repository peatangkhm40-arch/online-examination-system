import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { APP_NAME } from '@/constants/app';
import { colors, fonts, gradients } from '@/theme';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
  showText?: boolean;
}

const SIZES = { sm: 40, md: 52, lg: 64 };

const TEXT_SIZES = {
  sm: { title: 11, lineHeight: 15, maxWidth: 160 },
  md: { title: 13, lineHeight: 18, maxWidth: 200 },
  lg: { title: 15, lineHeight: 22, maxWidth: 280 },
};

export function Logo({ size = 'md', variant = 'dark', showText = true }: LogoProps) {
  const box = SIZES[size];
  const textColor = variant === 'light' ? '#fff' : colors.text;
  const textStyle = TEXT_SIZES[size];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View
        style={{
          width: box,
          height: box,
          borderRadius: box * 0.28,
          overflow: 'hidden',
          shadowColor: '#7c3aed',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
          flexShrink: 0,
        }}
      >
        <LinearGradient
          colors={[...gradients.button]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="shield-checkmark" size={box * 0.46} color="#fff" />
        </LinearGradient>
      </View>
      {showText ? (
        <View style={{ flex: 1, maxWidth: textStyle.maxWidth }}>
          <Text
            style={{
              fontFamily: fonts.bold,
              fontSize: textStyle.title,
              lineHeight: textStyle.lineHeight,
              color: textColor,
            }}
          >
            {APP_NAME}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
