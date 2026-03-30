import { Platform } from 'react-native';

/**
 * Cross-platform card shadow.
 * On native: uses React Native shadow props + elevation.
 * On web: uses boxShadow (react-native-web compatible).
 */
export const cardShadow = Platform.select({
  web: {
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.08)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});

export const cardShadowMd = Platform.select({
  web: {
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.10)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
});

export const cardShadowLg = Platform.select({
  web: {
    boxShadow: '0px 3px 12px rgba(0, 0, 0, 0.16)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
  },
});
