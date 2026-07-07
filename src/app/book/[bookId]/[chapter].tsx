import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getBooks, getChapterCount, getChapterVerses } from '@/lib/bible-queries';
import { bookDisplayName, type Book, type Verse } from '@/lib/bible-types';
import { useReadingPreferences } from '@/lib/reading-preferences';

export default function ChapterReaderScreen() {
  const { bookId, chapter: chapterParam } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
  }>();
  const chapter = Number(chapterParam);
  const db = useSQLiteContext();
  const router = useRouter();
  const { translationId } = useReadingPreferences();
  const [book, setBook] = useState<Book | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapterCount, setChapterCount] = useState(0);

  useEffect(() => {
    getBooks(db).then((books) => {
      setBook(books.find((b) => b.id === bookId) ?? null);
    });
  }, [db, bookId]);

  useEffect(() => {
    getChapterVerses(db, translationId, bookId, chapter).then(setVerses);
  }, [db, translationId, bookId, chapter]);

  useEffect(() => {
    getChapterCount(db, translationId, bookId).then(setChapterCount);
  }, [db, translationId, bookId]);

  const title = book ? `${bookDisplayName(book, translationId)} ${chapter}` : `${bookId} ${chapter}`;
  const canGoPrev = chapter > 1;
  const canGoNext = chapter < chapterCount;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {verses.map((verse) => (
            <ThemedText key={verse.id} style={styles.verseLine}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                {verse.verse_label}{' '}
              </ThemedText>
              {verse.text}
            </ThemedText>
          ))}
        </ScrollView>

        <View style={styles.pager}>
          <Pressable
            disabled={!canGoPrev}
            onPress={() => router.replace(`/book/${bookId}/${chapter - 1}`)}>
            <ThemedView
              type={canGoPrev ? 'backgroundElement' : 'background'}
              style={styles.pagerButton}>
              <ThemedText themeColor={canGoPrev ? 'text' : 'textSecondary'}>Previous</ThemedText>
            </ThemedView>
          </Pressable>
          <Pressable
            disabled={!canGoNext}
            onPress={() => router.replace(`/book/${bookId}/${chapter + 1}`)}>
            <ThemedView
              type={canGoNext ? 'backgroundElement' : 'background'}
              style={styles.pagerButton}>
              <ThemedText themeColor={canGoNext ? 'text' : 'textSecondary'}>Next</ThemedText>
            </ThemedView>
          </Pressable>
        </View>
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
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.two,
  },
  verseLine: {
    lineHeight: 26,
  },
  pager: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  pagerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
});
