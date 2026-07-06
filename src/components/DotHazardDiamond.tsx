import React, {useId} from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {
  G,
  Polygon,
  Defs,
  ClipPath,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import {DOT_HAZARD_COLORS} from '../constants/dotHazardColors';
import {DotHazardLabelSpec} from '../utils/dotHazardLabel';
import {DotHazardSymbol} from './DotHazardSymbols';

interface DotHazardDiamondProps {
  spec: DotHazardLabelSpec;
  size?: number;
  /** When false, only the symbol and class number are shown (for very small sizes). */
  showTitle?: boolean;
  accessibilityLabel?: string;
}

const OUTER_DIAMOND = '50,3 97,50 50,97 3,50';
const INNER_DIAMOND = '50,9 91,50 50,91 9,50';

function renderStripes(
  stripeCount: number,
  primaryColor: string,
  secondaryColor: string,
) {
  const stripeWidth = 100 / stripeCount;
  return Array.from({length: stripeCount}, (_, index) => (
    <Rect
      key={index}
      x={index * stripeWidth}
      y={0}
      width={stripeWidth}
      height={100}
      fill={index % 2 === 0 ? primaryColor : secondaryColor}
    />
  ));
}

function renderPattern(spec: DotHazardLabelSpec) {
  const {pattern, primaryColor, secondaryColor = DOT_HAZARD_COLORS.white} = spec;

  switch (pattern) {
    case 'corrosive':
      return (
        <>
          <Rect x={0} y={0} width={100} height={50} fill={primaryColor} />
          <Rect x={0} y={50} width={100} height={50} fill={secondaryColor} />
        </>
      );
    case 'organic-peroxide':
      return (
        <>
          <Rect x={0} y={0} width={100} height={50} fill={primaryColor} />
          <Rect x={0} y={50} width={100} height={50} fill={secondaryColor} />
        </>
      );
    case 'flammable-solid':
      return renderStripes(13, primaryColor, secondaryColor);
    case 'spontaneously-combustible':
      return (
        <>
          {Array.from({length: 11}, (_, index) => {
            const stripeWidth = 100 / 11;
            return (
              <Rect
                key={`spont-${index}`}
                x={index * stripeWidth}
                y={0}
                width={stripeWidth}
                height={50}
                fill={index % 2 === 0 ? secondaryColor : primaryColor}
              />
            );
          })}
          <Rect x={0} y={50} width={100} height={50} fill={primaryColor} />
        </>
      );
    case 'class9':
      return (
        <>
          <Rect x={0} y={0} width={100} height={100} fill={primaryColor} />
          {Array.from({length: 7}, (_, index) => {
            const stripeWidth = 100 / 7;
            return (
              <Rect
                key={`class9-${index}`}
                x={index * stripeWidth}
                y={0}
                width={stripeWidth}
                height={42}
                fill={index % 2 === 0 ? secondaryColor : primaryColor}
              />
            );
          })}
        </>
      );
    case 'radioactive-yellow':
      return (
        <>
          <Rect x={0} y={0} width={100} height={100} fill={secondaryColor} />
          <Rect x={0} y={0} width={100} height={55} fill={primaryColor} />
        </>
      );
    case 'solid':
    default:
      return <Rect x={0} y={0} width={100} height={100} fill={primaryColor} />;
  }
}

function renderTitleLines(
  spec: DotHazardLabelSpec,
  showTitle: boolean,
) {
  if (!showTitle || spec.titleLines.length === 0) {
    return null;
  }

  const isCorrosive = spec.labelType === 'corrosive';
  const lineHeight = spec.titleLines.length > 1 ? 5.5 : 0;
  const startY = isCorrosive ? 62 : spec.titleLines.length > 1 ? 48 : 50;
  const fontSize = spec.titleLines.some(line => line.length > 10) ? 5.2 : 6;

  return spec.titleLines.map((line, index) => (
    <SvgText
      key={`${line}-${index}`}
      x="50"
      y={startY + index * lineHeight}
      fontSize={fontSize}
      fontWeight="700"
      fill={isCorrosive ? spec.textColor : spec.textColor}
      textAnchor="middle">
      {line}
    </SvgText>
  ));
}

export const DotHazardDiamond: React.FC<DotHazardDiamondProps> = ({
  spec,
  size = 88,
  showTitle,
  accessibilityLabel,
}) => {
  const clipId = useId().replace(/:/g, '');
  const resolvedShowTitle = showTitle ?? size >= 72;
  const titleForA11y = spec.titleLines.join(' ');

  return (
    <View
      style={[styles.container, {width: size, height: size}]}
      accessibilityRole="image"
      accessibilityLabel={
        accessibilityLabel ??
        `DOT ${titleForA11y} hazard class ${spec.divisionLabel}`
      }>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id={clipId}>
            <Polygon points={OUTER_DIAMOND} />
          </ClipPath>
        </Defs>

        <G clipPath={`url(#${clipId})`}>{renderPattern(spec)}</G>

        <DotHazardSymbol labelType={spec.labelType} color={spec.symbolColor} />

        {renderTitleLines(spec, resolvedShowTitle)}

        {!spec.hideDivision ? (
          <SvgText
            x="50"
            y={spec.labelType === 'corrosive' ? 88 : 90}
            fontSize="13"
            fontWeight="700"
            fill={spec.divisionTextColor}
            textAnchor="middle">
            {spec.divisionLabel}
          </SvgText>
        ) : null}

        <Polygon
          points={OUTER_DIAMOND}
          fill="none"
          stroke={DOT_HAZARD_COLORS.black}
          strokeWidth={2.5}
        />
        <Polygon
          points={INNER_DIAMOND}
          fill="none"
          stroke={spec.innerBorderColor}
          strokeWidth={1.5}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },
});
