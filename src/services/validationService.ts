import {ValidationIssue} from '../types/wasteCollection';
import {safeAsyncStorage} from '../utils/storage';

interface PersistedValidationIssues {
  [orderNumber: string]: ValidationIssue[];
}

const STORAGE_KEY = 'validation_issues';
let cachedIssues: PersistedValidationIssues = {};

// Initialize by loading from storage
const initialize = async () => {
  try {
    const stored = await safeAsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedIssues = JSON.parse(stored);
    }
  } catch (error) {
    console.error('[ValidationService] Error loading validation issues:', error);
    cachedIssues = {};
  }
};

// Save to storage
const saveToStorage = async () => {
  try {
    await safeAsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedIssues));
  } catch (error) {
    console.error('[ValidationService] Error saving validation issues:', error);
  }
};

// Initialize on module load
initialize();

/**
 * Get persisted validation issues for an order
 */
export const getPersistedIssues = (orderNumber: string): ValidationIssue[] => {
  return cachedIssues[orderNumber] || [];
};

/**
 * Update validation issues for an order
 * This merges new issues with existing ones, only removing issues that are resolved
 * 
 * Important: Persisted issues are only removed when they're NOT in current validation.
 * This means if validation runs and an issue is no longer present, it's considered resolved.
 */
export const updateValidationIssues = async (
  orderNumber: string,
  currentIssues: ValidationIssue[],
): Promise<ValidationIssue[]> => {
  const persistedIssues = cachedIssues[orderNumber] || [];
  
  // Create a map of current issue IDs for quick lookup
  const currentIssueIds = new Set(currentIssues.map(issue => issue.id));
  
  // Keep persisted issues that are still present in current issues
  // This ensures issues persist until they're actually resolved
  const stillValidIssues = persistedIssues.filter(issue => 
    currentIssueIds.has(issue.id)
  );
  
  // Add any new issues that weren't in persisted
  const newIssues = currentIssues.filter(issue => 
    !persistedIssues.some(p => p.id === issue.id)
  );
  
  // Merge: keep persisted issues that are still in current, plus any new issues
  const mergedIssues = [
    ...stillValidIssues,
    ...newIssues,
  ];
  
  // Update cache - clear if all issues are resolved
  if (mergedIssues.length === 0) {
    delete cachedIssues[orderNumber];
  } else {
    cachedIssues[orderNumber] = mergedIssues;
  }
  
  // Save to storage
  await saveToStorage();
  
  return mergedIssues;
};

/**
 * Clear validation issues for an order (when all are resolved)
 */
export const clearValidationIssues = async (orderNumber: string): Promise<void> => {
  delete cachedIssues[orderNumber];
  await saveToStorage();
};

/**
 * Mark a specific issue as resolved (remove it)
 */
export const resolveIssue = async (
  orderNumber: string,
  issueId: string,
): Promise<void> => {
  if (cachedIssues[orderNumber]) {
    cachedIssues[orderNumber] = cachedIssues[orderNumber].filter(
      issue => issue.id !== issueId
    );
    
    // If no issues left, remove the order entry
    if (cachedIssues[orderNumber].length === 0) {
      delete cachedIssues[orderNumber];
    }
    
    await saveToStorage();
  }
};

/**
 * Get all validation issues across all orders
 */
export const getAllValidationIssues = (): PersistedValidationIssues => {
  return {...cachedIssues};
};

/**
 * Force re-initialize from storage (useful for debugging or after storage changes)
 */
export const reloadFromStorage = async (): Promise<void> => {
  await initialize();
};
