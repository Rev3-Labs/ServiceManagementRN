import React from 'react';
import {G, Path, Circle, Rect, Line, Ellipse} from 'react-native-svg';
import {DotHazardLabelType} from '../utils/dotHazardLabel';

interface DotHazardSymbolProps {
  labelType: DotHazardLabelType;
  color: string;
}

/**
 * DOT placard pictograms for the 100×100 diamond viewBox.
 * Geometry follows U.S. DOT / TDG placarding chart proportions:
 * large upper-third glyphs, high-contrast fills, bold strokes.
 */
export const DotHazardSymbol: React.FC<DotHazardSymbolProps> = ({
  labelType,
  color,
}) => {
  switch (labelType) {
    case 'flammable-liquid':
    case 'flammable-gas':
    case 'dangerous-when-wet':
    case 'spontaneously-combustible':
    case 'flammable-solid':
      return <FlameSymbol color={color} />;
    case 'non-flammable-gas':
      return <GasCylinderSymbol color={color} />;
    case 'oxidizer':
    case 'organic-peroxide':
      return <OxidizerSymbol color={color} />;
    case 'toxic':
    case 'poison-gas':
      return <SkullSymbol color={color} />;
    case 'explosives':
      return <ExplosionSymbol color={color} />;
    case 'corrosive':
      return <CorrosiveSymbol color={color} />;
    case 'biohazard':
      return <BiohazardSymbol color={color} />;
    case 'radioactive':
      return <RadioactiveSymbol color={color} />;
    case 'class9':
      // Class 9 placards have no upper pictogram — stripes only.
      return null;
    default:
      return null;
  }
};

/** Classic DOT flame (used on flammable / dangerous-when-wet placards). */
function FlameSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 24) scale(1.15)">
      {/* Outer flame body */}
      <Path
        d="M0,-16
           C-2.5,-12 -6,-8 -8,-2
           C-10,4 -8,10 -4,12
           C-6,6 -4,2 -1,0
           C1,4 3,6 4,12
           C8,10 10,4 8,-2
           C6,-8 2.5,-12 0,-16 Z"
        fill={color}
      />
      {/* Inner flame tongue */}
      <Path
        d="M0,-2
           C-2,2 -2.5,6 -1,10
           C0,8 1.5,6 2,3
           C2.5,6 3.5,8 4,10
           C6,7 6,2 4,-1
           C2,-4 1,-5 0,-2 Z"
        fill={color}
        opacity={0.92}
      />
    </G>
  );
}

/** Horizontal compressed-gas cylinder with valve (Class 2.2). */
function GasCylinderSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 24)">
      {/* Cylinder body */}
      <Rect x={-18} y={-6} width={34} height={12} rx={6} ry={6} fill={color} />
      {/* Valve / neck */}
      <Rect x={-22} y={-4} width={5} height={8} rx={1.2} fill={color} />
      {/* Valve stem */}
      <Rect x={-25} y={-1.5} width={4} height={3} rx={0.8} fill={color} />
      {/* Cap highlight ring */}
      <Ellipse
        cx={14}
        cy={0}
        rx={2.2}
        ry={5.2}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
      />
    </G>
  );
}

/** Flaming circle / “O” oxidizer symbol (Class 5.1 / 5.2). */
function OxidizerSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 24)">
      <Circle
        cx={0}
        cy={4}
        r={10}
        fill="none"
        stroke={color}
        strokeWidth={2.8}
      />
      {/* Flame rising from the O */}
      <Path
        d="M0,-12
           C-2,-8 -4,-5 -3.5,-1
           C-3,2 -1,3 0,1.5
           C1,3 3,2 3.5,-1
           C4,-5 2,-8 0,-12 Z"
        fill={color}
      />
      <Path
        d="M-1.2,-3 C-1.5,-0.5 -0.5,1 0,0.5 C0.5,1 1.5,-0.5 1.2,-3 C0.5,-5 0,-5 -1.2,-3 Z"
        fill={color}
      />
    </G>
  );
}

/** Skull and crossbones (poison / toxic / poison gas). */
function SkullSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 22)">
      {/* Crossbones behind skull */}
      <Line
        x1={-14}
        y1={10}
        x2={14}
        y2={10}
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <Line
        x1={-12}
        y1={4}
        x2={-4}
        y2={12}
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      <Line
        x1={12}
        y1={4}
        x2={4}
        y2={12}
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
      {/* Bone ends */}
      <Circle cx={-14} cy={10} r={2.2} fill={color} />
      <Circle cx={14} cy={10} r={2.2} fill={color} />
      <Circle cx={-12} cy={4} r={2.2} fill={color} />
      <Circle cx={12} cy={4} r={2.2} fill={color} />
      <Circle cx={-4} cy={12} r={2.2} fill={color} />
      <Circle cx={4} cy={12} r={2.2} fill={color} />

      {/* Skull */}
      <Ellipse cx={0} cy={-2} rx={10} ry={11} fill={color} />
      {/* Eye sockets */}
      <Ellipse cx={-4} cy={-3} rx={3} ry={3.4} fill="#FFFFFF" />
      <Ellipse cx={4} cy={-3} rx={3} ry={3.4} fill="#FFFFFF" />
      {/* Nasal cavity */}
      <Path d="M0,1 L-2,5 L2,5 Z" fill="#FFFFFF" />
      {/* Jaw teeth suggestion */}
      <Rect x={-4.5} y={5.5} width={9} height={3.5} rx={1} fill={color} />
      <Line x1={-1.5} y1={5.5} x2={-1.5} y2={9} stroke="#FFFFFF" strokeWidth={1} />
      <Line x1={1.5} y1={5.5} x2={1.5} y2={9} stroke="#FFFFFF" strokeWidth={1} />
    </G>
  );
}

/** Exploding bomb (Class 1 explosives). */
function ExplosionSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 24)">
      {/* Burst rays */}
      {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340].map(
        angle => {
          const rad = (angle * Math.PI) / 180;
          const inner = 7;
          const outer = angle % 40 === 0 ? 16 : 12;
          return (
            <Line
              key={angle}
              x1={Math.cos(rad) * inner}
              y1={Math.sin(rad) * inner}
              x2={Math.cos(rad) * outer}
              y2={Math.sin(rad) * outer}
              stroke={color}
              strokeWidth={angle % 40 === 0 ? 2.6 : 1.8}
              strokeLinecap="round"
            />
          );
        },
      )}
      {/* Bomb body */}
      <Circle cx={0} cy={1} r={7.5} fill={color} />
      {/* Fuse stub */}
      <Rect x={-1.4} y={-12} width={2.8} height={5} rx={1} fill={color} />
      <Path
        d="M0,-12 C2,-14 4,-13 3,-11 C5,-12 6,-10 4,-9"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Corrosive: test tubes pouring onto hand / metal bar (Class 8). */
function CorrosiveSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 20)">
      {/* Left test tube (tilted) */}
      <G transform="rotate(-28 -10 -2)">
        <Path
          d="M-14,-10 L-14,4 L-6,4 L-6,-10 Z"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Line x1={-15} y1={-10} x2={-5} y2={-10} stroke={color} strokeWidth={2} />
        <Path
          d="M-12,4 C-11,8 -9,9 -8,7"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </G>
      {/* Right test tube (tilted) */}
      <G transform="rotate(28 10 -2)">
        <Path
          d="M6,-10 L6,4 L14,4 L14,-10 Z"
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Line x1={5} y1={-10} x2={15} y2={-10} stroke={color} strokeWidth={2} />
        <Path
          d="M8,4 C9,8 11,9 12,7"
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </G>
      {/* Hand / bar being corroded */}
      <Rect x={-16} y={10} width={14} height={3.5} rx={1} fill={color} />
      <Ellipse
        cx={10}
        cy={12}
        rx={6}
        ry={3.5}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      {/* Drip / damage mark between them */}
      <Path
        d="M-2,10 C0,13 2,13 4,10"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </G>
  );
}

/** Biohazard / infectious substance trefoil. */
function BiohazardSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 24)">
      <Circle cx={0} cy={0} r={3} fill={color} />
      {[0, 120, 240].map(angle => {
        const rad = (angle * Math.PI) / 180;
        const cx = Math.cos(rad) * 7.5;
        const cy = Math.sin(rad) * 7.5;
        return (
          <G key={angle} transform={`translate(${cx}, ${cy}) rotate(${angle})`}>
            <Circle
              cx={0}
              cy={0}
              r={6.5}
              fill="none"
              stroke={color}
              strokeWidth={2.6}
            />
            <Circle cx={0} cy={-6.5} r={2.8} fill={color} />
          </G>
        );
      })}
    </G>
  );
}

/** Radioactive trefoil (Class 7). */
function RadioactiveSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 24)">
      <Circle cx={0} cy={0} r={3.2} fill={color} />
      {[90, 210, 330].map(angle => {
        const start = angle - 50;
        const end = angle + 50;
        const r = 13;
        const x1 = Math.cos((start * Math.PI) / 180) * r;
        const y1 = Math.sin((start * Math.PI) / 180) * r;
        const x2 = Math.cos((end * Math.PI) / 180) * r;
        const y2 = Math.sin((end * Math.PI) / 180) * r;
        return (
          <Path
            key={angle}
            d={`M0,0 L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`}
            fill={color}
          />
        );
      })}
    </G>
  );
}
