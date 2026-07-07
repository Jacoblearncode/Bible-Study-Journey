import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getBooks, getChapterCount } from '@/lib/bible-queries';
import { bookDisplayName, type Book } from '@/lib/bible-types';
import { useReadingPreferences } from '@/lib/reading-preferences';

export default function ChapterGridScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const db = useSQLiteContext();
  const router = useRouter();
  const { translationId } = useReadingPreferences();
  const [book, setBook] = useState<Book | null>(null);
  const [chapterCount, setChapterCount] = useState(0);

  useEffect(() => {
    getBooks(db).then((books) => {
      setBook(books.find((b) => b.id === bookId) ?? null);
    });
  }, [db, bookId]);

  useEffect(() => {
    getChapterCount(db, translationId, bookId).then(setChapterCount);
  }, [db, translationId, bookId]);

  const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);
  const title = book ? bookDisplayName(book, translationId) : bookId;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <FlatList
          contentContainerStyle={styles.grid}
          data={chapters}
          numColumns={5}
          keyExtractor={(chapter) => String(chapter)}
          renderItem={({ item: chapter }) => (
            <Pressable
              style={styles.cellWrapper}
              onPress={() => router.push(`/book/${bookId}/${chapter}`)}>
              <ThemedView type="backgroundElement" style={styles.cell}>
                <ThemedText type="smallBold">{chapter}</ThemedText>
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
  },
  grid: {
    padding: Spacing.three,
  },
  cellWrapper: {
    flex: 1 / 5,
    padding: Spacing.one,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
