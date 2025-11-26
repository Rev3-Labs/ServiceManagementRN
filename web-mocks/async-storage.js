// Web mock for @react-native-async-storage/async-storage
const AsyncStorage = {
  getItem: async (key) => {
    return localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    localStorage.removeItem(key);
  },
  clear: async () => {
    localStorage.clear();
  },
  getAllKeys: async () => {
    return Object.keys(localStorage);
  },
  multiGet: async (keys) => {
    return keys.map(key => [key, localStorage.getItem(key)]);
  },
  multiSet: async (keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  },
  multiRemove: async (keys) => {
    keys.forEach(key => localStorage.removeItem(key));
  },
};

export default AsyncStorage;


