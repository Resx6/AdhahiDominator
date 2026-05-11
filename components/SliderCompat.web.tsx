/**
 * Web-compatible Slider shim.
 * @react-native-community/slider is not supported on web,
 * so we use a native HTML <input type="range">.
 */
import React from 'react';

interface SliderProps {
  value?: number;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: any;
}

const SliderCompat: React.FC<SliderProps> = ({
  value = 5,
  minimumValue = 1,
  maximumValue = 10,
  step = 1,
  onValueChange,
  minimumTrackTintColor = '#0F6A3B',
  thumbTintColor = '#39FF8F',
  style,
}) => {
  return (
    <input
      type="range"
      min={minimumValue}
      max={maximumValue}
      step={step}
      value={value}
      onChange={(e) => onValueChange?.(Number(e.target.value))}
      style={{
        width: '100%',
        height: 32,
        accentColor: thumbTintColor,
        cursor: 'pointer',
        ...style,
      }}
    />
  );
};

export default SliderCompat;
