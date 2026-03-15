/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ThemePalette = typeof Colors.light;
type ThemeColorName = {
  [Key in keyof ThemePalette]: ThemePalette[Key] extends string ? Key : never;
}[keyof ThemePalette];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ThemeColorName
): string {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}
