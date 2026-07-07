import type { SQLiteDatabase } from 'expo-sqlite';

import type { Book, SearchResult, TranslationId, Verse } from '@/lib/bible-types';

export function getBooks(db: SQLiteDatabase): Promise<Book[]> {
  return db.getAllAsync<Book>('SELECT * FROM books ORDER BY order_index ASC');
}

export async function getChapterCount(
  db: SQLiteDatabase,
  translationId: TranslationId,
  bookId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ chapters: number }>(
    'SELECT MAX(chapter) as chapters FROM verses WHERE translation_id = ? AND book_id = ?',
    [translationId, bookId]
  );
  return row?.chapters ?? 0;
}

export function getChapterVerses(
  db: SQLiteDatabase,
  translationId: TranslationId,
  bookId: string,
  chapter: number
): Promise<Verse[]> {
  return db.getAllAsync<Verse>(
    'SELECT * FROM verses WHERE translation_id = ? AND book_id = ? AND chapter = ? ORDER BY verse ASC',
    [translationId, bookId, chapter]
  );
}

const MIN_SEARCH_QUERY_LENGTH = 2;

type SearchRow = Verse & {
  name_en: string;
  name_zh_hant: string;
  name_zh_hans: string;
};

export async function searchVerses(
  db: SQLiteDatabase,
  translationId: TranslationId,
  query: string,
  limit = 50
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < MIN_SEARCH_QUERY_LENGTH) {
    return [];
  }

  // The FTS5 trigram tokenizer requires the query string quoted as an FTS
  // string literal so punctuation/whitespace in the search text isn't parsed
  // as FTS query syntax.
  const ftsQuery = `"${trimmed.replace(/"/g, '""')}"`;

  const rows = await db.getAllAsync<SearchRow>(
    `
      SELECT v.*, b.name_en, b.name_zh_hant, b.name_zh_hans
      FROM verses_fts
      JOIN verses v ON v.id = verses_fts.rowid
      JOIN books b ON b.id = v.book_id
      WHERE verses_fts MATCH ? AND v.translation_id = ?
      ORDER BY v.book_id, v.chapter, v.verse
      LIMIT ?
    `,
    [ftsQuery, translationId, limit]
  );

  return rows.map(({ name_en, name_zh_hant, name_zh_hans, ...verse }) => ({
    ...verse,
    book_name:
      translationId === 'cuv-hant' ? name_zh_hant : translationId === 'cuv-hans' ? name_zh_hans : name_en,
  }));
}
