/**
 * @format
 * Web entry point for React Native Web
 */

// Polyfill for react-native-screens on web
if (typeof window !== 'undefined') {
  // Enable screens for web
  require('react-native-screens').enableScreens();
  
  // Enable React DevTools in development
  if (process.env.NODE_ENV === 'development') {
    // React DevTools will automatically connect if browser extension is installed
    // Or use standalone: npm run devtools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('React DevTools detected');
    }
  }
}

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Register the app
AppRegistry.registerComponent(appName, () => App);

// Run the app when DOM is ready
function runApp() {
  if (typeof document === 'undefined') {
    console.warn('index.web.js loaded on non-web platform - skipping');
    return;
  }
  
  const rootTag = document.getElementById('root');
  if (!rootTag) {
    console.error('Root element not found!');
    return;
  }
  
  try {
    AppRegistry.runApplication(appName, {
      initialProps: {},
      rootTag: rootTag,
    });
    console.log('App started successfully');
  } catch (error) {
    console.error('Error starting app:', error);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runApp);
  } else {
    runApp();
  }
}

