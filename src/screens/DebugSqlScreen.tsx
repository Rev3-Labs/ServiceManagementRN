import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button} from '../components/Button';
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from '../styles/theme';
import {executeQuery, QueryResult, QueryError} from '../services/debugQueryService';

interface DebugSqlScreenProps {
  onGoBack: () => void;
}

export const DebugSqlScreen: React.FC<DebugSqlScreenProps> = ({onGoBack}) => {
  const [query, setQuery] = useState('SELECT 1 AS id, \'test\' AS name');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<QueryError | null>(null);

  const handleExecute = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await executeQuery(query);
      if (response.ok) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch (e: unknown) {
      setError({ message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, [query]);

  /** Run a query that will fail, for testing the error UI. */
  const handleTestError = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await executeQuery('DROP TABLE nonexistent');
      if (response.ok) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch (e: unknown) {
      setError({ message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SQL Console</Text>
        <Button title="Back" variant="ghost" size="sm" onPress={onGoBack} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.querySection}>
          <Text style={styles.sectionLabel}>Query</Text>
          <TextInput
            style={styles.queryInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Enter SQL (e.g. SELECT * FROM ...)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            editable={!loading}
          />
          <View style={styles.executeRow}>
            <Button
              title={loading ? 'Executing…' : 'Execute'}
              variant="primary"
              size="md"
              onPress={handleExecute}
              disabled={loading}
              loading={loading}
            />

          </View>
        </View>

        {(result !== null || error !== null) && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionLabel}>
              {result !== null ? 'Results' : 'Error'}
            </Text>
            {error !== null ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error.message}</Text>
              </View>
            ) : (
              result !== null && (
                <ScrollView
                  horizontal
                  style={styles.tableScroll}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      {result.columns.map((col) => (
                        <Text
                          key={col}
                          style={styles.tableHeaderCell}
                          numberOfLines={1}
                        >
                          {col}
                        </Text>
                      ))}
                    </View>
                    {result.rows.length === 0 ? (
                      <View style={styles.tableRow}>
                        <Text style={styles.emptyText}>
                          No rows returned.
                        </Text>
                      </View>
                    ) : (
                      result.rows.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.tableRow}>
                          {result.columns.map((col) => {
                            const val = row[col];
                            return (
                              <Text
                                key={col}
                                style={styles.tableCell}
                                numberOfLines={1}
                              >
                                {val == null ? 'NULL' : String(val)}
                              </Text>
                            );
                          })}
                        </View>
                      ))
                    )}
                  </View>
                </ScrollView>
              )
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const cellPadding = spacing.sm;
const cellMinWidth = 100;

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
  },
  headerTitle: {
    ...typography['2xl'],
    fontWeight: '700',
    color: colors.foreground,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  querySection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...typography.base,
    fontWeight: '600',
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  queryInput: {
    ...typography.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 120,
    color: colors.foreground,
  },
  executeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  testErrorButton: {
    flexShrink: 0,
  },
  resultsSection: {
    marginTop: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.destructive + '18',
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.base,
    color: colors.destructive,
  },
  tableScroll: {
    maxHeight: 320,
  },
  tableScrollContent: {
    paddingBottom: spacing.md,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.muted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    ...typography.sm,
    fontWeight: '600',
    color: colors.foreground,
    paddingVertical: cellPadding,
    paddingHorizontal: cellPadding,
    minWidth: cellMinWidth,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tableCell: {
    ...typography.sm,
    color: colors.foreground,
    paddingVertical: cellPadding,
    paddingHorizontal: cellPadding,
    minWidth: cellMinWidth,
  },
  emptyText: {
    ...typography.sm,
    color: colors.mutedForeground,
    padding: spacing.md,
  },
});
