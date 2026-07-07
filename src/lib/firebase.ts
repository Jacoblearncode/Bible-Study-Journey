import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
/* eslint-disable import/no-duplicates -- split into two imports so ts-expect-error
   below only suppresses the one line that actually needs it. */
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  initializeAuth,
} from 'firebase/auth';
// @ts-expect-error -- getReactNativePersistence ships in the React Native build of
// @firebase/auth (resolved via Metro's "react-native" package.json export condition
// when this file is bundled for iOS/Android), but the published root type
// declarations only cover the browser/default build, so tsc can't see it.
import { getReactNativePersistence } from 'firebase/auth';
/* eslint-enable import/no-duplicates */
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Firebase Auth needs different persistence backends per platform: browser
// storage on web, AsyncStorage on iOS/Android (there is no `window.localStorage`
// there). See https://expo.fyi/firebase-js-auth-setup.
//
// popupRedirectResolver: getAuth() (browser-only) wires this up automatically,
// but initializeAuth() (needed here for the cross-platform persistence config
// above) does not — omitting it makes signInWithPopup/signInWithRedirect throw
// auth/argument-error on web.
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
  ...(Platform.OS === 'web' ? { popupRedirectResolver: browserPopupRedirectResolver } : {}),
});

export const firestore = getFirestore(app);

// Point at the local Firebase Emulator Suite (`firebase emulators:start`)
// instead of the real project when developing/testing, so sign-ups and
// Firestore writes don't touch production data. Android's emulator can't
// reach the host machine via "localhost", hence the 10.0.2.2 alias.
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  const emulatorHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(firestore, emulatorHost, 8080);
}
