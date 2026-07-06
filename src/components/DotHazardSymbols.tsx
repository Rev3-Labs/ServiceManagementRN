import React from 'react';
import {G, Path, Circle, Rect, Line, Ellipse} from 'react-native-svg';
import {DotHazardLabelType} from '../utils/dotHazardLabel';

interface DotHazardSymbolProps {
  labelType: DotHazardLabelType;
  color: string;
}

/** DOT-style hazard pictograms scaled for the 100×100 label viewBox. */
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
      return <Class9Symbol color={color} />;
    default:
      return null;
  }
};

function FlameSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 21)">
      <Path
        d="M0,-10 C-3,-4 -5,0 -3,5 C-1,8 1,8 3,5 C5,0 3,-4 0,-10 Z"
        fill={color}
      />
      <Path
        d="M-2,5 C-3,8 -2,11 0,12 C2,11 3,8 2,5 C1,7 0,7 -2,5 Z"
        fill={color}
      />
    </G>
  );
}

function GasCylinderSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 22)">
      <Rect
        x={-16}
        y={-5}
        width={32}
        height={10}
        rx={5}
        ry={5}
        fill={color}
      />
      <Rect x={-20} y={-3} width={5} height={6} rx={1} fill={color} />
      <Circle cx={-17.5} cy={0} r={1.2} fill={color} />
    </G>
  );
}

function OxidizerSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 21)">
      <Circle cx={0} cy={2} r={9} fill="none" stroke={color} strokeWidth={2.2} />
      <Path
        d="M-4,2 C-4,-1 4,-1 4,2"
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Path
        d="M-3,-6 C-1,-9 1,-9 3,-6 C2,-8 0,-9 -1,-8 C-2,-8 -3,-7 -3,-6 Z"
        fill={color}
      />
      <Path d="M-6,-4 C-7,-7 -5,-8 -3,-6" fill={color} />
      <Path d="M6,-4 C7,-7 5,-8 3,-6" fill={color} />
    </G>
  );
}

function SkullSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 21)">
      <Ellipse cx={0} cy={-1} rx={8} ry={9} fill={color} />
      <Circle cx={-3} cy={-2} r={2} fill="#FFFFFF" />
      <Circle cx={3} cy={-2} r={2} fill="#FFFFFF" />
      <Circle cx={-3} cy={-2} r={1} fill={color} />
      <Circle cx={3} cy={-2} r={1} fill={color} />
      <Rect x={-2} y={2} width={4} height={3} rx={1} fill="#FFFFFF" />
      <Line
        x1={-10}
        y1={8}
        x2={10}
        y2={8}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={-10}
        y1={8}
        x2={-4}
        y2={2}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={10}
        y1={8}
        x2={4}
        y2={2}
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </G>
  );
}

function ExplosionSymbol({color}: {color: string}) {
  const rays = Array.from({length: 8}, (_, index) => {
    const angle = (index * Math.PI) / 4;
    const inner = 4;
    const outer = 12;
    const x1 = Math.cos(angle) * inner;
    const y1 = Math.sin(angle) * inner;
    const x2 = Math.cos(angle) * outer;
    const y2 = Math.sin(angle) * outer;
    return (
      <Line
        key={index}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    );
  });

  return (
    <G transform="translate(50, 21)">
      <Circle cx={0} cy={0} r={3.5} fill={color} />
      {rays}
      {Array.from({length: 8}, (_, index) => {
        const angle = ((index + 0.5) * Math.PI) / 4;
        const x1 = Math.cos(angle) * 5;
        const y1 = Math.sin(angle) * 5;
        const x2 = Math.cos(angle) * 10;
        const y2 = Math.sin(angle) * 10;
        return (
          <Line
            key={`mid-${index}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </G>
  );
}

function CorrosiveSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 18)">
      <Path
        d="M-12,-4 L-8,8 L-4,-4 Z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M2,-4 L6,8 L10,-4 Z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M-10,2 L-6,2 C-5,6 -3,7 -2,5"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M4,2 L8,2 C9,6 11,7 12,5"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <Rect x={-14} y={6} width={10} height={2} rx={1} fill={color} />
      <Ellipse
        cx={8}
        cy={8}
        rx={4}
        ry={2.5}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M-3,8 C-1,10 1,10 3,8"
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      />
    </G>
  );
}

function BiohazardSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 20)">
      <Circle cx={0} cy={0} r={2.5} fill={color} />
      {[0, 120, 240].map(angle => {
        const rad = (angle * Math.PI) / 180;
        const cx = Math.cos(rad) * 6;
        const cy = Math.sin(rad) * 6;
        return (
          <G key={angle} transform={`translate(${cx}, ${cy})`}>
            <Circle
              cx={0}
              cy={0}
              r={5}
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            <Circle
              cx={Math.cos(rad) * 5}
              cy={Math.sin(rad) * 5}
              r={2.2}
              fill={color}
            />
          </G>
        );
      })}
    </G>
  );
}

function RadioactiveSymbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 21)">
      <Circle cx={0} cy={0} r={2.5} fill={color} />
      {[30, 150, 270].map(angle => (
        <Path
          key={angle}
          d={`M0,0 L${Math.cos(((angle - 30) * Math.PI) / 180) * 11},${Math.sin(((angle - 30) * Math.PI) / 180) * 11} A11,11 0 0,1 ${Math.cos(((angle + 30) * Math.PI) / 180) * 11},${Math.sin(((angle + 30) * Math.PI) / 180) * 11} Z`}
          fill={color}
        />
      ))}
    </G>
  );
}

function Class9Symbol({color}: {color: string}) {
  return (
    <G transform="translate(50, 21)">
      <Rect
        x={-10}
        y={-8}
        width={20}
        height={16}
        rx={2}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
      <Line x1={-6} y1={-3} x2={6} y2={-3} stroke={color} strokeWidth={1.5} />
      <Line x1={-6} y1={1} x2={6} y2={1} stroke={color} strokeWidth={1.5} />
      <Line x1={-6} y1={5} x2={2} y2={5} stroke={color} strokeWidth={1.5} />
    </G>
  );
}
