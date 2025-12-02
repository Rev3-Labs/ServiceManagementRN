// Web mock for @react-native-community/netinfo
const NetInfo = {
  fetch: async () => {
    return {
      isConnected: navigator.onLine,
      isInternetReachable: navigator.onLine,
      type: navigator.onLine ? 'wifi' : 'none',
    };
  },
  addEventListener: (callback) => {
    const handleOnline = () => {
      callback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    };
    
    const handleOffline = () => {
      callback({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial state
    callback({
      isConnected: navigator.onLine,
      isInternetReachable: navigator.onLine,
      type: navigator.onLine ? 'wifi' : 'none',
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};

export default NetInfo;







