import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ListRenderItem,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../components/Button';
import {Icon} from '../components/Icon';
import {AnchoredPopover, AnchorRect} from '../components/AnchoredPopover';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  touchTargets,
} from '../styles/theme';
import {
  DateRangeId,
  DebugLogEntry,
  LOG_TYPE_META,
  LogType,
  OVERFLOW_DATE_RANGES,
  OVERFLOW_LOG_TYPES,
  PRIMARY_DATE_RANGES,
  PRIMARY_LOG_TYPES,
} from '../types/debugLogs';
import {
  buildLogFileName,
  filterDebugLogs,
  formatLogTimestamp,
  getDebugLogs,
} from '../services/debugLogService';

interface OpenLogsScreenProps {
  username?: string;
  onGoBack: () => void;
}

type PopoverKind = 'types' | 'dates' | null;

export const OpenLogsScreen: React.FC<OpenLogsScreenProps> = ({
  username,
  onGoBack,
}) => {
  const allLogs = useMemo(() => getDebugLogs(), []);
  const fileName = useMemo(() => buildLogFileName(username), [username]);

  const [selectedTypes, setSelectedTypes] = useState<Set<LogType>>(
    () => new Set(),
  );
  const [dateRange, setDateRange] = useState<DateRangeId>('today');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [popover, setPopover] = useState<PopoverKind>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const typeMoreRef = useRef<View>(null);
  const dateMoreRef = useRef<View>(null);

  const filteredLogs = useMemo(
    () => filterDebugLogs(allLogs, selectedTypes, dateRange),
    [allLogs, selectedTypes, dateRange],
  );

  const overflowTypeSelected = OVERFLOW_LOG_TYPES.some(type =>
    selectedTypes.has(type),
  );
  const overflowDateSelected = OVERFLOW_DATE_RANGES.some(
    option => option.id === dateRange,
  );

  const openPopover = useCallback(
    (kind: PopoverKind, ref: React.RefObject<View>) => {
      ref.current?.measureInWindow((x, y, width, height) => {
        setAnchor({x, y, width, height});
        setPopover(kind);
      });
    },
    [],
  );

  const closePopover = useCallback(() => setPopover(null), []);

  const toggleType = useCallback((type: LogType) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const selectAllTypes = useCallback(() => {
    setSelectedTypes(new Set());
  }, []);

  const selectDateRange = useCallback((id: DateRangeId) => {
    setDateRange(id);
    setPopover(null);
  }, []);

  const renderLog: ListRenderItem<DebugLogEntry> = ({item}) => {
    const meta = LOG_TYPE_META[item.type];
    const expanded = expandedId === item.id;
    const hasBody = Boolean(item.details || item.context);

    return (
      <TouchableOpacity
        style={styles.logRow}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        activeOpacity={hasBody ? 0.7 : 1}
        disabled={!hasBody}>
        <View style={styles.logMain}>
          <View style={styles.logCopy}>
            <View
              style={[styles.typeBadge, {backgroundColor: meta.background}]}>
              <Text style={[styles.typeBadgeText, {color: meta.foreground}]}>
                {meta.badgeLabel}
              </Text>
            </View>
            <Text style={styles.logMessage}>{item.message}</Text>
          </View>
          <Text style={styles.logTime}>{formatLogTimestamp(item.timestamp)}</Text>
        </View>
        {expanded && hasBody ? (
          <View style={styles.logDetails}>
            {item.details ? (
              <Text style={styles.logDetailsText}>{item.details}</Text>
            ) : null}
            {item.context
              ? Object.entries(item.context).map(([key, value]) => (
                  <Text key={key} style={styles.logContextLine}>
                    {key}: {String(value)}
                  </Text>
                ))
              : null}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {fileName}
        </Text>
        <Button title="Back" variant="ghost" size="sm" onPress={onGoBack} />
      </View>

      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Type</Text>
        <View style={styles.chipRow}>
          <FilterChip
            label="All"
            selected={selectedTypes.size === 0}
            onPress={selectAllTypes}
          />
          {PRIMARY_LOG_TYPES.map(type => (
            <FilterChip
              key={type}
              label={LOG_TYPE_META[type].chipLabel}
              selected={selectedTypes.has(type)}
              onPress={() => toggleType(type)}
            />
          ))}
          {OVERFLOW_LOG_TYPES.filter(type => selectedTypes.has(type)).map(
            type => (
              <FilterChip
                key={type}
                label={LOG_TYPE_META[type].chipLabel}
                selected
                onPress={() => toggleType(type)}
              />
            ),
          )}
          <View ref={typeMoreRef} collapsable={false}>
            <FilterChip
              label="More"
              selected={overflowTypeSelected}
              trailing
              onPress={() => openPopover('types', typeMoreRef)}
            />
          </View>
        </View>

        <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>
          Date Range
        </Text>
        <View style={styles.chipRow}>
          {PRIMARY_DATE_RANGES.map(option => (
            <FilterChip
              key={option.id}
              label={option.label}
              selected={dateRange === option.id}
              onPress={() => selectDateRange(option.id)}
            />
          ))}
          {OVERFLOW_DATE_RANGES.filter(option => option.id === dateRange).map(
            option => (
              <FilterChip
                key={option.id}
                label={option.label}
                selected
                onPress={() => selectDateRange(option.id)}
              />
            ),
          )}
          <View ref={dateMoreRef} collapsable={false}>
            <FilterChip
              label="More"
              selected={overflowDateSelected}
              trailing
              onPress={() => openPopover('dates', dateMoreRef)}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={item => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No matching logs</Text>
            <Text style={styles.emptyBody}>
              Try another type combination or a wider date range.
            </Text>
          </View>
        }
      />

      <AnchoredPopover
        visible={popover === 'types'}
        anchor={anchor}
        onClose={closePopover}
        width={280}>
        <Text style={styles.popoverTitle}>More Types</Text>
        {OVERFLOW_LOG_TYPES.map((type, index) => {
          const selected = selectedTypes.has(type);
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.popoverItem,
                index === OVERFLOW_LOG_TYPES.length - 1 && styles.popoverItemLast,
              ]}
              onPress={() => toggleType(type)}
              accessibilityRole="checkbox"
              accessibilityState={{checked: selected}}>
              <Text
                style={[
                  styles.popoverItemLabel,
                  selected && styles.popoverItemLabelSelected,
                ]}>
                {LOG_TYPE_META[type].chipLabel}
              </Text>
              {selected ? (
                <Icon name="check" size={20} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </AnchoredPopover>

      <AnchoredPopover
        visible={popover === 'dates'}
        anchor={anchor}
        onClose={closePopover}
        width={280}>
        <Text style={styles.popoverTitle}>More Date Ranges</Text>
        {OVERFLOW_DATE_RANGES.map((option, index) => {
          const selected = dateRange === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.popoverItem,
                index === OVERFLOW_DATE_RANGES.length - 1 &&
                  styles.popoverItemLast,
              ]}
              onPress={() => selectDateRange(option.id)}
              accessibilityRole="menuitem">
              <Text
                style={[
                  styles.popoverItemLabel,
                  selected && styles.popoverItemLabelSelected,
                ]}>
                {option.label}
              </Text>
              {selected ? (
                <Icon name="check" size={20} color={colors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </AnchoredPopover>
    </SafeAreaView>
  );
};

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  trailing?: boolean;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  selected,
  onPress,
  trailing,
}) => (
  <TouchableOpacity
    style={[styles.chip, selected ? styles.chipSelected : styles.chipIdle]}
    onPress={onPress}
    activeOpacity={0.75}
    accessibilityRole="button"
    accessibilityState={{selected}}>
    <Text
      style={[
        styles.chipLabel,
        selected ? styles.chipLabelSelected : styles.chipLabelIdle,
      ]}>
      {label}
    </Text>
    {trailing ? (
      <Icon
        name="arrow-drop-down"
        size={20}
        color={selected ? colors.primaryForeground : colors.foreground}
      />
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerTitle: {
    ...typography['2xl'],
    fontWeight: '700',
    color: colors.foreground,
    flex: 1,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  filterLabel: {
    ...typography.xs,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  filterLabelSpaced: {
    marginTop: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 2,
  },
  chipIdle: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    ...typography.sm,
    fontWeight: '600',
  },
  chipLabelIdle: {
    color: colors.foreground,
  },
  chipLabelSelected: {
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  logRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  logMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  logCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    ...typography.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  logMessage: {
    ...typography.base,
    color: colors.foreground,
  },
  logTime: {
    ...typography.sm,
    color: colors.mutedForeground,
    flexShrink: 0,
  },
  logDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  logDetailsText: {
    ...typography.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: colors.foreground,
  },
  logContextLine: {
    ...typography.sm,
    color: colors.mutedForeground,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    ...typography.lg,
    fontWeight: '700',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...typography.base,
    color: colors.mutedForeground,
  },
  popoverTitle: {
    ...typography.base,
    fontWeight: '700',
    color: colors.foreground,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  popoverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTargets.min,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  popoverItemLast: {
    paddingBottom: 4,
  },
  popoverItemLabel: {
    ...typography.base,
    color: colors.foreground,
  },
  popoverItemLabelSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
});

export default OpenLogsScreen;
