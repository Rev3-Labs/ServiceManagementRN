// Platform-specific imports
let AsyncStorage: any;

if (typeof window !== 'undefined') {
  // Web platform
  AsyncStorage = {
    getItem: async (key: string) => {
      return localStorage.getItem(key);
    },
    setItem: async (key: string, value: string) => {
      localStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
      localStorage.removeItem(key);
    },
  };
} else {
  // Native platform
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
}

const TRUCK_ID_KEY_PREFIX = 'user_truck_id_';

/**
 * Get the last known truck ID for a user
 * @param username - The username to get truck ID for
 * @returns The truck ID or null if not set
 */
export const getUserTruckId = async (username: string): Promise<string | null> => {
  try {
    const key = `${TRUCK_ID_KEY_PREFIX}${username}`;
    const truckId = await AsyncStorage.getItem(key);
    return truckId;
  } catch (error) {
    console.error('Error getting user truck ID:', error);
    return null;
  }
};

/**
 * Save the truck ID for a user
 * @param username - The username to save truck ID for
 * @param truckId - The truck ID to save
 */
export const saveUserTruckId = async (username: string, truckId: string): Promise<void> => {
  try {
    const key = `${TRUCK_ID_KEY_PREFIX}${username}`;
    await AsyncStorage.setItem(key, truckId);
  } catch (error) {
    console.error('Error saving user truck ID:', error);
    throw error;
  }
};

/**
 * Clear the truck ID for a user
 * @param username - The username to clear truck ID for
 */
export const clearUserTruckId = async (username: string): Promise<void> => {
  try {
    const key = `${TRUCK_ID_KEY_PREFIX}${username}`;
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing user truck ID:', error);
    throw error;
  }
};
