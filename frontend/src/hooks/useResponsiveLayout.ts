import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();

  return useMemo(
    () => ({
      width,
      isMobile: width < 640,
      isTablet: width >= 640 && width < 1024,
      isDesktop: width >= 1024,
      columns: width >= 1024 ? 3 : width >= 640 ? 2 : 1,
      contentPadding: width < 640 ? 16 : 24,
      maxContentWidth: 1200,
    }),
    [width]
  );
}
