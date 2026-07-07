import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TranslationSwitcher } from '@/components/translation-switcher';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { searchVerses } from '@/lib/bible-queries';
import type { SearchResult } from '@/lib/bible-types';
import { useReadingPreferences } from '@/lib/reading-preferences';

export default function SearchScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const theme = useTheme();
  const { translationId } = useReadingPreferences();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      searchVerses(db, translationId, query)
        .then(setResults)
        .catch((err) => {
          // expo-sqlite's web build doesn't ship the FTS5 extension; search
          // is expected to work on iOS/Android, which are this app's primary
          // targets. Fail quietly on web rather than showing a crash screen.
          console.warn('Search unavailable:', err);
          setUnavailable(true);
        });
    }, 200);
    return () => clearTimeout(handle);
  }, [db, translationId, query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Search
          </ThemedText>
          <TranslationSwitcher />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search verses..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />
        </ThemedView>

        {unavailable ? (
          <ThemedText themeColor="textSecondary" style={styles.unavailable}>
            Search isn&apos;t available on this platform yet. It works on the iOS and Android apps.
          </ThemedText>
        ) : (
          <FlatList
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/book/${item.book_id}/${item.chapter}`)}>
                <ThemedView style={styles.resultRow}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {item.book_name} {item.chapter}:{item.verse_label}
                  </ThemedText>
                  <ThemedText>{item.text}</ThemedText>
                </ThemedView>
              </Pressable>
            )}
          />
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
  input: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  unavailable: {
    paddingHorizontal: Spacing.four,
    lineHeight: 22,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.three,
  },
  resultRow: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    gap: Spacing.half,
  },
});
