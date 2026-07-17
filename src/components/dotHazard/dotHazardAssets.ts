import {ImageSourcePropType} from 'react-native';
import {DotHazardLabelType} from '../../utils/dotHazardLabel';

/**
 * Individual DOT placard tiles (public-domain US DOT / Wikimedia ERG artwork).
 * Metro requires static `require()` paths — keep in sync with files under
 * `src/assets/dotHazard/tiles/`.
 */
export const DOT_HAZARD_TILES: Record<DotHazardLabelType, ImageSourcePropType> = {
  explosives: require('../../assets/dotHazard/tiles/explosives.png'),
  'flammable-gas': require('../../assets/dotHazard/tiles/flammable-gas.png'),
  'non-flammable-gas': require('../../assets/dotHazard/tiles/non-flammable-gas.png'),
  'poison-gas': require('../../assets/dotHazard/tiles/poison-gas.png'),
  'flammable-liquid': require('../../assets/dotHazard/tiles/flammable-liquid.png'),
  'flammable-solid': require('../../assets/dotHazard/tiles/flammable-solid.png'),
  'spontaneously-combustible': require('../../assets/dotHazard/tiles/spontaneously-combustible.png'),
  'dangerous-when-wet': require('../../assets/dotHazard/tiles/dangerous-when-wet.png'),
  oxidizer: require('../../assets/dotHazard/tiles/oxidizer.png'),
  'organic-peroxide': require('../../assets/dotHazard/tiles/organic-peroxide.png'),
  toxic: require('../../assets/dotHazard/tiles/toxic.png'),
  biohazard: require('../../assets/dotHazard/tiles/biohazard.png'),
  radioactive: require('../../assets/dotHazard/tiles/radioactive.png'),
  corrosive: require('../../assets/dotHazard/tiles/corrosive.png'),
  class9: require('../../assets/dotHazard/tiles/class9.png'),
};

/** Packed spritesheet (built by scripts/build-dot-hazard-sprites.py). */
export const DOT_HAZARD_SPRITESHEET: ImageSourcePropType = require('../../assets/dotHazard/placard-sprites.png');

export type SpriteFrame = {col: number; row: number};

export interface DotHazardSpriteMap {
  tileSize: number;
  columns: number;
  rows: number;
  frames: Partial<Record<string, SpriteFrame>>;
}

export const DOT_HAZARD_SPRITE_MAP: DotHazardSpriteMap = require('../../assets/dotHazard/placard-sprites.json');

export function getDotHazardTile(
  labelType: DotHazardLabelType,
): ImageSourcePropType | null {
  return DOT_HAZARD_TILES[labelType] ?? null;
}

export function getDotHazardSpriteFrame(
  labelType: DotHazardLabelType,
): SpriteFrame | null {
  return DOT_HAZARD_SPRITE_MAP.frames[labelType] ?? null;
}
