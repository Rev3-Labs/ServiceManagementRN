import {safeAsyncStorage} from '../utils/storage';

export interface DropWasteRecord {
  orderNumber: string;
  containerIds: string[];
  transferLocation: string;
  dropDate: string; // ISO date string
  dropTime: string; // Time string (HH:mm)
  droppedAt: number; // Unix timestamp in milliseconds
  truckId: string;
  username?: string;
}

const DROP_WASTE_KEY_PREFIX = 'drop_waste_';
const DROPPED_ORDERS_KEY = 'dropped_orders';
const DROPPED_CONTAINERS_KEY = 'dropped_containers';

/**
 * Mark orders and containers as dropped
 * @param orderNumbers - Array of order numbers to mark as dropped
 * @param containerIds - Array of container IDs to mark as dropped
 * @param transferLocation - Transfer location name
 * @param dropDate - Drop date (ISO date string)
 * @param dropTime - Drop time (HH:mm format)
 * @param truckId - Truck ID
 * @param username - Optional username
 */
export const dropWaste = async (
  orderNumbers: string[],
  containerIds: string[],
  transferLocation: string,
  dropDate: string,
  dropTime: string,
  truckId: string,
  username?: string,
): Promise<void> => {
  try {
    const droppedAt = Date.now();
    
    // Create drop records for each order
    const dropRecords: DropWasteRecord[] = [];
    for (const orderNumber of orderNumbers) {
      // Filter containers for this specific order
      // Note: containerIds should already be filtered by orderNumber by the caller
      const record: DropWasteRecord = {
        orderNumber,
        containerIds: containerIds, // All containers passed are for these orders
        transferLocation,
        dropDate,
        dropTime,
        droppedAt,
        truckId,
        username,
      };
      dropRecords.push(record);
      
      // Store individual drop record
      const dropKey = `${DROP_WASTE_KEY_PREFIX}${orderNumber}`;
      await safeAsyncStorage.setItem(dropKey, JSON.stringify(record));
    }

    // Update dropped orders list
    const existingDroppedOrders = await getDroppedOrders();
    const updatedDroppedOrders = [...new Set([...existingDroppedOrders, ...orderNumbers])];
    await safeAsyncStorage.setItem(DROPPED_ORDERS_KEY, JSON.stringify(updatedDroppedOrders));

    // Update dropped containers list
    const existingDroppedContainers = await getDroppedContainers();
    const updatedDroppedContainers = [...new Set([...existingDroppedContainers, ...containerIds])];
    await safeAsyncStorage.setItem(DROPPED_CONTAINERS_KEY, JSON.stringify(updatedDroppedContainers));
  } catch (error) {
    console.error('Error dropping waste:', error);
    throw error;
  }
};

/**
 * Get list of dropped order numbers
 * @returns Array of dropped order numbers
 */
export const getDroppedOrders = async (): Promise<string[]> => {
  try {
    const stored = await safeAsyncStorage.getItem(DROPPED_ORDERS_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting dropped orders:', error);
    return [];
  }
};

/**
 * Get list of dropped container IDs
 * @returns Array of dropped container IDs
 */
export const getDroppedContainers = async (): Promise<string[]> => {
  try {
    const stored = await safeAsyncStorage.getItem(DROPPED_CONTAINERS_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting dropped containers:', error);
    return [];
  }
};

/**
 * Check if an order is dropped
 * @param orderNumber - Order number to check
 * @returns True if order is dropped
 */
export const isOrderDropped = async (orderNumber: string): Promise<boolean> => {
  try {
    const droppedOrders = await getDroppedOrders();
    return droppedOrders.includes(orderNumber);
  } catch (error) {
    console.error('Error checking if order is dropped:', error);
    return false;
  }
};

/**
 * Check if a container is dropped
 * @param containerId - Container ID to check
 * @returns True if container is dropped
 */
export const isContainerDropped = async (containerId: string): Promise<boolean> => {
  try {
    const droppedContainers = await getDroppedContainers();
    return droppedContainers.includes(containerId);
  } catch (error) {
    console.error('Error checking if container is dropped:', error);
    return false;
  }
};

/**
 * Get drop record for an order
 * @param orderNumber - Order number
 * @returns Drop record or null
 */
export const getDropRecordForOrder = async (
  orderNumber: string,
): Promise<DropWasteRecord | null> => {
  try {
    const dropKey = `${DROP_WASTE_KEY_PREFIX}${orderNumber}`;
    const stored = await safeAsyncStorage.getItem(dropKey);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting drop record for order:', error);
    return null;
  }
};










