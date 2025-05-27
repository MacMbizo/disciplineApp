// c:\A23\DisApp1\src\config\theme.ts

export const Colors = {
  primary: '#1E5BBC', // Royal Blue
  primaryLight: '#dbeafe',
  primaryUltraLight: '#eff6ff',
  primaryDark: '#1e3a8a',

  secondary: '#9ca3af', // Medium Gray

  white: '#ffffff',
  black: '#000000',

  lightGray: '#f3f4f6',
  mediumGray: '#9ca3af',
  darkGray: '#4b5563',
  dividerGray: '#e5e7eb',

  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444', // Used for critical metrics, alerts, and incident-related elements
  criticalAlert: '#dc2626', // Specifically for critical metrics like 'Students at Risk'

  // Text Colors
  textPrimary: '#1e3a8a', // Dark Blue for important text, headings
  textSecondary: '#4b5563', // Dark Gray for body text
  textMuted: '#9ca3af', // Medium Gray for secondary text/descriptions
  textLight: '#ffffff', // White text on dark backgrounds
  textLink: '#1E5BBC', // Blue for links
};

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  h5: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  button: {
    fontSize: 16,
    fontWeight: '500',
  },
  link: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLink,
  },
  // Specific text styles from design_v2.md
  largeHeadingWhite: {
    fontSize: 28, // 24-28px
    fontWeight: '700',
    color: Colors.white,
  },
  largeHeadingDark: {
    fontSize: 28, // 24-28px
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  sectionHeading: {
    fontSize: 20, // 18-22px
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  cardHeading: {
    fontSize: 17, // 16-18px
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  primaryBodyText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.darkGray,
  },
  secondaryBodyText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.mediumGray,
  },
  metadataText: {
    fontSize: 12.5, // 12-13px
    fontWeight: '400',
    color: Colors.mediumGray, // design_v2.md says light gray, but medium gray might be more readable
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600', // medium to semibold (500-600)
    color: Colors.white,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  inputText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.darkGray,
  },
};

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  horizontalPadding: 16,
  cardInternalPadding: 16,
  cardInternalPaddingLarge: 20,
  spaceBetweenCards: 16, // 16-24px
  headerHeight: 110, // 100-120px
  bottomNavHeight: 80, // Minimum bottom padding
};

export const Borders = {
  radiusSmall: 8,
  radiusMedium: 16, // Card radius
  radiusLarge: 24,
  borderWidth: 1,
  borderColor: Colors.dividerGray,
};

export const Shadows = {
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
};

const theme = {
  Colors,
  Typography,
  Spacing,
  Borders,
  Shadows,
};

export default theme;