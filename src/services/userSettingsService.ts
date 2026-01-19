import {safeAsyncStorage} from '../utils/storage';
import {Truck, Trailer} from './vehicleService';

const TRUCK_ID_KEY_PREFIX = 'user_truck_id_';
const TRUCK_KEY_PREFIX = 'user_truck_';
const TRAILER_KEY_PREFIX = 'user_trailer_';

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

/**
 * Get the selected truck for a user
 * @param username - The username to get truck for
 * @returns The truck object or null if not set
 */
export const getUserTruck = async (username: string): Promise<Truck | null> => {
  try {
    const key = `${TRUCK_KEY_PREFIX}${username}`;
    const truckJson = await safeAsyncStorage.getItem(key);
    if (truckJson) {
      return JSON.parse(truckJson) as Truck;
    }
    return null;
  } catch (error) {
    console.error('Error getting user truck:', error);
    return null;
  }
};

/**
 * Save the truck for a user
 * @param username - The username to save truck for
 * @param truck - The truck object to save
 */
export const saveUserTruck = async (username: string, truck: Truck): Promise<void> => {
  try {
    const key = `${TRUCK_KEY_PREFIX}${username}`;
    await safeAsyncStorage.setItem(key, JSON.stringify(truck));
    // Also save truck ID for backward compatibility
    await saveUserTruckId(username, truck.number);
  } catch (error) {
    console.error('Error saving user truck:', error);
    throw error;
  }
};

/**
 * Get the selected trailer for a user
 * @param username - The username to get trailer for
 * @returns The trailer object or null if not set
 */
export const getUserTrailer = async (username: string): Promise<Trailer | null> => {
  try {
    const key = `${TRAILER_KEY_PREFIX}${username}`;
    const trailerJson = await safeAsyncStorage.getItem(key);
    if (trailerJson) {
      return JSON.parse(trailerJson) as Trailer;
    }
    return null;
  } catch (error) {
    console.error('Error getting user trailer:', error);
    return null;
  }
};

/**
 * Save the trailer for a user
 * @param username - The username to save trailer for
 * @param trailer - The trailer object to save (or null for "No Trailer")
 */
export const saveUserTrailer = async (username: string, trailer: Trailer | null): Promise<void> => {
  try {
    const key = `${TRAILER_KEY_PREFIX}${username}`;
    if (trailer) {
      await safeAsyncStorage.setItem(key, JSON.stringify(trailer));
    } else {
      await safeAsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Error saving user trailer:', error);
    throw error;
  }
};

/**
 * Clear vehicle selections for a user
 * @param username - The username to clear vehicles for
 */
export const clearUserVehicles = async (username: string): Promise<void> => {
  try {
    await clearUserTruckId(username);
    const truckKey = `${TRUCK_KEY_PREFIX}${username}`;
    const trailerKey = `${TRAILER_KEY_PREFIX}${username}`;
    await safeAsyncStorage.removeItem(truckKey);
    await safeAsyncStorage.removeItem(trailerKey);
  } catch (error) {
    console.error('Error clearing user vehicles:', error);
    throw error;
  }
};
