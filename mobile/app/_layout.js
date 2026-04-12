import { Stack, useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setNavigation } from '../api/client';
import AppSplash from '../components/AppSplash';
import AppIntro, { INTRO_SEEN_KEY } from '../components/AppIntro';
import ErrorBoundary from '../components/ErrorBoundary';
import { registerForPushNotifications } from '../utils/notifications';

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

function InnerLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introChecked, setIntroChecked] = useState(false);

  // Check AsyncStorage immediately on mount (runs in parallel with splash animation)
  // so introChecked is already true by the time splash finishes — no login flash.
  useEffect(() => {
    (async () => {
      // DEV ONLY: clear flag so intro is always testable
      if (__DEV__) {
        await AsyncStorage.removeItem(INTRO_SEEN_KEY).catch(() => {});
      }
      try {
        const seen = await AsyncStorage.getItem(INTRO_SEEN_KEY);
        setShowIntro(!seen);
      } catch {
        setShowIntro(true);
      } finally {
        setIntroChecked(true);
      }
    })();
  }, []);

  // Register push notifications when user is authenticated
  useEffect(() => {
    if (user?._id) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user?._id]);

  const handleIntroRegister = () => {
    setShowIntro(false);
    router.replace('/(auth)/register');
  };

  const handleIntroLogin = () => {
    setShowIntro(false);
    router.replace('/(auth)/login');
  };

  return (
    <>
      <NavigationSetup />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
      {/* AppIntro is mounted as soon as we know it's needed (while splash still covers it),
          so it's already visible the instant the splash fade-out completes — no login flash. */}
      {introChecked && showIntro && (
        <AppIntro
          onRegister={handleIntroRegister}
          onLogin={handleIntroLogin}
        />
      )}
      {!splashDone && (
        <AppSplash onFinish={() => setSplashDone(true)} />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <SocketProvider>
              <InnerLayout />
            </SocketProvider>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
