export type Highlight = {
  id: string;
  userId: string;
  book: string;
  chapter: number;
  verse: number;
  note: string;
  updatedAtMillis: number | null;
};
