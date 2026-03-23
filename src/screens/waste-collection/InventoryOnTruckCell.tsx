import React, {memo, useState, useEffect} from 'react';
import {View, TextInput, ViewStyle} from 'react-native';

export const InventoryOnTruckCell = memo(function InventoryOnTruckCell(props: {
  columnKey: string;
  committedValue: number;
  saveGeneration: number;
  onDraftChange: (key: string, value: number) => void;
  cellStyle: ViewStyle[];
  inputStyle: ViewStyle;
  otherCellStyle?: ViewStyle;
  placeholderTextColor: string;
}) {
  const { columnKey, committedValue, saveGeneration, onDraftChange, cellStyle, inputStyle, otherCellStyle, placeholderTextColor } = props;
  const [value, setValue] = useState(() => String(committedValue ?? 0));
  useEffect(() => {
    setValue(String(committedValue ?? 0));
  }, [committedValue, saveGeneration]);
  return (
    <View style={[cellStyle, columnKey === 'Other' && otherCellStyle]}>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          const n = text === '' ? 0 : parseInt(text, 10);
          if (!Number.isNaN(n) && n >= 0) onDraftChange(columnKey, n);
        }}
        onBlur={() => {
          const n = value === '' ? 0 : parseInt(value, 10);
          if (value === '' || !Number.isNaN(n)) onDraftChange(columnKey, value === '' ? 0 : n);
        }}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={placeholderTextColor}
        accessibilityLabel={`${columnKey} on truck now`}
      />
    </View>
  );
});
