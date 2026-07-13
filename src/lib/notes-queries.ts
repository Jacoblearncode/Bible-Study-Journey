import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { firestore } from '@/lib/firebase';
import type { Highlight } from '@/lib/notes-types';

function highlightDocId(uid: string, bookId: string, chapter: number, verse: number): string {
  return `${uid}_${bookId}_${chapter}_${verse}`;
}

function toHighlight(id: string, data: Record<string, unknown>): Highlight {
  return {
    id,
    userId: data.userId as string,
    book: data.book as string,
    chapter: data.chapter as number,
    verse: data.verse as number,
    note: (data.note as string) ?? '',
    updatedAtMillis: (data.updatedAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null,
  };
}

export function subscribeToChapterHighlights(
  uid: string,
  bookId: string,
  chapter: number,
  callback: (highlights: Highlight[]) => void
): Unsubscribe {
  const highlightsQuery = query(
    collection(firestore, 'highlights'),
    where('userId', '==', uid),
    where('book', '==', bookId),
    where('chapter', '==', chapter)
  );
  return onSnapshot(highlightsQuery, (snapshot) => {
    callback(snapshot.docs.map((d) => toHighlight(d.id, d.data())));
  });
}

export function subscribeToAllHighlights(
  uid: string,
  callback: (highlights: Highlight[]) => void
): Unsubscribe {
  const highlightsQuery = query(
    collection(firestore, 'highlights'),
    where('userId', '==', uid),
    orderBy('updatedAt', 'desc')
  );
  return onSnapshot(highlightsQuery, (snapshot) => {
    callback(snapshot.docs.map((d) => toHighlight(d.id, d.data())));
  });
}

export async function saveHighlight(
  uid: string,
  bookId: string,
  chapter: number,
  verse: number,
  note: string
): Promise<void> {
  const id = highlightDocId(uid, bookId, chapter, verse);
  await setDoc(doc(firestore, 'highlights', id), {
    userId: uid,
    book: bookId,
    chapter,
    verse,
    note,
    updatedAt: serverTimestamp(),
  });
}

export async function removeHighlight(
  uid: string,
  bookId: string,
  chapter: number,
  verse: number
): Promise<void> {
  const id = highlightDocId(uid, bookId, chapter, verse);
  await deleteDoc(doc(firestore, 'highlights', id));
}
