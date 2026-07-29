import React, {useState} from 'react';
import {View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import ManifestScreen from './src/screens/ManifestScreen';
import WasteCollectionScreen from './src/screens/WasteCollectionScreen';
import MaterialsSuppliesScreen from './src/screens/MaterialsSuppliesScreen';
import ServiceCloseoutScreen from './src/screens/ServiceCloseoutScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DevicesScreen from './src/screens/DevicesScreen';
import ProjectedInventoryScreen from './src/screens/ProjectedInventoryScreen';
import {DebugSqlScreen} from './src/screens/DebugSqlScreen';

type Screen =
  | 'Login'
  | 'Manifest'
  | 'WasteCollection'
  | 'MaterialsSupplies'
  | 'ServiceCloseout'
  | 'Settings'
  | 'Devices'
  | 'ProjectedInventory'
  | 'DebugSql';

interface NavigationState {
  currentScreen: Screen;
  previousScreens: Screen[];
  /** True only when we just navigated from Login → WasteCollection (so sync overlay shows once). False when returning via Back. */
  showPostLoginSyncOnWasteCollection: boolean;
}

function App(): React.JSX.Element {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: 'Login',
    previousScreens: [],
    showPostLoginSyncOnWasteCollection: false,
  });
  const [username, setUsername] = useState<string>('');

  const navigate = (screen: Screen) => {
    setNavigationState(prev => ({
      currentScreen: screen,
      previousScreens: [...prev.previousScreens, prev.currentScreen],
      showPostLoginSyncOnWasteCollection:
        screen === 'WasteCollection' && prev.currentScreen === 'Login',
    }));
  };

  const goBack = () => {
    setNavigationState(prev => {
      if (prev.previousScreens.length === 0) {
        // Avoid dumping a logged-in user onto Login when the stack is empty.
        if (username && prev.currentScreen !== 'Login') {
          return {
            ...prev,
            currentScreen: 'WasteCollection',
            showPostLoginSyncOnWasteCollection: false,
          };
        }
        return prev;
      }
      const newPreviousScreens = [...prev.previousScreens];
      const previousScreen = newPreviousScreens.pop() as Screen;
      const landingOnWasteCollection = previousScreen === 'WasteCollection';
      return {
        currentScreen: previousScreen,
        previousScreens: newPreviousScreens,
        showPostLoginSyncOnWasteCollection: landingOnWasteCollection
          ? false
          : prev.showPostLoginSyncOnWasteCollection,
      };
    });
  };

  const renderScreen = () => {
    switch (navigationState.currentScreen) {
      case 'Login':
        return (
          <LoginScreen
            onLogin={(user, password) => {
              console.log('[App] Login successful:', {username: user});
              setUsername(user);
              navigate('WasteCollection');
            }}
          />
        );
      case 'Manifest':
        return (
          <ManifestScreen
            onNavigate={navigate}
            onGoBack={goBack}
          />
        );
      case 'WasteCollection':
        return (
          <WasteCollectionScreen
            username={username}
            onNavigate={navigate}
            onGoBack={goBack}
            isPostLogin={navigationState.showPostLoginSyncOnWasteCollection}
          />
        );
      case 'MaterialsSupplies':
        return (
          <MaterialsSuppliesScreen
            onNavigate={navigate}
            onGoBack={goBack}
          />
        );
      case 'ServiceCloseout':
        return (
          <ServiceCloseoutScreen
            onNavigate={navigate}
            onGoBack={goBack}
          />
        );
      case 'Settings':
        return (
          <SettingsScreen
            username={username}
            onNavigate={navigate}
            onGoBack={goBack}
          />
        );
      case 'Devices':
        return <DevicesScreen onGoBack={goBack} />;
      case 'ProjectedInventory':
        return (
          <ProjectedInventoryScreen
            onNavigate={navigate}
            onGoBack={goBack}
          />
        );
      case 'DebugSql':
        return <DebugSqlScreen onGoBack={goBack} />;
      default:
        return <LoginScreen onLogin={() => navigate('Manifest')} />;
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{flex: 1}}>{renderScreen()}</View>
    </SafeAreaProvider>
  );
}

export default App;

