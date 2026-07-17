import React, {useId} from 'react';
import {View, StyleSheet, Image} from 'react-native';
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
import {
  DOT_HAZARD_SPRITE_MAP,
  DOT_HAZARD_SPRITESHEET,
  getDotHazardSpriteFrame,
  getDotHazardTile,
} from './dotHazard/dotHazardAssets';

interface DotHazardDiamondProps {
  spec: DotHazardLabelSpec;
  size?: number;
  /** When false, only the symbol and class number are shown (for very small sizes). */
  showTitle?: boolean;
  /**
   * Prefer raster placard artwork (individual tile or spritesheet) when available.
   * Falls back to the SVG reconstruction when no image asset exists.
   */
  preferImage?: boolean;
  accessibilityLabel?: string;
}

/** Slightly inset diamond so the outer black border stays fully visible. */
const OUTER_DIAMOND = '50,2.5 97.5,50 50,97.5 2.5,50';
const INNER_DIAMOND = '50,8 92,50 50,92 8,50';

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

function renderTitleLines(spec: DotHazardLabelSpec, showTitle: boolean) {
  if (!showTitle || spec.titleLines.length === 0) {
    return null;
  }

  const isCorrosive = spec.labelType === 'corrosive';
  const isClass9 = spec.labelType === 'class9';
  const lineCount = spec.titleLines.length;
  const lineHeight = lineCount > 1 ? 6.2 : 0;
  const startY = isCorrosive
    ? 64
    : isClass9
      ? 58
      : lineCount > 1
        ? 52
        : 54;
  const longest = Math.max(...spec.titleLines.map(line => line.length));
  const fontSize = longest > 12 ? 5.4 : longest > 9 ? 6.2 : 7;

  return spec.titleLines.map((line, index) => (
    <SvgText
      key={`${line}-${index}`}
      x="50"
      y={startY + index * lineHeight}
      fontSize={fontSize}
      fontWeight="800"
      letterSpacing={0.4}
      fill={spec.textColor}
      textAnchor="middle">
      {line}
    </SvgText>
  ));
}

/** Raster placard via dedicated tile PNG (preferred) or spritesheet clip. */
const DotHazardImage: React.FC<{
  labelType: DotHazardLabelSpec['labelType'];
  size: number;
  accessibilityLabel: string;
}> = ({labelType, size, accessibilityLabel}) => {
  const tile = getDotHazardTile(labelType);
  if (tile) {
    return (
      <Image
        source={tile}
        style={{width: size, height: size}}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      />
    );
  }

  const frame = getDotHazardSpriteFrame(labelType);
  if (!frame) {
    return null;
  }

  const {tileSize, columns} = DOT_HAZARD_SPRITE_MAP;
  const scale = size / tileSize;
  const sheetWidth = columns * tileSize * scale;
  const sheetHeight = DOT_HAZARD_SPRITE_MAP.rows * tileSize * scale;

  return (
    <View
      style={[styles.spriteWindow, {width: size, height: size}]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Image
        source={DOT_HAZARD_SPRITESHEET}
        style={{
          width: sheetWidth,
          height: sheetHeight,
          transform: [
            {translateX: -frame.col * size},
            {translateY: -frame.row * size},
          ],
        }}
        resizeMode="stretch"
      />
    </View>
  );
};

export const DotHazardDiamond: React.FC<DotHazardDiamondProps> = ({
  spec,
  size = 120,
  showTitle,
  preferImage = true,
  accessibilityLabel,
}) => {
  const clipId = useId().replace(/:/g, '');
  const resolvedShowTitle = showTitle ?? size >= 64;
  const titleForA11y = spec.titleLines.join(' ');
  const a11y =
    accessibilityLabel ??
    `DOT ${titleForA11y} hazard class ${spec.divisionLabel}`;

  if (preferImage) {
    // Prefer sharp individual tiles from src/assets/dotHazard/tiles.
    // Chart-derived spritesheet crops are too soft at card size, so we only
    // use dedicated tiles here (spritesheet remains available for tooling).
    if (getDotHazardTile(spec.labelType)) {
      return (
        <View style={[styles.container, {width: size, height: size}]}>
          <DotHazardImage
            labelType={spec.labelType}
            size={size}
            accessibilityLabel={a11y}
          />
        </View>
      );
    }
  }

  const strokeScale = Math.max(1, 100 / size);
  const outerStroke = 2.8 * strokeScale;
  const innerStroke = 1.4 * strokeScale;
  const divisionFontSize =
    spec.divisionLabel.length > 2 ? 12 : spec.divisionLabel.length > 1 ? 14 : 16;

  return (
    <View
      style={[styles.container, {width: size, height: size}]}
      accessibilityRole="image"
      accessibilityLabel={a11y}>
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
            y={spec.labelType === 'corrosive' ? 89 : 91}
            fontSize={divisionFontSize}
            fontWeight="800"
            fill={spec.divisionTextColor}
            textAnchor="middle">
            {spec.divisionLabel}
          </SvgText>
        ) : null}

        <Polygon
          points={OUTER_DIAMOND}
          fill="none"
          stroke={DOT_HAZARD_COLORS.black}
          strokeWidth={outerStroke}
          strokeLinejoin="miter"
        />
        <Polygon
          points={INNER_DIAMOND}
          fill="none"
          stroke={spec.innerBorderColor}
          strokeWidth={innerStroke}
          strokeLinejoin="miter"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexShrink: 0,
  },
  spriteWindow: {
    overflow: 'hidden',
  },
});
