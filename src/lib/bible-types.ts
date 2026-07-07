export type TranslationId = 'cuv-hant' | 'cuv-hans' | 'web';

export type Translation = {
  id: TranslationId;
  name: string;
  language: string;
  license: string;
};

export type Testament = 'OT' | 'NT';

export type Book = {
  id: string;
  order_index: number;
  testament: Testament;
  name_en: string;
  name_zh_hant: string;
  name_zh_hans: string;
};

export type Verse = {
  id: number;
  translation_id: TranslationId;
  book_id: string;
  chapter: number;
  verse: number;
  verse_label: string;
  text: string;
};

export type SearchResult = Verse & {
  book_name: string;
};

export function bookDisplayName(book: Book, translationId: TranslationId): string {
  switch (translationId) {
    case 'cuv-hant':
      return book.name_zh_hant;
    case 'cuv-hans':
      return book.name_zh_hans;
    case 'web':
      return book.name_en;
  }
}
