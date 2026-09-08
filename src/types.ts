export type Rating = 'errei' | 'dificil' | 'bom' | 'facil';

export type CardStatus = 'novo' | 'aprendendo' | 'revisando' | 'dominado';

export interface Flashcard {
  id: string;
  themeId: string;
  macroId: string;
  question: string;
  answer: string;
  explanation: string;
  tip?: string; // Macete / Dica para memorizar Cesgranrio/Transpetro
  difficulty: 'facil' | 'medio' | 'dificil';
  tags: string[];
  // Spaced Repetition fields
  repetitionCount: number;
  intervalDays: number;
  easeFactor: number;
  lastReviewed?: string; // ISO date
  nextReviewDate?: string; // ISO date
  consecutiveCorrect: number;
  errorCount: number;
  status: CardStatus;
  userCreated?: boolean;
}

export interface ThemeDeck {
  id: string;
  macroId: string;
  title: string;
  shortTitle: string;
  description: string;
  iconName: string;
  colorName: string;
  cards: Flashcard[];
}

export interface MacroDiscipline {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  accentColor: string; // e.g. emerald, blue, purple, amber
  gradient: string;
  bgLight: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  themes: ThemeDeck[];
}

export interface GamificationBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  maxProgress: number;
  currentProgress: number;
  category: 'streak' | 'accuracy' | 'volume' | 'mastery';
}

export interface StudyAlarmConfig {
  enabled: boolean;
  time: string; // "HH:MM"
  sound: 'chime' | 'digital' | 'radar' | 'gong';
  volume: number;
  label: string;
  pomodoroActive: boolean;
  pomodoroMinutes: number;
  pomodoroTimeRemaining: number;
  lastNotifiedDate?: string;
}

export interface UserStats {
  xp: number;
  level: number;
  title: string;
  streak: number;
  bestStreak: number;
  lastActiveDate?: string;
  totalReviews: number;
  totalCorrect: number;
  totalWrong: number;
  dailyGoal: number; // e.g. 20 cards per day
  todayReviewsCount: number;
  todayDate: string;
}

export interface SessionResult {
  deckTitle: string;
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  xpEarned: number;
  accuracy: number;
  mistakeCardIds: string[];
}

export interface ActiveSessionState {
  sessionKey: string;
  title: string;
  macroId?: string;
  themeId?: string;
  cardIds: string[];
  currentIndex: number;
  sessionReviews: { cardId: string; rating: Rating }[];
  updatedAt: string;
  initialCardsSnapshot?: Flashcard[];
  initialStatsSnapshot?: UserStats;
  initialBadgesSnapshot?: GamificationBadge[];
}

