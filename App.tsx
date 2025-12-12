import React, {useState, useEffect} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PaperProvider} from 'react-native-paper';
import {StatusBar} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import WasteCollectionScreen from './src/screens/WasteCollectionScreen';
import ManifestScreen from './src/screens/ManifestScreen';
import MaterialsSuppliesScreen from './src/screens/MaterialsSuppliesScreen';
import ServiceCloseoutScreen from './src/screens/ServiceCloseoutScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');

  // Check if user is already logged in (e.g., from AsyncStorage)
  useEffect(() => {
    // Simulate checking for existing session
    // In production, check AsyncStorage or secure storage
    const checkAuth = async () => {
      // For demo, we'll always show splash then login
      // In production: const token = await AsyncStorage.getItem('authToken');
      // setIsAuthenticated(!!token);
    };
    checkAuth();
  }, []);

  const handleSplashFinish = () => {
    setIsLoading(false);
  };

  const handleLogin = (loginUsername: string, password: string) => {
    // In production, validate credentials with API
    // For demo, accept any credentials
    // Store auth token: await AsyncStorage.setItem('authToken', token);
    setUsername(loginUsername);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <StatusBar barStyle="light-content" backgroundColor="#65B230" />
          <SplashScreen onFinish={handleSplashFinish} />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
          <LoginScreen onLogin={handleLogin} />
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <PaperProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="WasteCollection"
              screenOptions={{
                headerShown: false,
                contentStyle: {backgroundColor: '#f9fafb'},
              }}>
              <Stack.Screen name="WasteCollection">
                {props => (
                  <WasteCollectionScreen
                    {...props}
                    username={username}
                    onLogout={() => {
                      setUsername('');
                      setIsAuthenticated(false);
                    }}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen name="Manifest" component={ManifestScreen} />
              <Stack.Screen
                name="MaterialsSupplies"
                component={MaterialsSuppliesScreen}
              />
              <Stack.Screen
                name="ServiceCloseout"
                component={ServiceCloseoutScreen}
              />
              <Stack.Screen name="Settings">
                {props => (
                  <SettingsScreen
                    {...props}
                    username={username}
                    onBack={() => props.navigation.goBack()}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </NavigationContainer>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;

