import { Stack, useRouter } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { setNavigation } from '../api/client';

function NavigationSetup() {
  const router = useRouter();
  
  useEffect(() => {
    // Set navigation for shared API client
    setNavigation({
      replace: (path) => router.replace(path),
      push: (path) => router.push(path),
    });
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationSetup />
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
          <Toast />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
