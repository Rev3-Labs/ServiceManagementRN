/**
 * Debug SQL execution for admin users.
 * Replace executeQuery implementation with a real API call (e.g. POST /api/debug/query) when backend is available.
 */

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface QueryError {
  message: string;
}

export type QueryResponse = { ok: true; data: QueryResult } | { ok: false; error: QueryError };

const MOCK_DELAY_MS = 400;

/**
 * Execute a SQL query. Currently uses a mock implementation.
 * In production, call your backend: POST /api/debug/query with body { sql } and return { columns, rows } or { error }.
 */
export async function executeQuery(sql: string): Promise<QueryResponse> {
  const trimmed = sql.trim();
  if (!trimmed) {
    return { ok: false, error: { message: 'Query cannot be empty.' } };
  }

  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));

  const upper = trimmed.toUpperCase();
  if (upper.startsWith('SELECT')) {
    // Mock result: return a small result set so the UI can display a grid
    return {
      ok: true,
      data: {
        columns: ['id', 'name', 'value'],
        rows: [
          { id: 1, name: 'Sample A', value: 100 },
          { id: 2, name: 'Sample B', value: 200 },
          { id: 3, name: 'Sample C', value: 300 },
        ],
      },
    };
  }
  if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    return {
      ok: true,
      data: {
        columns: ['Rows affected'],
        rows: [{ 'Rows affected': 0 }],
      },
    };
  }

  return {
    ok: false,
    error: {
      message: 'Only SELECT, INSERT, UPDATE, and DELETE are supported in this mock. Connect a real backend for full SQL.',
    },
  };
}
