// In-memory storage implementation (AsyncStorage not working in build)
const memoryStorage: {[key: string]: string} = {};

console.log('[Storage] Using in-memory storage (data will not persist across app restarts)');

export const safeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return memoryStorage[key] || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStorage[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryStorage[key];
  },
};
