import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SecondaryButton } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { getBooks } from '@/lib/bible-queries';
import { bookDisplayName, type Book } from '@/lib/bible-types';
import { subscribeToAllHighlights } from '@/lib/notes-queries';
import type { Highlight } from '@/lib/notes-types';
import { useReadingPreferences } from '@/lib/reading-preferences';

export default function NotesScreen() {
  const { user, initializing } = useAuth();
  const db = useSQLiteContext();
  const router = useRouter();
  const { translationId } = useReadingPreferences();
  const [books, setBooks] = useState<Book[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  useEffect(() => {
    if (!user) {
      setHighlights([]);
      return;
    }
    return subscribeToAllHighlights(user.uid, setHighlights);
  }, [user]);

  const bookName = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    return book ? bookDisplayName(book, translationId) : bookId;
  };

  if (initializing) return null;

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <ThemedText type="title" style={styles.title}>
            Notes
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            Sign in to highlight verses and keep notes as you read.
          </ThemedText>
          <SecondaryButton label="Go to Profile" onPress={() => router.push('/profile')} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          Notes
        </ThemedText>

        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={highlights}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <ThemedText themeColor="textSecondary" style={styles.description}>
              No highlights yet. Tap a verse while reading to highlight it or add a note.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/book/${item.book}/${item.chapter}`)}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <ThemedText type="smallBold" themeColor="accent">
                  {bookName(item.book)} {item.chapter}:{item.verse}
                </ThemedText>
                {item.note ? <ThemedText style={styles.note}>{item.note}</ThemedText> : null}
              </ThemedView>
            </Pressable>
          )}
        />
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
    gap: Spacing.three,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  description: {
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.one,
  },
  note: {
    fontStyle: 'italic',
  },
});
