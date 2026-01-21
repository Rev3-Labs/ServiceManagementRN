import React, {useState} from 'react';
import {View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import ManifestScreen from './src/screens/ManifestScreen';
import WasteCollectionScreen from './src/screens/WasteCollectionScreen';
import MaterialsSuppliesScreen from './src/screens/MaterialsSuppliesScreen';
import ServiceCloseoutScreen from './src/screens/ServiceCloseoutScreen';
import SettingsScreen from './src/screens/SettingsScreen';

type Screen = 'Login' | 'Manifest' | 'WasteCollection' | 'MaterialsSupplies' | 'ServiceCloseout' | 'Settings';

interface NavigationState {
  currentScreen: Screen;
  previousScreens: Screen[];
}

function App(): React.JSX.Element {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentScreen: 'Login',
    previousScreens: [],
  });
  const [username, setUsername] = useState<string>('');

  const navigate = (screen: Screen) => {
    setNavigationState(prev => ({
      currentScreen: screen,
      previousScreens: [...prev.previousScreens, prev.currentScreen],
    }));
  };

  const goBack = () => {
    setNavigationState(prev => {
      const newPreviousScreens = [...prev.previousScreens];
      const previousScreen = newPreviousScreens.pop() as Screen;
      return {
        currentScreen: previousScreen || 'Login',
        previousScreens: newPreviousScreens,
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

