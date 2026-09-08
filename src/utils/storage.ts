import { Flashcard, UserStats, GamificationBadge, StudyAlarmConfig, ActiveSessionState } from '../types';
import { ALL_INITIAL_FLASHCARDS } from '../data/transpetroCards';
import { INITIAL_BADGES, getLevelForXp } from './spacedRepetition';

const STORAGE_KEYS = {
  CARDS: 'transpetro_cards_v2_adm',
  STATS: 'transpetro_stats_v2',
  BADGES: 'transpetro_badges_v2',
  ALARM: 'transpetro_alarm_v2',
  ACTIVE_SESSION: 'transpetro_active_session_v2',
  DECK_PROGRESS: 'transpetro_deck_progress_v2'
};

export function getStoredCards(): Flashcard[] {
  if (typeof window === 'undefined') return ALL_INITIAL_FLASHCARDS;
  const saved = localStorage.getItem(STORAGE_KEYS.CARDS);
  if (!saved) {
    saveCards(ALL_INITIAL_FLASHCARDS);
    return ALL_INITIAL_FLASHCARDS;
  }
  try {
    const parsed: Flashcard[] = JSON.parse(saved);
    const map = new Map<string, Flashcard>();
    ALL_INITIAL_FLASHCARDS.forEach(c => map.set(c.id, c));
    // Apply user saved progress on top of initial
    parsed.forEach(c => {
      const base = map.get(c.id);
      if (base) {
        map.set(c.id, {
          ...base,
          repetitionCount: c.repetitionCount ?? base.repetitionCount,
          intervalDays: c.intervalDays ?? base.intervalDays,
          easeFactor: c.easeFactor ?? base.easeFactor,
          consecutiveCorrect: c.consecutiveCorrect ?? base.consecutiveCorrect,
          errorCount: c.errorCount ?? base.errorCount,
          status: c.status ?? base.status,
          nextReviewDate: c.nextReviewDate,
          lastReviewed: c.lastReviewed
        });
      } else if (c.id.startsWith('custom_')) {
        map.set(c.id, c);
      }
    });
    const merged = Array.from(map.values());
    saveCards(merged);
    return merged;
  } catch (e) {
    console.error('Error loading cards from storage:', e);
    return ALL_INITIAL_FLASHCARDS;
  }
}

export function saveCards(cards: Flashcard[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving cards:', e);
  }
}

export function resetCardsByIds(allCards: Flashcard[], targetCardIds: string[]): Flashcard[] {
  const idSet = new Set(targetCardIds);
  const pristineMap = new Map<string, Flashcard>();
  ALL_INITIAL_FLASHCARDS.forEach(c => pristineMap.set(c.id, c));

  const updated = allCards.map(c => {
    if (idSet.has(c.id)) {
      const pristine = pristineMap.get(c.id);
      if (pristine) {
        return { ...pristine };
      }
      return {
        ...c,
        status: 'novo' as const,
        repetitionCount: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        consecutiveCorrect: 0,
        errorCount: 0,
        lastReviewed: undefined,
        nextReviewDate: undefined
      };
    }
    return c;
  });

  saveCards(updated);
  return updated;
}

export function resetMacroCards(allCards: Flashcard[], macroId: string): Flashcard[] {
  const macroCardIds = allCards.filter(c => c.macroId === macroId).map(c => c.id);
  return resetCardsByIds(allCards, macroCardIds);
}

export function resetAllCards(): Flashcard[] {
  const reset = ALL_INITIAL_FLASHCARDS.map(c => ({ ...c }));
  saveCards(reset);
  return reset;
}

export function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getStoredStats(): UserStats {
  const today = getTodayDateString();
  const defaultStats: UserStats = {
    xp: 0,
    level: 1,
    title: 'Aspirante Transpetro',
    streak: 0,
    bestStreak: 0,
    lastActiveDate: undefined,
    totalReviews: 0,
    totalCorrect: 0,
    totalWrong: 0,
    dailyGoal: 20,
    todayReviewsCount: 0,
    todayDate: today
  };

  if (typeof window === 'undefined') return defaultStats;
  const saved = localStorage.getItem(STORAGE_KEYS.STATS);
  if (!saved) return defaultStats;

  try {
    const parsed: UserStats = JSON.parse(saved);
    // Reset daily reviews counter if day changed
    if (parsed.todayDate !== today) {
      parsed.todayReviewsCount = 0;
      parsed.todayDate = today;
    }
    const lvl = getLevelForXp(parsed.xp);
    parsed.level = lvl.level;
    parsed.title = lvl.title;
    return parsed;
  } catch {
    return defaultStats;
  }
}

export function saveStats(stats: UserStats) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving stats:', e);
  }
}

export function updateStatsOnStudy(prevStats: UserStats, isCorrect: boolean, xpEarned: number): UserStats {
  const today = getTodayDateString();
  let newStreak = prevStats.streak;
  const lastDate = prevStats.lastActiveDate;

  if (!lastDate) {
    newStreak = 1;
  } else if (lastDate !== today) {
    const last = new Date(lastDate);
    const curr = new Date(today);
    const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  const newXp = prevStats.xp + xpEarned;
  const lvl = getLevelForXp(newXp);
  const isTodaySame = prevStats.todayDate === today;

  const updated: UserStats = {
    ...prevStats,
    xp: newXp,
    level: lvl.level,
    title: lvl.title,
    streak: newStreak,
    bestStreak: Math.max(prevStats.bestStreak || 0, newStreak),
    lastActiveDate: today,
    todayDate: today,
    todayReviewsCount: (isTodaySame ? prevStats.todayReviewsCount : 0) + 1,
    totalReviews: prevStats.totalReviews + 1,
    totalCorrect: prevStats.totalCorrect + (isCorrect ? 1 : 0),
    totalWrong: prevStats.totalWrong + (isCorrect ? 0 : 1)
  };

  saveStats(updated);
  return updated;
}

export function recalculateStatsFromCards(allCards: Flashcard[], prevStats: UserStats): UserStats {
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalReviews = 0;
  let totalXp = 0;

  allCards.forEach(c => {
    const reps = c.repetitionCount || 0;
    const errors = c.errorCount || 0;
    if (c.status !== 'novo' || reps > 0 || errors > 0) {
      totalReviews += (reps + errors);
      totalCorrect += reps;
      totalWrong += errors;
      totalXp += (reps * 15) + (c.status === 'dominado' ? 20 : 0);
    }
  });

  const lvl = getLevelForXp(totalXp);
  const updated: UserStats = {
    ...prevStats,
    xp: totalXp,
    level: lvl.level,
    title: lvl.title,
    totalReviews,
    totalCorrect,
    totalWrong,
    todayReviewsCount: Math.min(prevStats.todayReviewsCount || 0, totalReviews)
  };
  saveStats(updated);
  return updated;
}

export function getInitialUserStats(): UserStats {
  const today = getTodayDateString();
  return {
    xp: 0,
    level: 1,
    title: 'Aspirante Transpetro',
    streak: 0,
    bestStreak: 0,
    lastActiveDate: undefined,
    totalReviews: 0,
    totalCorrect: 0,
    totalWrong: 0,
    dailyGoal: 20,
    todayReviewsCount: 0,
    todayDate: today
  };
}

export function getStoredBadges(): GamificationBadge[] {
  if (typeof window === 'undefined') return INITIAL_BADGES;
  const saved = localStorage.getItem(STORAGE_KEYS.BADGES);
  if (!saved) return INITIAL_BADGES;
  try {
    const parsed: GamificationBadge[] = JSON.parse(saved);
    // Ensure all badges exist in case new ones were added and migrate legacy badge IDs
    const map = new Map<string, GamificationBadge>();
    INITIAL_BADGES.forEach(b => map.set(b.id, b));
    parsed.forEach(b => {
      const id = b.id === 'cards_120' ? 'cards_160' : b.id;
      const initial = map.get(id);
      if (initial) {
        map.set(id, {
          ...initial,
          currentProgress: b.currentProgress ?? initial.currentProgress,
          unlockedAt: b.unlockedAt
        });
      } else {
        map.set(id, b);
      }
    });
    return Array.from(map.values());
  } catch {
    return INITIAL_BADGES;
  }
}

export function saveBadges(badges: GamificationBadge[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges));
  } catch (e) {
    console.error('Error saving badges:', e);
  }
}

export function getStoredActiveSession(): ActiveSessionState | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSessionState | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
    }
  } catch (e) {
    console.error('Error saving active session:', e);
  }
}

export function clearActiveSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  } catch (e) {
    console.error('Error clearing active session:', e);
  }
}

export function getDeckProgressMap(): Record<string, { currentIndex: number; totalCards: number; updatedAt: string }> {
  if (typeof window === 'undefined') return {};
  const saved = localStorage.getItem(STORAGE_KEYS.DECK_PROGRESS);
  if (!saved) return {};
  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

export function saveDeckProgress(deckKey: string, currentIndex: number, totalCards: number) {
  if (typeof window === 'undefined') return;
  try {
    const map = getDeckProgressMap();
    if (currentIndex >= totalCards - 1 || currentIndex <= 0) {
      delete map[deckKey];
    } else {
      map[deckKey] = { currentIndex, totalCards, updatedAt: new Date().toISOString() };
    }
    localStorage.setItem(STORAGE_KEYS.DECK_PROGRESS, JSON.stringify(map));
  } catch (e) {
    console.error('Error saving deck progress:', e);
  }
}

export function clearDeckProgress(deckKey: string) {
  if (typeof window === 'undefined') return;
  try {
    const map = getDeckProgressMap();
    delete map[deckKey];
    localStorage.setItem(STORAGE_KEYS.DECK_PROGRESS, JSON.stringify(map));
  } catch (e) {
    console.error('Error clearing deck progress:', e);
  }
}

export function getStoredAlarm(): StudyAlarmConfig {
  const defaultAlarm: StudyAlarmConfig = {
    enabled: true,
    time: '19:30',
    sound: 'digital',
    volume: 0.8,
    label: 'Revisão Noturna Transpetro',
    pomodoroActive: false,
    pomodoroMinutes: 25,
    pomodoroTimeRemaining: 25 * 60
  };

  if (typeof window === 'undefined') return defaultAlarm;
  const saved = localStorage.getItem(STORAGE_KEYS.ALARM);
  if (!saved) return defaultAlarm;
  try {
    return { ...defaultAlarm, ...JSON.parse(saved) };
  } catch {
    return defaultAlarm;
  }
}

export function saveAlarm(alarm: StudyAlarmConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ALARM, JSON.stringify(alarm));
  } catch (e) {
    console.error('Error saving alarm:', e);
  }
}
