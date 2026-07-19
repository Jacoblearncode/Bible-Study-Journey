import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** Lifts a card off the background with a soft shadow — use for tappable
   * or info cards (stats, posts, forms), not for large flat sections. */
  elevated?: boolean;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  elevated,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        { backgroundColor: theme[type ?? 'background'] },
        elevated && styles.elevated,
        style,
      ]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
});
