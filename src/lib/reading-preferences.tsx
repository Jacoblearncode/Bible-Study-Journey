import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { TranslationId } from '@/lib/bible-types';

type ReadingPreferences = {
  translationId: TranslationId;
  setTranslationId: (id: TranslationId) => void;
};

const ReadingPreferencesContext = createContext<ReadingPreferences | null>(null);

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [translationId, setTranslationId] = useState<TranslationId>('cuv-hant');

  const value = useMemo(() => ({ translationId, setTranslationId }), [translationId]);

  return (
    <ReadingPreferencesContext.Provider value={value}>
      {children}
    </ReadingPreferencesContext.Provider>
  );
}

export function useReadingPreferences(): ReadingPreferences {
  const context = useContext(ReadingPreferencesContext);
  if (!context) {
    throw new Error('useReadingPreferences must be used within a ReadingPreferencesProvider');
  }
  return context;
}
