import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { TranslationId } from '@/lib/bible-types';
import { useReadingPreferences } from '@/lib/reading-preferences';

const OPTIONS: { id: TranslationId; label: string }[] = [
  { id: 'cuv-hant', label: '繁體' },
  { id: 'cuv-hans', label: '简体' },
  { id: 'web', label: 'English' },
];

export function TranslationSwitcher() {
  const { translationId, setTranslationId } = useReadingPreferences();

  return (
    <View style={styles.row}>
      {OPTIONS.map((option) => {
        const selected = option.id === translationId;
        return (
          <Pressable key={option.id} onPress={() => setTranslationId(option.id)}>
            <ThemedView type={selected ? 'accent' : 'backgroundElement'} style={styles.pill}>
              <ThemedText
                type={selected ? 'smallBold' : 'small'}
                themeColor={selected ? 'accentText' : 'text'}>
                {option.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
});
