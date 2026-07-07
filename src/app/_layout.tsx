import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { Suspense, useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { DatabaseLoadingFallback } from '@/components/database-loading-fallback';
import { AuthProvider } from '@/lib/auth-context';
import { ReadingPreferencesProvider } from '@/lib/reading-preferences';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Suspense fallback={<DatabaseLoadingFallback />}>
        <SQLiteProvider
          databaseName="bible.db"
          assetSource={{ assetId: require('@/assets/bible/bible.db') }}
          useSuspense>
          <AuthProvider>
            <ReadingPreferencesProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </ReadingPreferencesProvider>
          </AuthProvider>
        </SQLiteProvider>
      </Suspense>
    </ThemeProvider>
  );
}
