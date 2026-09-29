import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomAlertContainer, customAlertRef } from '@/components/CustomAlert';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token');
        const segs = segments as string[];

        // Routes that don't require authentication
        const isPublicRoute =
          segs.length === 0 ||
          segs[0] === 'index' ||
          segs[0] === 'login' ||
          segs[0] === 'register' ||
          segs[0] === 'forgot-password';

        if (!token && !isPublicRoute) {
          // Not logged in → always go to login page
          router.replace('/login');
        }
        // No auto-redirect to dashboard: user must always go through login
      } catch (error) {
        console.error('Auth check error:', error);
        // On error, send to login for safety
        router.replace('/login');
      }
    };

    checkAuth();
  }, [segments, navigationState?.key, router]);

  return (
    <View style={styles.container}>
      {/* Top System Bar (Black) */}
      <View style={[styles.topBar, { height: insets.top }]} />
      
      <StatusBar style="light" backgroundColor="#000000" translucent={false} />
      
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="insurances/index" />
          <Stack.Screen name="insurances/new" />
          <Stack.Screen name="documents/index" />
          <Stack.Screen name="claims/index" />
          <Stack.Screen name="claims/[id]" />
          <Stack.Screen name="claims/new" />
        </Stack>
      </View>

      {/* Bottom System Bar (Gray) */}
      <View style={[styles.bottomBar, { height: insets.bottom }]} />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LayoutContent />
      <CustomAlertContainer ref={customAlertRef} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Root background
  },
  content: {
    flex: 1,
  },
  topBar: {
    backgroundColor: '#000000', // Black status bar area
    width: '100%',
  },
  bottomBar: {
    backgroundColor: '#808080', // Gray navigation bar area
    width: '100%',
  },
});
