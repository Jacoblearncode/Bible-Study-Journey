import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorMessage, Field, PrimaryButton, SecondaryButton } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already in use — try signing in instead.';
    case 'auth/invalid-email':
      return 'That doesn’t look like a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Email or password is incorrect.';
    case 'auth/user-not-found':
      return "We couldn't find an account with that email.";
    default:
      return 'Something went wrong. Please try again.';
  }
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.formGap}>
        <ThemedText type="smallBold">Check your email</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          If there&apos;s an account for {email.trim()}, a password reset link is on its way.
        </ThemedText>
        <SecondaryButton label="Back to sign in" onPress={onBack} />
      </View>
    );
  }

  return (
    <View style={styles.formGap}>
      <ThemedText type="smallBold">Reset your password</ThemedText>
      <Field placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <ErrorMessage message={error} />
      <PrimaryButton
        label={submitting ? 'Sending...' : 'Send reset email'}
        onPress={submit}
        disabled={submitting || !email.trim()}
      />
      <SecondaryButton label="Back to sign in" onPress={onBack} disabled={submitting} />
    </View>
  );
}

function SignedOutView() {
  const { signUpWithEmail, signInWithEmail, continueAsGuest, signInWithGooglePopup } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'reset'>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signUp') {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'reset') {
    return <ForgotPasswordForm onBack={() => setMode('signIn')} />;
  }

  return (
    <View style={styles.formGap}>
      <View style={styles.tabRow}>
        <Pressable onPress={() => setMode('signIn')} style={styles.tabItem}>
          <ThemedText type={mode === 'signIn' ? 'smallBold' : 'small'}>Sign in</ThemedText>
        </Pressable>
        <Pressable onPress={() => setMode('signUp')} style={styles.tabItem}>
          <ThemedText type={mode === 'signUp' ? 'smallBold' : 'small'}>Sign up</ThemedText>
        </Pressable>
      </View>

      {mode === 'signUp' && (
        <Field placeholder="Name" value={displayName} onChangeText={setDisplayName} />
      )}
      <Field placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {mode === 'signIn' && (
        <Pressable onPress={() => setMode('reset')}>
          <ThemedText type="small" themeColor="textSecondary">
            Forgot password?
          </ThemedText>
        </Pressable>
      )}

      <ErrorMessage message={error} />

      <PrimaryButton
        label={submitting ? 'Please wait...' : mode === 'signUp' ? 'Create account' : 'Log in'}
        onPress={submit}
        disabled={submitting || !email || !password || (mode === 'signUp' && !displayName)}
      />

      <ThemedText type="small" themeColor="textSecondary" style={styles.orText}>
        or
      </ThemedText>

      {Platform.OS === 'web' && (
        <SecondaryButton
          label="Sign in with Google"
          disabled={submitting}
          onPress={async () => {
            setError(null);
            setSubmitting(true);
            try {
              await signInWithGooglePopup();
            } catch (err) {
              console.error('Google sign-in error', err);
              setError(friendlyAuthError(err));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}

      <SecondaryButton
        label="Continue as guest"
        disabled={submitting}
        onPress={async () => {
          setError(null);
          setSubmitting(true);
          try {
            await continueAsGuest();
          } catch (err) {
            setError(friendlyAuthError(err));
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </View>
  );
}

function GuestUpgradeForm() {
  const { linkGuestWithEmail, signInWithGooglePopup } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await linkGuestWithEmail(email.trim(), password, displayName.trim());
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formGap}>
      <ThemedText type="smallBold">Save your account</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Add an email and password so your notes and posts aren&apos;t lost if you switch devices.
        Everything you&apos;ve already saved as a guest carries over.
      </ThemedText>
      <Field placeholder="Name" value={displayName} onChangeText={setDisplayName} />
      <Field placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorMessage message={error} />
      <PrimaryButton
        label={submitting ? 'Please wait...' : 'Save account'}
        onPress={submit}
        disabled={submitting || !email || !password || !displayName}
      />
      {Platform.OS === 'web' && (
        <SecondaryButton
          label="Or link a Google account"
          disabled={submitting}
          onPress={async () => {
            setError(null);
            setSubmitting(true);
            try {
              await signInWithGooglePopup();
            } catch (err) {
              setError(friendlyAuthError(err));
            } finally {
              setSubmitting(false);
            }
          }}
        />
      )}
    </View>
  );
}

function SignedInView() {
  const { user, signOutUser } = useAuth();
  if (!user) return null;

  return (
    <View style={styles.formGap}>
      <ThemedView type="backgroundElement" elevated style={styles.card}>
        <ThemedText type="smallBold">{user.displayName ?? 'Anonymous'}</ThemedText>
        {user.email && (
          <ThemedText type="small" themeColor="textSecondary">
            {user.email}
          </ThemedText>
        )}
      </ThemedView>

      {user.isAnonymous && <GuestUpgradeForm />}

      <SecondaryButton label="Sign out" onPress={() => signOutUser()} />
    </View>
  );
}

export default function ProfileScreen() {
  const { user, initializing } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Profile
        </ThemedText>

        {initializing ? (
          <ActivityIndicator style={styles.loading} />
        ) : user ? (
          <SignedInView />
        ) : (
          <SignedOutView />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    marginBottom: Spacing.three,
  },
  loading: {
    marginTop: Spacing.five,
  },
  formGap: {
    gap: Spacing.three,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.one,
  },
  tabItem: {
    paddingVertical: Spacing.one,
  },
  orText: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.half,
  },
});
