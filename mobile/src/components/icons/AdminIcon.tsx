import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface AdminIconProps {
  size?: number;
  color?: string;
}

export default function AdminIcon({ size = 24, color = 'currentColor' }: AdminIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15C15.866 15 19 11.866 19 8C19 4.13401 15.866 1 12 1C8.13401 1 5 4.13401 5 8C5 11.866 8.13401 15 12 15Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.21 13.89L7 23L12 20L17 23L15.79 13.88"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

