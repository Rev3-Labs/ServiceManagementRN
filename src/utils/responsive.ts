import {Dimensions, ScaledSize} from 'react-native';

const {width, height}: ScaledSize = Dimensions.get('window');

export const isTablet = (): boolean => {
  return width >= 768;
};

export const isLandscape = (): boolean => {
  return width > height;
};

export const getScreenDimensions = () => {
  return {width, height};
};

export const getResponsiveValue = <T,>(tablet: T, mobile: T): T => {
  return isTablet() ? tablet : mobile;
};

export const getGridColumns = (): number => {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
};

