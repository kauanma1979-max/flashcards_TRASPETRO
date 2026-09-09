import { Flashcard, UserStats, GamificationBadge, StudyAlarmConfig, ActiveSessionState } from '../types';
import { ALL_INITIAL_FLASHCARDS } from '../data/transpetroCards';
import { INITIAL_BADGES } from './spacedRepetition';

export interface BackupData {
  version: string;
  appName: string;
  exportedAt: string;
  stats: UserStats;
  badges: GamificationBadge[];
  alarmConfig?: StudyAlarmConfig;
  deckProgressMap?: Record<string, { currentIndex: number; totalCards: number; updatedAt: string }>;
  activeSession?: ActiveSessionState | null;
  cards: Flashcard[];
}

export function generateBackupJson(data: {
  cards: Flashcard[];
  stats: UserStats;
  badges: GamificationBadge[];
  alarmConfig: StudyAlarmConfig;
  deckProgressMap: Record<string, { currentIndex: number; totalCards: number; updatedAt: string }>;
  activeSession: ActiveSessionState | null;
}): string {
  const backup: BackupData = {
    version: 'transpetro_backup_v2',
    appName: 'Transpetro Flashcards',
    exportedAt: new Date().toISOString(),
    stats: data.stats,
    badges: data.badges,
    alarmConfig: data.alarmConfig,
    deckProgressMap: data.deckProgressMap,
    activeSession: data.activeSession,
    cards: data.cards
  };
  return JSON.stringify(backup, null, 2);
}

export function downloadBackupFile(jsonString: string) {
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  link.href = url;
  link.download = `backup_transpetro_flashcards_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type BackupValidationResult = 
  | { success: true; data: BackupData; error?: never }
  | { success: false; error: string; data?: never };

export function parseAndValidateBackup(jsonString: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Arquivo JSON inválido ou vazio.' };
    }

    if (!Array.isArray(parsed.cards) && !parsed.stats) {
      return { success: false, error: 'Estrutura incompatível. O arquivo deve conter flashcards ou estatísticas do Transpetro Cards.' };
    }

    // Validate and merge cards
    let validatedCards: Flashcard[] = [];
    if (Array.isArray(parsed.cards)) {
      validatedCards = parsed.cards.filter((c: any) => c && typeof c.id === 'string' && typeof c.question === 'string');

      // Ensure all 160 official cards exist
      ALL_INITIAL_FLASHCARDS.forEach(initCard => {
        if (!validatedCards.some(c => c.id === initCard.id)) {
          validatedCards.push({ ...initCard });
        }
      });
    } else {
      validatedCards = ALL_INITIAL_FLASHCARDS.map(c => ({ ...c }));
    }

    // Validate stats
    const stats: UserStats = {
      xp: typeof parsed.stats?.xp === 'number' ? parsed.stats.xp : 0,
      level: typeof parsed.stats?.level === 'number' ? parsed.stats.level : 1,
      title: typeof parsed.stats?.title === 'string' ? parsed.stats.title : 'Aspirante Transpetro',
      streak: typeof parsed.stats?.streak === 'number' ? parsed.stats.streak : 0,
      bestStreak: typeof parsed.stats?.bestStreak === 'number' ? parsed.stats.bestStreak : 0,
      lastActiveDate: parsed.stats?.lastActiveDate,
      totalReviews: typeof parsed.stats?.totalReviews === 'number' ? parsed.stats.totalReviews : 0,
      totalCorrect: typeof parsed.stats?.totalCorrect === 'number' ? parsed.stats.totalCorrect : 0,
      totalWrong: typeof parsed.stats?.totalWrong === 'number' ? parsed.stats.totalWrong : 0,
      dailyGoal: typeof parsed.stats?.dailyGoal === 'number' ? parsed.stats.dailyGoal : 20,
      todayReviewsCount: typeof parsed.stats?.todayReviewsCount === 'number' ? parsed.stats.todayReviewsCount : 0,
      todayDate: typeof parsed.stats?.todayDate === 'string' ? parsed.stats.todayDate : new Date().toISOString().split('T')[0]
    };

    // Validate badges
    let badges: GamificationBadge[] = INITIAL_BADGES.map(b => ({ ...b }));
    if (Array.isArray(parsed.badges)) {
      const parsedBadgesMap = new Map<string, GamificationBadge>();
      parsed.badges.forEach((b: any) => {
        if (b && typeof b.id === 'string') {
          const id = b.id === 'cards_120' ? 'cards_160' : b.id;
          parsedBadgesMap.set(id, { ...b, id });
        }
      });
      badges = INITIAL_BADGES.map(defaultBadge => {
        const saved = parsedBadgesMap.get(defaultBadge.id);
        if (saved) {
          return {
            ...defaultBadge,
            currentProgress: typeof saved.currentProgress === 'number' ? saved.currentProgress : defaultBadge.currentProgress,
            unlockedAt: saved.unlockedAt
          };
        }
        return defaultBadge;
      });
    }

    const backupData: BackupData = {
      version: parsed.version || 'transpetro_backup_v2',
      appName: parsed.appName || 'Transpetro Flashcards',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      stats,
      badges,
      alarmConfig: parsed.alarmConfig,
      deckProgressMap: parsed.deckProgressMap || {},
      activeSession: parsed.activeSession || null,
      cards: validatedCards
    };

    return { success: true, data: backupData };
  } catch (e: any) {
    return { success: false, error: `Falha ao processar arquivo JSON: ${e?.message || 'Arquivo corrompido'}` };
  }
}
