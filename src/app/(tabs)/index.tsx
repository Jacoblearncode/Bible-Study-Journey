import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TranslationSwitcher } from '@/components/translation-switcher';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getBooks } from '@/lib/bible-queries';
import { bookDisplayName, type Book } from '@/lib/bible-types';
import { useReadingPreferences } from '@/lib/reading-preferences';

export default function ReadScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { translationId } = useReadingPreferences();
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    getBooks(db).then(setBooks);
  }, [db]);

  const sections = useMemo(
    () => [
      { title: 'Old Testament', data: books.filter((b) => b.testament === 'OT') },
      { title: 'New Testament', data: books.filter((b) => b.testament === 'NT') },
    ],
    [books]
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Read
          </ThemedText>
          <TranslationSwitcher />
        </ThemedView>

        <SectionList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          sections={sections}
          keyExtractor={(book) => book.id}
          renderSectionHeader={({ section }) => (
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </ThemedText>
          )}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/book/${item.id}`)}>
              <ThemedView style={styles.row}>
                <ThemedText>{bookDisplayName(item, translationId)}</ThemedText>
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
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  row: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
});
