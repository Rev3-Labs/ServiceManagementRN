import {safeAsyncStorage} from '../utils/storage';

const TRUCK_ID_KEY_PREFIX = 'user_truck_id_';

/**
 * Get the last known truck ID for a user
 * @param username - The username to get truck ID for
 * @returns The truck ID or null if not set
 */
export const getUserTruckId = async (username: string): Promise<string | null> => {
  try {
    const key = `${TRUCK_ID_KEY_PREFIX}${username}`;
    const truckId = await safeAsyncStorage.getItem(key);
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
    await safeAsyncStorage.setItem(key, truckId);
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
    await safeAsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing user truck ID:', error);
    throw error;
  }
};
