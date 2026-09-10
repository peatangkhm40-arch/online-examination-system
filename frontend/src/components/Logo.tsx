import { Image, View, Text } from 'react-native';
import { APP_NAME } from '@/constants/app';
import { colors, fonts } from '@/theme';

const LOGO_SOURCE = require('../../assets/logo.png');

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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 4,
          flexShrink: 0,
        }}
      >
        <Image
          source={LOGO_SOURCE}
          resizeMode="contain"
          accessibilityLabel={APP_NAME}
          style={{ width: box * 0.82, height: box * 0.82 }}
        />
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
