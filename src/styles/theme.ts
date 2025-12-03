// Theme optimized for 10-inch Zebra rugged tablets (ET40/ET45)
// Physical resolution: 1920 x 1200 pixels
// Pixel density: ~224 PPI
// Pixel ratio: 1.5x (logical resolution: ~1280 x 800 dp)
// Considerations: gloved hands, outdoor visibility, industrial use

export const colors = {
  primary: '#65B230',
  primaryForeground: '#ffffff',
  background: '#f9fafb',
  foreground: '#111827',
  card: '#ffffff',
  cardForeground: '#111827',
  border: '#9ca3af', // Darker for better visibility outdoors
  input: '#9ca3af',
  inputBackground: '#ffffff',
  muted: '#f3f4f6',
  mutedForeground: '#4b5563', // Darker for better outdoor readability
  secondary: '#e5e7eb', // Darker for contrast
  secondaryForeground: '#1f2937',
  destructive: '#dc2626',
  destructiveForeground: '#ffffff',
  success: '#059669', // Darker green for visibility
  warning: '#d97706',
  info: '#2563eb',
};

// Spacing in density-independent pixels (dp)
// At 1.5x pixel ratio, these translate to physical pixels:
// xs: 6dp = 9px, sm: 10dp = 15px, md: 18dp = 27px, etc.
export const spacing = {
  xs: 6,
  sm: 10,
  md: 18,
  lg: 28,
  xl: 40,
  xxl: 56,
};

// Typography sized for outdoor/industrial readability at 224 PPI
// Font sizes are in dp (density-independent pixels)
// At 1.5x ratio: 19dp base = 28.5 physical pixels = ~8pt apparent size
export const typography = {
  xs: {fontSize: 15, lineHeight: 22},   // Labels, captions
  sm: {fontSize: 17, lineHeight: 26},   // Secondary text
  base: {fontSize: 19, lineHeight: 29}, // Body text
  lg: {fontSize: 22, lineHeight: 33},   // Subheadings
  xl: {fontSize: 26, lineHeight: 39},   // Headings
  '2xl': {fontSize: 32, lineHeight: 48}, // Large headings
  '3xl': {fontSize: 40, lineHeight: 60}, // Hero text
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

// Touch targets sized for gloved/industrial use
// Values in dp - at 1.5x ratio these become:
// min: 48dp = 72px physical, comfortable: 56dp = 84px, etc.
// WCAG recommends 44dp minimum; for gloves we use larger
export const touchTargets = {
  min: 48,        // Minimum (72px physical at 1.5x)
  comfortable: 56, // Standard (84px physical at 1.5x)
  large: 68,       // Primary actions (102px physical at 1.5x)
  xlarge: 80,      // Critical actions (120px physical at 1.5x)
};

// Zebra ET40/ET45 10-inch tablet specifications
export const zebraTablet = {
  // Physical specifications
  physicalWidth: 1920,     // Physical pixels (landscape)
  physicalHeight: 1200,    // Physical pixels (landscape)
  pixelRatio: 1.5,         // Typical density ratio
  ppi: 224,                // Pixels per inch
  screenDiagonal: 10.1,    // Inches
  
  // Logical dimensions (what React Native uses)
  logicalWidth: 1280,      // dp (landscape)
  logicalHeight: 800,      // dp (landscape)
  
  // UI recommendations
  safeAreaPadding: 16,     // Edge padding for case/bezel
  minTouchGap: 12,         // Minimum gap between touch targets
  optimalSidebarWidth: 360, // For master-detail layouts
  optimalContentWidth: 880, // Remaining content area
};

// High contrast mode for bright outdoor conditions
export const highContrastColors = {
  primary: '#4A8F1F',      // Darker green
  background: '#ffffff',
  foreground: '#000000',
  border: '#666666',
  mutedForeground: '#333333',
};
