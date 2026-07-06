/**
 * U.S. DOT hazardous materials label/placard colors per 49 CFR § 172.407(d)(5).
 * Hex values are screen approximations of the regulated PANTONE® Uncoated standards.
 */
export const DOT_HAZARD_COLORS = {
  /** PANTONE® 186 U — flammable gas, flammable liquid */
  red: '#C8102E',
  /** PANTONE® 151 U — explosives */
  orange: '#FF8200',
  /** PANTONE® 109 U — oxidizer */
  yellow: '#FFD100',
  /** PANTONE® 335 U — non-flammable gas */
  green: '#009639',
  /** PANTONE® 285 U — dangerous when wet */
  blue: '#0072CE',
  /** PANTONE® 259 U — specialized hazards */
  purple: '#702878',
  /** Fluorescent orange used on biohazard / infectious waste labels */
  biohazardOrange: '#FF7900',
  white: '#FFFFFF',
  black: '#000000',
} as const;
