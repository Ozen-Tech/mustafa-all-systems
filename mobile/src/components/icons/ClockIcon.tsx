import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface ClockIconProps {
  size?: number;
  color?: string;
}

export default function ClockIcon({ size = 24, color = 'currentColor' }: ClockIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path
        d="M12 6V12L16 14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

