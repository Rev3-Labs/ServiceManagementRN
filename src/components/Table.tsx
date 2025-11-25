import React from 'react';
import {View, Text, ScrollView, StyleSheet, ViewStyle} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../styles/theme';

interface TableProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Table: React.FC<TableProps> = ({children, style}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View style={[styles.table, style]}>{children}</View>
    </ScrollView>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TableHeader: React.FC<TableHeaderProps> = ({children, style}) => {
  return <View style={[styles.tableHeader, style]}>{children}</View>;
};

interface TableBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TableBody: React.FC<TableBodyProps> = ({children, style}) => {
  return <View style={[styles.tableBody, style]}>{children}</View>;
};

interface TableRowProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TableRow: React.FC<TableRowProps> = ({children, style}) => {
  return <View style={[styles.tableRow, style]}>{children}</View>;
};

interface TableHeadProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TableHead: React.FC<TableHeadProps> = ({children, style}) => {
  return (
    <View style={[styles.tableHead, style]}>
      <Text style={styles.tableHeadText}>{children}</Text>
    </View>
  );
};

interface TableCellProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const TableCell: React.FC<TableCellProps> = ({children, style}) => {
  return (
    <View style={[styles.tableCell, style]}>
      <Text style={styles.tableCellText}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: colors.card,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tableBody: {
    backgroundColor: colors.background,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 48,
  },
  tableHead: {
    padding: spacing.md,
    minWidth: 100,
    justifyContent: 'center',
  },
  tableHeadText: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
  },
  tableCell: {
    padding: spacing.md,
    minWidth: 100,
    justifyContent: 'center',
  },
  tableCellText: {
    ...typography.base,
    color: colors.foreground,
  },
});

