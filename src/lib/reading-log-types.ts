export type ReadChapter = {
  bookId: string;
  chapter: number;
};

export type ReadingLogEntry = {
  id: string;
  userId: string;
  date: string;
  chapters: ReadChapter[];
  note: string;
  photoUrl: string | null;
  updatedAtMillis: number | null;
};
