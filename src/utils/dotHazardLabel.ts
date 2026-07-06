import {DOT_HAZARD_COLORS} from '../constants/dotHazardColors';

export type DotHazardPattern =
  | 'solid'
  | 'corrosive'
  | 'organic-peroxide'
  | 'flammable-solid'
  | 'spontaneously-combustible'
  | 'class9'
  | 'radioactive-yellow';

export type DotHazardLabelType =
  | 'flammable-liquid'
  | 'flammable-gas'
  | 'non-flammable-gas'
  | 'oxidizer'
  | 'organic-peroxide'
  | 'toxic'
  | 'biohazard'
  | 'dangerous-when-wet'
  | 'flammable-solid'
  | 'spontaneously-combustible'
  | 'explosives'
  | 'corrosive'
  | 'radioactive'
  | 'class9'
  | 'poison-gas';

export interface DotHazardLabelSpec {
  labelType: DotHazardLabelType;
  pattern: DotHazardPattern;
  primaryColor: string;
  secondaryColor?: string;
  divisionLabel: string;
  titleLines: string[];
  symbolColor: string;
  textColor: string;
  divisionTextColor: string;
  innerBorderColor: string;
  /** Hide class number (biohazard labels often omit it). */
  hideDivision?: boolean;
}

function formatDivision(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function buildSpec(
  labelType: DotHazardLabelType,
  config: Omit<DotHazardLabelSpec, 'labelType'>,
): DotHazardLabelSpec {
  return {labelType, ...config};
}

/** Canonical specs for the eight reference label styles shown in DOT training materials. */
export const DOT_REFERENCE_LABEL_SPECS: DotHazardLabelSpec[] = [
  buildSpec('flammable-liquid', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.red,
    divisionLabel: '3',
    titleLines: ['FLAMMABLE', 'LIQUID'],
    symbolColor: DOT_HAZARD_COLORS.white,
    textColor: DOT_HAZARD_COLORS.white,
    divisionTextColor: DOT_HAZARD_COLORS.white,
    innerBorderColor: DOT_HAZARD_COLORS.white,
  }),
  buildSpec('non-flammable-gas', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.green,
    divisionLabel: '2',
    titleLines: ['NON-FLAMMABLE', 'GAS'],
    symbolColor: DOT_HAZARD_COLORS.white,
    textColor: DOT_HAZARD_COLORS.white,
    divisionTextColor: DOT_HAZARD_COLORS.white,
    innerBorderColor: DOT_HAZARD_COLORS.white,
  }),
  buildSpec('oxidizer', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.yellow,
    divisionLabel: '5.1',
    titleLines: ['OXIDIZER'],
    symbolColor: DOT_HAZARD_COLORS.black,
    textColor: DOT_HAZARD_COLORS.black,
    divisionTextColor: DOT_HAZARD_COLORS.black,
    innerBorderColor: DOT_HAZARD_COLORS.black,
  }),
  buildSpec('toxic', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.white,
    divisionLabel: '6',
    titleLines: ['TOXIC'],
    symbolColor: DOT_HAZARD_COLORS.black,
    textColor: DOT_HAZARD_COLORS.black,
    divisionTextColor: DOT_HAZARD_COLORS.black,
    innerBorderColor: DOT_HAZARD_COLORS.black,
  }),
  buildSpec('dangerous-when-wet', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.blue,
    divisionLabel: '4',
    titleLines: ['DANGEROUS', 'WHEN WET'],
    symbolColor: DOT_HAZARD_COLORS.white,
    textColor: DOT_HAZARD_COLORS.white,
    divisionTextColor: DOT_HAZARD_COLORS.white,
    innerBorderColor: DOT_HAZARD_COLORS.white,
  }),
  buildSpec('explosives', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.orange,
    divisionLabel: '1',
    titleLines: ['EXPLOSIVES'],
    symbolColor: DOT_HAZARD_COLORS.black,
    textColor: DOT_HAZARD_COLORS.black,
    divisionTextColor: DOT_HAZARD_COLORS.black,
    innerBorderColor: DOT_HAZARD_COLORS.black,
  }),
  buildSpec('corrosive', {
    pattern: 'corrosive',
    primaryColor: DOT_HAZARD_COLORS.white,
    secondaryColor: DOT_HAZARD_COLORS.black,
    divisionLabel: '8',
    titleLines: ['CORROSIVE'],
    symbolColor: DOT_HAZARD_COLORS.black,
    textColor: DOT_HAZARD_COLORS.white,
    divisionTextColor: DOT_HAZARD_COLORS.white,
    innerBorderColor: DOT_HAZARD_COLORS.black,
  }),
  buildSpec('biohazard', {
    pattern: 'solid',
    primaryColor: DOT_HAZARD_COLORS.biohazardOrange,
    divisionLabel: '6.2',
    titleLines: ['BIOHAZARD'],
    symbolColor: DOT_HAZARD_COLORS.black,
    textColor: DOT_HAZARD_COLORS.black,
    divisionTextColor: DOT_HAZARD_COLORS.black,
    innerBorderColor: DOT_HAZARD_COLORS.black,
    hideDivision: true,
  }),
];

/**
 * Maps a waste profile hazard class string to a DOT label specification.
 * Colors follow 49 CFR §§ 172.411–172.448 and § 172.407(d)(5).
 */
export function getDotHazardLabelSpec(
  hazardClass?: string,
): DotHazardLabelSpec | null {
  if (!hazardClass?.trim()) {
    return null;
  }

  const match = hazardClass.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const division = parseFloat(match[1]);
  const divisionLabel = formatDivision(division);
  const majorClass = Math.floor(division);

  switch (majorClass) {
    case 1:
      return {
        ...DOT_REFERENCE_LABEL_SPECS[5],
        divisionLabel,
      };
    case 2:
      if (division === 2.1) {
        return buildSpec('flammable-gas', {
          pattern: 'solid',
          primaryColor: DOT_HAZARD_COLORS.red,
          divisionLabel,
          titleLines: ['FLAMMABLE', 'GAS'],
          symbolColor: DOT_HAZARD_COLORS.white,
          textColor: DOT_HAZARD_COLORS.white,
          divisionTextColor: DOT_HAZARD_COLORS.white,
          innerBorderColor: DOT_HAZARD_COLORS.white,
        });
      }
      if (division === 2.3) {
        return buildSpec('poison-gas', {
          pattern: 'solid',
          primaryColor: DOT_HAZARD_COLORS.white,
          divisionLabel,
          titleLines: ['POISON', 'GAS'],
          symbolColor: DOT_HAZARD_COLORS.black,
          textColor: DOT_HAZARD_COLORS.black,
          divisionTextColor: DOT_HAZARD_COLORS.black,
          innerBorderColor: DOT_HAZARD_COLORS.black,
        });
      }
      return {
        ...DOT_REFERENCE_LABEL_SPECS[1],
        divisionLabel,
      };
    case 3:
      return {
        ...DOT_REFERENCE_LABEL_SPECS[0],
        divisionLabel,
      };
    case 4:
      if (division === 4.1) {
        return buildSpec('flammable-solid', {
          pattern: 'flammable-solid',
          primaryColor: DOT_HAZARD_COLORS.red,
          secondaryColor: DOT_HAZARD_COLORS.white,
          divisionLabel,
          titleLines: ['FLAMMABLE', 'SOLID'],
          symbolColor: DOT_HAZARD_COLORS.black,
          textColor: DOT_HAZARD_COLORS.black,
          divisionTextColor: DOT_HAZARD_COLORS.black,
          innerBorderColor: DOT_HAZARD_COLORS.black,
        });
      }
      if (division === 4.2) {
        return buildSpec('spontaneously-combustible', {
          pattern: 'spontaneously-combustible',
          primaryColor: DOT_HAZARD_COLORS.red,
          secondaryColor: DOT_HAZARD_COLORS.white,
          divisionLabel,
          titleLines: ['SPONTANEOUSLY', 'COMBUSTIBLE'],
          symbolColor: DOT_HAZARD_COLORS.white,
          textColor: DOT_HAZARD_COLORS.white,
          divisionTextColor: DOT_HAZARD_COLORS.white,
          innerBorderColor: DOT_HAZARD_COLORS.white,
        });
      }
      return {
        ...DOT_REFERENCE_LABEL_SPECS[4],
        divisionLabel,
      };
    case 5:
      if (division === 5.2) {
        return buildSpec('organic-peroxide', {
          pattern: 'organic-peroxide',
          primaryColor: DOT_HAZARD_COLORS.red,
          secondaryColor: DOT_HAZARD_COLORS.yellow,
          divisionLabel,
          titleLines: ['ORGANIC', 'PEROXIDE'],
          symbolColor: DOT_HAZARD_COLORS.black,
          textColor: DOT_HAZARD_COLORS.black,
          divisionTextColor: DOT_HAZARD_COLORS.black,
          innerBorderColor: DOT_HAZARD_COLORS.black,
        });
      }
      return {
        ...DOT_REFERENCE_LABEL_SPECS[2],
        divisionLabel,
      };
    case 6:
      if (division === 6.2) {
        return DOT_REFERENCE_LABEL_SPECS[7];
      }
      return {
        ...DOT_REFERENCE_LABEL_SPECS[3],
        divisionLabel,
      };
    case 7:
      return buildSpec('radioactive', {
        pattern: 'radioactive-yellow',
        primaryColor: DOT_HAZARD_COLORS.yellow,
        secondaryColor: DOT_HAZARD_COLORS.white,
        divisionLabel,
        titleLines: ['RADIOACTIVE'],
        symbolColor: DOT_HAZARD_COLORS.black,
        textColor: DOT_HAZARD_COLORS.black,
        divisionTextColor: DOT_HAZARD_COLORS.black,
        innerBorderColor: DOT_HAZARD_COLORS.black,
      });
    case 8:
      return DOT_REFERENCE_LABEL_SPECS[6];
    case 9:
      return buildSpec('class9', {
        pattern: 'class9',
        primaryColor: DOT_HAZARD_COLORS.white,
        secondaryColor: DOT_HAZARD_COLORS.black,
        divisionLabel,
        titleLines: ['MISCELLANEOUS'],
        symbolColor: DOT_HAZARD_COLORS.black,
        textColor: DOT_HAZARD_COLORS.black,
        divisionTextColor: DOT_HAZARD_COLORS.black,
        innerBorderColor: DOT_HAZARD_COLORS.black,
      });
    default:
      return null;
  }
}

export function getDotHazardLabelSpecByType(
  labelType: DotHazardLabelType,
): DotHazardLabelSpec | null {
  return (
    DOT_REFERENCE_LABEL_SPECS.find(spec => spec.labelType === labelType) ?? null
  );
}
