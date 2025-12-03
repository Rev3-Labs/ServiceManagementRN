import {Dimensions, ScaledSize, PixelRatio} from 'react-native';

const {width, height}: ScaledSize = Dimensions.get('window');
const pixelRatio = PixelRatio.get();

// Zebra ET40/ET45 10" tablet specifications
// Physical resolution: 1920 x 1200 pixels
// Pixel density: ~224 PPI
// Typical pixel ratio: 1.5x
// Logical resolution (React Native): ~1280 x 800 dp
const ZEBRA_10_INCH_LOGICAL_WIDTH = 1280;  // dp (density-independent pixels)
const ZEBRA_10_INCH_LOGICAL_HEIGHT = 800;  // dp
const ZEBRA_10_INCH_PHYSICAL_WIDTH = 1920; // actual pixels
const ZEBRA_10_INCH_PHYSICAL_HEIGHT = 1200; // actual pixels
const ZEBRA_PIXEL_RATIO = 1.5;

export const isTablet = (): boolean => {
  return width >= 768;
};

export const isZebraTablet = (): boolean => {
  // Check if dimensions match typical Zebra 10" tablet (logical pixels)
  // Allow some tolerance for different configurations
  return width >= 1000 && width <= 1400 && pixelRatio >= 1.4 && pixelRatio <= 2.0;
};

export const isLandscape = (): boolean => {
  return width > height;
};

export const getScreenDimensions = () => {
  return {
    width,
    height,
    pixelRatio,
    physicalWidth: width * pixelRatio,
    physicalHeight: height * pixelRatio,
  };
};

export const getResponsiveValue = <T,>(tablet: T, mobile: T): T => {
  return isTablet() ? tablet : mobile;
};

export const getGridColumns = (): number => {
  // Based on logical width for Zebra tablet in landscape
  if (width >= 1200) return 4;
  if (width >= 1000) return 3;
  if (width >= 768) return 2;
  return 1;
};

// Scale a value based on screen width relative to Zebra tablet (using logical pixels)
export const scaleWidth = (size: number): number => {
  const scale = width / ZEBRA_10_INCH_LOGICAL_WIDTH;
  return Math.round(size * scale);
};

// Scale a value based on screen height relative to Zebra tablet (using logical pixels)
export const scaleHeight = (size: number): number => {
  const scale = height / ZEBRA_10_INCH_LOGICAL_HEIGHT;
  return Math.round(size * scale);
};

// Get font size that accounts for device pixel density
// React Native already handles pixel ratio, so we scale based on logical dimensions
export const scaleFontSize = (size: number): number => {
  const scale = width / ZEBRA_10_INCH_LOGICAL_WIDTH;
  const newSize = size * scale;
  // Ensure minimum readability - never go below 85% of intended size
  return Math.round(Math.max(newSize, size * 0.85));
};

// Calculate optimal sidebar width for master-detail layout
// Optimized for 1280dp logical width
export const getSidebarWidth = (): number => {
  if (width >= 1200) return 400;  // ~31% of screen
  if (width >= 1000) return 360;  // ~36% of screen  
  if (width >= 800) return 320;   // ~40% of screen
  return 280;
};

// Calculate optimal content panel width
export const getContentPanelWidth = (): number => {
  return width - getSidebarWidth() - 48; // Account for spacing
};

// Check if device supports comfortable two-column layout
export const supportsTwoColumnLayout = (): boolean => {
  return width >= 800;
};

// Get optimal card width for grid layouts
export const getCardWidth = (columns: number, gap: number = 18): number => {
  const availableWidth = width - (gap * (columns + 1));
  return Math.floor(availableWidth / columns);
};

// Determine if we should show compact or expanded UI elements
export const useCompactMode = (): boolean => {
  return height < 700; // Adjusted for logical pixels
};

// Get optimal modal width for Zebra tablet
export const getModalWidth = (): number => {
  if (width >= 1200) return 560;
  if (width >= 1000) return 480;
  return Math.min(width - 48, 400);
};

// Calculate touch-friendly row height (in dp)
// These values work well at 224 PPI with 1.5x pixel ratio
export const getRowHeight = (comfortable: boolean = true): number => {
  return comfortable ? 64 : 56;
};

// Get physical pixels for a given dp value (useful for debugging)
export const dpToPixels = (dp: number): number => {
  return Math.round(dp * pixelRatio);
};

// Check if we're running on a high-density display
export const isHighDensity = (): boolean => {
  return pixelRatio >= 2;
};

// Get device info for debugging
export const getDeviceInfo = () => {
  return {
    logicalWidth: width,
    logicalHeight: height,
    pixelRatio,
    physicalWidth: Math.round(width * pixelRatio),
    physicalHeight: Math.round(height * pixelRatio),
    isTablet: isTablet(),
    isZebraTablet: isZebraTablet(),
    isLandscape: isLandscape(),
    estimatedPPI: Math.round(Math.sqrt(
      Math.pow(width * pixelRatio, 2) + Math.pow(height * pixelRatio, 2)
    ) / 10.1), // Assuming 10.1" diagonal
  };
};
