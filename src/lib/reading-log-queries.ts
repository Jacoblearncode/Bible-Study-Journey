import {
  arrayUnion,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase';
import type { ReadChapter, ReadingLogEntry } from '@/lib/reading-log-types';

export function todayDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function logDocId(uid: string, date: string): string {
  return `${uid}_${date}`;
}

function toReadingLogEntry(id: string, data: Record<string, unknown>): ReadingLogEntry {
  return {
    id,
    userId: data.userId as string,
    date: data.date as string,
    chapters: (data.chapters as ReadChapter[] | undefined) ?? [],
    note: (data.note as string) ?? '',
    photoUrl: (data.photoUrl as string | undefined) ?? null,
    updatedAtMillis:
      (data.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null,
  };
}

export async function logChapterRead(uid: string, bookId: string, chapter: number): Promise<void> {
  const date = todayDateKey();
  await setDoc(
    doc(firestore, 'readingLogs', logDocId(uid, date)),
    {
      userId: uid,
      date,
      chapters: arrayUnion({ bookId, chapter }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function saveTodayLogEntry(
  uid: string,
  { note, photoUrl }: { note: string; photoUrl?: string | null }
): Promise<void> {
  const date = todayDateKey();
  await setDoc(
    doc(firestore, 'readingLogs', logDocId(uid, date)),
    {
      userId: uid,
      date,
      note,
      ...(photoUrl !== undefined ? { photoUrl } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeToRecentReadingLog(
  uid: string,
  days: number,
  callback: (entries: ReadingLogEntry[]) => void
): Unsubscribe {
  const logQuery = query(
    collection(firestore, 'readingLogs'),
    where('userId', '==', uid),
    orderBy('date', 'desc'),
    limit(days)
  );
  return onSnapshot(logQuery, (snapshot) => {
    callback(snapshot.docs.map((d) => toReadingLogEntry(d.id, d.data())));
  });
}
