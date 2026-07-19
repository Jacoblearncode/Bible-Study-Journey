import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorMessage, Field, PrimaryButton, SecondaryButton } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { getBooks, getChapterCount, getChapterVerses } from '@/lib/bible-queries';
import { bookDisplayName, type Book, type Verse } from '@/lib/bible-types';
import { removeHighlight, saveHighlight, subscribeToChapterHighlights } from '@/lib/notes-queries';
import type { Highlight } from '@/lib/notes-types';
import { useReadingPreferences } from '@/lib/reading-preferences';
import { logChapterRead } from '@/lib/reading-log-queries';

function VerseEditor({
  bookId,
  chapter,
  verse,
  existing,
  onClose,
}: {
  bookId: string;
  chapter: number;
  verse: number;
  existing: Highlight | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [note, setNote] = useState(existing?.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <ThemedView type="backgroundElement" style={styles.editorCard}>
        <ThemedText type="small" themeColor="textSecondary">
          Sign in to highlight verses and save notes.
        </ThemedText>
      </ThemedView>
    );
  }

  const save = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await saveHighlight(user.uid, bookId, chapter, verse, note.trim());
      onClose();
    } catch (err) {
      console.error('Save highlight error', err);
      setError('Something went wrong saving that. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    setSubmitting(true);
    try {
      await removeHighlight(user.uid, bookId, chapter, verse);
      onClose();
    } catch (err) {
      console.error('Remove highlight error', err);
      setError('Something went wrong removing that. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.editorCard}>
      <Field
        placeholder="Add a note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
      />
      <ErrorMessage message={error} />
      <View style={styles.editorButtons}>
        <PrimaryButton label={submitting ? 'Saving...' : 'Save highlight'} onPress={save} disabled={submitting} />
        {existing && (
          <SecondaryButton label="Remove" onPress={remove} disabled={submitting} />
        )}
      </View>
    </ThemedView>
  );
}

export default function ChapterReaderScreen() {
  const { bookId, chapter: chapterParam } = useLocalSearchParams<{
    bookId: string;
    chapter: string;
  }>();
  const chapter = Number(chapterParam);
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { translationId } = useReadingPreferences();
  const [book, setBook] = useState<Book | null>(null);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [chapterCount, setChapterCount] = useState(0);
  const [highlights, setHighlights] = useState<Record<number, Highlight>>({});
  const [activeVerse, setActiveVerse] = useState<number | null>(null);

  useEffect(() => {
    getBooks(db).then((books) => {
      setBook(books.find((b) => b.id === bookId) ?? null);
    });
  }, [db, bookId]);

  useEffect(() => {
    getChapterVerses(db, translationId, bookId, chapter).then(setVerses);
  }, [db, translationId, bookId, chapter]);

  useEffect(() => {
    if (!user) return;
    logChapterRead(user.uid, bookId, chapter).catch((err) => {
      console.warn('Log chapter read error', err);
    });
  }, [user, bookId, chapter]);

  useEffect(() => {
    getChapterCount(db, translationId, bookId).then(setChapterCount);
  }, [db, translationId, bookId]);

  useEffect(() => {
    setActiveVerse(null);
    if (!user) {
      setHighlights({});
      return;
    }
    const unsubscribe = subscribeToChapterHighlights(user.uid, bookId, chapter, (list) => {
      const byVerse: Record<number, Highlight> = {};
      for (const h of list) byVerse[h.verse] = h;
      setHighlights(byVerse);
    });
    return () => {
      unsubscribe();
      setHighlights({});
    };
  }, [user, bookId, chapter]);

  const title = book ? `${bookDisplayName(book, translationId)} ${chapter}` : `${bookId} ${chapter}`;
  const canGoPrev = chapter > 1;
  const canGoNext = chapter < chapterCount;

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title }} />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {verses.map((verse) => {
            const highlight = highlights[verse.verse];
            return (
              <View key={verse.id}>
                <Pressable
                  onPress={() => setActiveVerse(activeVerse === verse.verse ? null : verse.verse)}>
                  <ThemedText
                    type="verse"
                    style={[
                      styles.verseLine,
                      highlight && { backgroundColor: `${theme.accent}40` },
                    ]}>
                    <ThemedText type="verse" themeColor="accent" style={styles.verseLabel}>
                      {verse.verse_label}{' '}
                    </ThemedText>
                    {verse.text}
                  </ThemedText>
                </Pressable>
                {highlight?.note ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.notePreview}>
                    {highlight.note}
                  </ThemedText>
                ) : null}
                {activeVerse === verse.verse && (
                  <VerseEditor
                    bookId={bookId}
                    chapter={chapter}
                    verse={verse.verse}
                    existing={highlight ?? null}
                    onClose={() => setActiveVerse(null)}
                  />
                )}
              </View>
            );
          })}
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
            <ThemedView type={canGoNext ? 'accent' : 'background'} style={styles.pagerButton}>
              <ThemedText themeColor={canGoNext ? 'accentText' : 'textSecondary'} type="smallBold">
                Next
              </ThemedText>
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
    lineHeight: 30,
  },
  verseLabel: {
    fontSize: 14,
  },
  notePreview: {
    paddingLeft: Spacing.three,
    paddingBottom: Spacing.one,
    fontStyle: 'italic',
  },
  editorCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  editorButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
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
