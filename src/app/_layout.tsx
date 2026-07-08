import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import * as SplashScreen from 'expo-splash-screen';
import { Suspense, useEffect } from 'react';

import { DatabaseLoadingFallback } from '@/components/database-loading-fallback';
import { AuthProvider } from '@/lib/auth-context';
import { ReadingPreferencesProvider } from '@/lib/reading-preferences';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
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
  );
}
