import {
  AuthCredential,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { auth, firestore } from '@/lib/firebase';

// A plain, serializable snapshot of the fields screens actually need. We
// deliberately don't store the Firebase SDK's User object directly: it's a
// mutable class instance, and updateProfile()/reload() mutate it in place
// rather than replacing it — so if this were the state value, React's
// setState would see the identical object reference and skip the re-render,
// silently dropping the update from the UI (this happened with displayName
// during testing).
type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
};

function toAppUser(user: User | null): AppUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
}

type AuthContextValue = {
  user: AppUser | null;
  initializing: boolean;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  linkGuestWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogleCredential: (credential: AuthCredential) => Promise<void>;
  // Web-only for now: native iOS/Android Google sign-in needs
  // @react-native-google-signin/google-signin, which requires a custom dev
  // client build and SHA-1 fingerprints from that build — neither exists
  // yet. See the comment on signInWithGooglePopup below.
  signInWithGooglePopup: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function upsertUserDocument(user: User) {
  const userRef = doc(firestore, 'users', user.uid);
  const existing = await getDoc(userRef);

  await setDoc(
    userRef,
    {
      displayName: user.displayName ?? null,
      email: user.email ?? null,
      photoUrl: user.photoURL ?? null,
      isAnonymous: user.isAnonymous,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(toAppUser(nextUser));
      setInitializing(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      async signUpWithEmail(email, password, displayName) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName });
        await upsertUserDocument(credential.user);
        setUser(toAppUser(credential.user));
      },
      async signInWithEmail(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },
      async sendPasswordReset(email) {
        await sendPasswordResetEmail(auth, email);
      },
      async continueAsGuest() {
        const credential = await signInAnonymously(auth);
        await upsertUserDocument(credential.user);
      },
      async linkGuestWithEmail(email, password, displayName) {
        if (!auth.currentUser) {
          throw new Error('No guest session to upgrade.');
        }
        const emailCredential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(auth.currentUser, emailCredential);
        await updateProfile(result.user, { displayName });
        await upsertUserDocument(result.user);
        setUser(toAppUser(result.user));
      },
      async signInWithGoogleCredential(credential) {
        const result =
          auth.currentUser?.isAnonymous
            ? await linkWithCredential(auth.currentUser, credential)
            : await signInWithCredential(auth, credential);
        await upsertUserDocument(result.user);
        setUser(toAppUser(result.user));
      },
      // Uses Firebase's browser popup flow directly — no extra native
      // package needed, unlike iOS/Android (see the type comment above).
      async signInWithGooglePopup() {
        const provider = new GoogleAuthProvider();
        const result = auth.currentUser?.isAnonymous
          ? await linkWithPopup(auth.currentUser, provider)
          : await signInWithPopup(auth, provider);
        await upsertUserDocument(result.user);
        setUser(toAppUser(result.user));
      },
      async signOutUser() {
        await signOut(auth);
      },
    }),
    [user, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
