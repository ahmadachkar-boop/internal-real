import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Storage utility that uses Capacitor Preferences on native platforms
 * and falls back to localStorage on web.
 *
 * This provides reliable data persistence across all platforms,
 * especially important for iOS where localStorage can be cleared by the system.
 */

const isNative = Capacitor.isNativePlatform();

/**
 * Set a value in storage
 * @param {string} key - The key to store the value under
 * @param {string} value - The value to store (must be a string)
 */
export const setItem = async (key, value) => {
  try {
    if (isNative) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Error setting ${key} in storage:`, error);
  }
};

/**
 * Get a value from storage
 * @param {string} key - The key to retrieve
 * @returns {Promise<string|null>} The stored value or null if not found
 */
export const getItem = async (key) => {
  try {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Error getting ${key} from storage:`, error);
    return null;
  }
};

/**
 * Remove a value from storage
 * @param {string} key - The key to remove
 */
export const removeItem = async (key) => {
  try {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
};

/**
 * Clear all storage
 */
export const clear = async () => {
  try {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
};

/**
 * Set a JSON object in storage
 * @param {string} key - The key to store under
 * @param {Object} value - The object to store
 */
export const setJSON = async (key, value) => {
  try {
    const jsonString = JSON.stringify(value);
    await setItem(key, jsonString);
  } catch (error) {
    console.error(`Error setting JSON ${key}:`, error);
  }
};

/**
 * Get a JSON object from storage
 * @param {string} key - The key to retrieve
 * @returns {Promise<Object|null>} The parsed object or null if not found/invalid
 */
export const getJSON = async (key) => {
  try {
    const value = await getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting JSON ${key}:`, error);
    return null;
  }
};

/**
 * Synchronous fallback for when async is not possible (use sparingly)
 * Only works on web platform, returns null on native
 */
export const getItemSync = (key) => {
  if (!isNative) {
    return localStorage.getItem(key);
  }
  console.warn('getItemSync called on native platform - use async getItem instead');
  return null;
};

/**
 * Synchronous fallback for when async is not possible (use sparingly)
 * Only works on web platform
 */
export const setItemSync = (key, value) => {
  if (!isNative) {
    localStorage.setItem(key, value);
  } else {
    console.warn('setItemSync called on native platform - use async setItem instead');
  }
};

/**
 * Migrate existing localStorage data to Capacitor Preferences (run once on app init)
 */
export const migrateLocalStorageToPreferences = async () => {
  if (!isNative) {
    console.log('Skipping migration - not on native platform');
    return;
  }

  const keysToMigrate = [
    'selectedCar',
    'viewMode',
    'locationEnabled',
    'couchNav_messageQueue',
    'couchNav_lastLocation'
  ];

  let migratedCount = 0;

  for (const key of keysToMigrate) {
    try {
      const localValue = localStorage.getItem(key);
      if (localValue !== null) {
        await Preferences.set({ key, value: localValue });
        migratedCount++;
        console.log(`Migrated ${key} to Preferences`);
      }
    } catch (error) {
      console.error(`Error migrating ${key}:`, error);
    }
  }

  if (migratedCount > 0) {
    console.log(`✅ Migrated ${migratedCount} items from localStorage to Preferences`);
  }
};
