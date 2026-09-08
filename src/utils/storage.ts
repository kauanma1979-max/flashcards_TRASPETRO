import { Flashcard, UserStats, GamificationBadge, StudyAlarmConfig } from '../types';
import { ALL_INITIAL_FLASHCARDS } from '../data/transpetroCards';
import { INITIAL_BADGES, getLevelForXp } from './spacedRepetition';

const STORAGE_KEYS = {
  CARDS: 'transpetro_cards_v2_adm',
  STATS: 'transpetro_stats_v2',
  BADGES: 'transpetro_badges_v2',
  ALARM: 'transpetro_alarm_v2'
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

export function getStoredBadges(): GamificationBadge[] {
  if (typeof window === 'undefined') return INITIAL_BADGES;
  const saved = localStorage.getItem(STORAGE_KEYS.BADGES);
  if (!saved) return INITIAL_BADGES;
  try {
    const parsed: GamificationBadge[] = JSON.parse(saved);
    // Ensure all badges exist in case new ones were added
    const map = new Map<string, GamificationBadge>();
    INITIAL_BADGES.forEach(b => map.set(b.id, b));
    parsed.forEach(b => map.set(b.id, b));
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
