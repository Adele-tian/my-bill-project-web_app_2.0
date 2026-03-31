/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// 智能记账APP主题色
const tintColorLight = '#FF4F93';
const tintColorDark = '#FF8AB5';

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#7C6B75',
    background: '#FFF7FB',
    card: '#FFFFFF',
    tint: tintColorLight,
    icon: '#8E7E88',
    tabIconDefault: '#C8B6C1',
    tabIconSelected: tintColorLight,
    // 记账APP专用色
    primary: '#FF4F93',
    primaryLight: '#FFE5F0',
    income: '#57C084',
    expense: '#FF6C84',
    gradient: ['#FFD0E3', '#FFB8D5', '#FF8FBC'],
    cardGradient: ['#FFD6E7', '#FFB6D3', '#FF8FBC'],
    border: '#F2D9E5',
    softBackground: '#FEEAF3',
    headerButtonBackground: '#FCE7F1',
    headerButtonBorder: '#F6D9E6',
    surfaceElevated: '#FFFFFF',
    surfaceMuted: '#FBE5EF',
    fabShadow: '#D54A83',
    fabHaloInner: 'rgba(255, 79, 147, 0.18)',
    fabHaloOuter: 'rgba(255, 79, 147, 0.08)',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#151718',
    card: '#1E2022',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#5A6068',
    tabIconSelected: tintColorDark,
    // 记账APP专用色
    primary: '#FF8AB5',
    primaryLight: '#3D2A3A',
    income: '#66BB6A',
    expense: '#FF7043',
    gradient: ['#A78BFA', '#60A5FA', '#34D399'],
    cardGradient: ['#C084FC', '#818CF8', '#60A5FA'],
    border: '#2C3035',
    softBackground: '#241B22',
    headerButtonBackground: '#241B22',
    headerButtonBorder: '#3A3037',
    surfaceElevated: '#201920',
    surfaceMuted: '#241B22',
    fabShadow: '#000000',
    fabHaloInner: 'rgba(255, 138, 181, 0.16)',
    fabHaloOuter: 'rgba(255, 138, 181, 0.07)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
