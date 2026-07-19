import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ErrorMessage, Field, PrimaryButton, SecondaryButton } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth-context';
import { isCloudinaryConfigured, uploadImage } from '@/lib/cloudinary';
import { saveTodayLogEntry, subscribeToRecentReadingLog, todayDateKey } from '@/lib/reading-log-queries';
import { computeHeatmap, computeStreak } from '@/lib/reading-log-stats';
import type { ReadingLogEntry } from '@/lib/reading-log-types';

const HEATMAP_WEEKS = 5;

function TodayLogEditor({ entry, onClose }: { entry: ReadingLogEntry | null; onClose: () => void }) {
  const { user } = useAuth();
  const [note, setNote] = useState(entry?.note ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(entry?.photoUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const pickPhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is needed to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      let photoUrl: string | null | undefined;
      if (photoUri === null && entry?.photoUrl) {
        photoUrl = null;
      } else if (photoUri && photoUri !== entry?.photoUrl) {
        photoUrl = await uploadImage(photoUri);
      } else {
        photoUrl = undefined;
      }
      await saveTodayLogEntry(user.uid, { note: note.trim(), photoUrl });
      onClose();
    } catch (err) {
      console.error('Save reading log error', err);
      setError('Something went wrong saving that. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.editorCard}>
      {entry && entry.chapters.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Read today: {entry.chapters.map((c) => `${c.bookId} ${c.chapter}`).join(', ')}
        </ThemedText>
      )}
      <Field
        placeholder="How did today's reading go? (optional)"
        value={note}
        onChangeText={setNote}
        multiline
      />
      {photoUri && <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />}
      <ErrorMessage message={error} />
      <View style={styles.editorButtons}>
        {isCloudinaryConfigured() && (
          <SecondaryButton label={photoUri ? 'Change photo' : 'Add photo'} onPress={pickPhoto} disabled={saving} />
        )}
        {photoUri && (
          <SecondaryButton label="Remove photo" onPress={() => setPhotoUri(null)} disabled={saving} />
        )}
        <PrimaryButton label={saving ? 'Saving...' : 'Save'} onPress={save} disabled={saving} />
      </View>
    </ThemedView>
  );
}

export function ReadingStatsCard() {
  const { user } = useAuth();
  const theme = useTheme();
  const [entries, setEntries] = useState<ReadingLogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    return subscribeToRecentReadingLog(user.uid, 60, setEntries);
  }, [user]);

  const dates = useMemo(() => entries.map((e) => e.date), [entries]);
  const streak = useMemo(() => computeStreak(dates), [dates]);
  const heatmap = useMemo(() => computeHeatmap(dates, HEATMAP_WEEKS), [dates]);
  const todayEntry = useMemo(
    () => entries.find((e) => e.date === todayDateKey()) ?? null,
    [entries]
  );

  if (!user) return null;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => setExpanded((v) => !v)}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.streakColumn}>
            <ThemedText type="smallBold">
              {streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : 'Start a streak'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {streak > 0 ? 'reading streak' : 'Read a chapter today'}
            </ThemedText>
          </View>
          <View style={styles.heatmap}>
            {Array.from({ length: HEATMAP_WEEKS }, (_, row) => (
              <View key={row} style={styles.heatmapRow}>
                {heatmap.slice(row * 7, row * 7 + 7).map((read, col) => (
                  <View
                    key={col}
                    style={[
                      styles.heatmapCell,
                      { backgroundColor: read ? theme.accent : theme.backgroundSelected },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </ThemedView>
      </Pressable>
      {expanded && <TodayLogEditor entry={todayEntry} onClose={() => setExpanded(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  streakColumn: {
    gap: Spacing.half,
  },
  heatmap: {
    gap: Spacing.half,
  },
  heatmapRow: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  heatmapCell: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  editorCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  editorButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: Spacing.two,
  },
});
