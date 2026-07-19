function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, delta: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + delta);
  return result;
}

export function computeStreak(dates: string[]): number {
  const set = new Set(dates);

  let cursor = new Date();
  if (!set.has(formatDateKey(cursor))) {
    // Reading today is still possible — don't zero out an unbroken streak
    // just because today hasn't happened yet, only once yesterday is missed too.
    cursor = addDays(cursor, -1);
    if (!set.has(formatDateKey(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (set.has(formatDateKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeHeatmap(dates: string[], weeks = 5): boolean[] {
  const set = new Set(dates);
  const totalDays = weeks * 7;
  const result: boolean[] = [];
  for (let i = totalDays - 1; i >= 0; i--) {
    result.push(set.has(formatDateKey(addDays(new Date(), -i))));
  }
  return result;
}
