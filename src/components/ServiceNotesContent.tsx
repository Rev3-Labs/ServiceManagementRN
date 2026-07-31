import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardTitleText,
} from './Card';
import {OrderData} from '../types/wasteCollection';
import {colors, spacing, typography} from '../styles/theme';

export type ServiceNotesFields = Pick<
  OrderData,
  'customerSpecialInstructions' | 'siteAccessNotes' | 'orderNotes'
>;

/** True when any inbound Customer / Site / Order note is present. */
export function hasServiceNotes(order: ServiceNotesFields): boolean {
  return Boolean(
    order.customerSpecialInstructions ||
      order.siteAccessNotes ||
      order.orderNotes,
  );
}

export interface ServiceNotesContentProps {
  order: ServiceNotesFields;
  /**
   * `cards` — nested cards (Service Notes panel, View Notes modals).
   * `compact` — labeled blocks (Service List expander).
   */
  variant?: 'cards' | 'compact';
  emptyText?: string;
}

const NOTE_SECTIONS: Array<{
  key: keyof ServiceNotesFields;
  title: string;
}> = [
  {key: 'customerSpecialInstructions', title: 'Customer Notes'},
  {key: 'siteAccessNotes', title: 'Site Notes'},
  {key: 'orderNotes', title: 'Order Notes'},
];

/**
 * Shared Customer / Site / Order Notes body used by Current Orders Service Notes,
 * dashboard View notes, and header View Notes modals.
 */
export const ServiceNotesContent: React.FC<ServiceNotesContentProps> = ({
  order,
  variant = 'cards',
  emptyText = 'No service notes on file.',
}) => {
  const sections = NOTE_SECTIONS.filter(section => Boolean(order[section.key]));

  if (sections.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactList}>
        {sections.map(section => (
          <View key={section.key} style={styles.compactBlock}>
            <Text style={styles.compactLabel}>{section.title}</Text>
            <Text style={styles.compactValue}>{order[section.key]}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.cardsList}>
      {sections.map(section => (
        <Card key={section.key} style={styles.card}>
          <CardHeader>
            <CardTitle>
              <CardTitleText>{section.title}</CardTitleText>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Text style={styles.cardText}>{order[section.key]}</Text>
          </CardContent>
        </Card>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  cardsList: {
    gap: spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardText: {
    ...typography.base,
    color: colors.foreground,
  },
  compactList: {
    gap: spacing.sm,
  },
  compactBlock: {
    gap: 2,
  },
  compactLabel: {
    ...typography.xs,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'none',
  },
  compactValue: {
    ...typography.sm,
    color: colors.foreground,
  },
  emptyText: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
});
