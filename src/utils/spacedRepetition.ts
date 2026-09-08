import { Flashcard, Rating, UserStats, GamificationBadge } from '../types';

export function calculateSpacedRepetition(card: Flashcard, rating: Rating): Flashcard {
  const updated: Flashcard = { ...card };
  const now = new Date();
  updated.lastReviewed = now.toISOString();
  updated.repetitionCount = (updated.repetitionCount || 0) + 1;

  let easeFactor = updated.easeFactor || 2.5;
  let intervalDays = updated.intervalDays || 0;
  let consecutiveCorrect = updated.consecutiveCorrect || 0;
  let errorCount = updated.errorCount || 0;

  switch (rating) {
    case 'errei':
      consecutiveCorrect = 0;
      intervalDays = 0;
      errorCount += 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      updated.status = 'aprendendo';
      // Next review is today (due immediately)
      updated.nextReviewDate = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes from now
      break;

    case 'dificil':
      consecutiveCorrect = Math.max(1, consecutiveCorrect);
      intervalDays = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      updated.status = 'revisando';
      const d1 = new Date(now);
      d1.setDate(d1.getDate() + 1);
      updated.nextReviewDate = d1.toISOString();
      break;

    case 'bom':
      consecutiveCorrect += 1;
      if (intervalDays === 0) {
        intervalDays = 1;
      } else if (intervalDays === 1) {
        intervalDays = 3;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor);
      }
      updated.status = consecutiveCorrect >= 3 ? 'dominado' : 'revisando';
      const d2 = new Date(now);
      d2.setDate(d2.getDate() + intervalDays);
      updated.nextReviewDate = d2.toISOString();
      break;

    case 'facil':
      consecutiveCorrect += 2;
      easeFactor = Math.min(3.0, easeFactor + 0.15);
      if (intervalDays === 0) {
        intervalDays = 2;
      } else if (intervalDays === 1) {
        intervalDays = 5;
      } else {
        intervalDays = Math.round(intervalDays * easeFactor * 1.3);
      }
      updated.status = consecutiveCorrect >= 2 ? 'dominado' : 'revisando';
      const d3 = new Date(now);
      d3.setDate(d3.getDate() + intervalDays);
      updated.nextReviewDate = d3.toISOString();
      break;
  }

  updated.easeFactor = Number(easeFactor.toFixed(2));
  updated.intervalDays = intervalDays;
  updated.consecutiveCorrect = consecutiveCorrect;
  updated.errorCount = errorCount;

  return updated;
}

export function calculateXpEarned(rating: Rating, combo = 1): number {
  let base = 5;
  if (rating === 'dificil') base = 10;
  if (rating === 'bom') base = 15;
  if (rating === 'facil') base = 20;

  const bonus = combo > 1 ? Math.min(combo * 2, 10) : 0;
  return base + bonus;
}

export interface LevelInfo {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  color: string;
}

export const LEVELS: LevelInfo[] = [
  { level: 1, title: 'Aspirante em Administração e Controle', minXp: 0, maxXp: 150, color: 'text-zinc-600' },
  { level: 2, title: 'Assistente de Suprimentos & Almoxarifado', minXp: 150, maxXp: 400, color: 'text-blue-600' },
  { level: 3, title: 'Analista de Patrimônio & Inventário', minXp: 400, maxXp: 800, color: 'text-emerald-600' },
  { level: 4, title: 'Técnico de Contabilidade & Finanças', minXp: 800, maxXp: 1400, color: 'text-cyan-600' },
  { level: 5, title: 'Especialista em Licitações e Contratos', minXp: 1400, maxXp: 2200, color: 'text-amber-600' },
  { level: 6, title: 'Supervisor de Logística & SGI', minXp: 2200, maxXp: 3200, color: 'text-indigo-600' },
  { level: 7, title: 'Gestor de Processos & Governança', minXp: 3200, maxXp: 4500, color: 'text-purple-600' },
  { level: 8, title: 'Master em Administração e Controle Transpetro', minXp: 4500, maxXp: 999999, color: 'text-rose-600' }
];

export function getLevelForXp(xp: number): LevelInfo {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

export function isCardDue(card: Flashcard): boolean {
  if (card.status === 'novo') return true;
  if (!card.nextReviewDate) return true;
  return new Date(card.nextReviewDate).getTime() <= Date.now();
}

export const INITIAL_BADGES: GamificationBadge[] = [
  {
    id: 'first_step',
    title: 'Primeira Atracação',
    description: 'Completou sua 1ª revisão de flashcard',
    icon: 'Anchor',
    maxProgress: 1,
    currentProgress: 0,
    category: 'volume'
  },
  {
    id: 'streak_3',
    title: 'Disciplina Operacional',
    description: 'Estudou por 3 dias consecutivos',
    icon: 'Flame',
    maxProgress: 3,
    currentProgress: 0,
    category: 'streak'
  },
  {
    id: 'streak_7',
    title: 'Ofensiva de Aço',
    description: 'Alcançou 7 dias seguidos de estudo focado',
    icon: 'Zap',
    maxProgress: 7,
    currentProgress: 0,
    category: 'streak'
  },
  {
    id: 'accuracy_master',
    title: 'Tolerância Zero a Falhas',
    description: 'Completou uma sessão de baralho com 100% de acerto',
    icon: 'CheckCircle2',
    maxProgress: 1,
    currentProgress: 0,
    category: 'accuracy'
  },
  {
    id: 'errados_revisados',
    title: 'Especialista em Correção',
    description: 'Revisou e acertou 15 cartões do Caderno de Erros',
    icon: 'RefreshCw',
    maxProgress: 15,
    currentProgress: 0,
    category: 'mastery'
  },
  {
    id: 'cards_50',
    title: 'Membro da Frota',
    description: 'Revisou 50 flashcards no aplicativo',
    icon: 'Award',
    maxProgress: 50,
    currentProgress: 0,
    category: 'volume'
  },
  {
    id: 'cards_160',
    title: 'Gabaritando o Edital Completo',
    description: 'Passou por todos os 160 flashcards das 4 macro disciplinas',
    icon: 'Trophy',
    maxProgress: 160,
    currentProgress: 0,
    category: 'volume'
  },
  {
    id: 'master_nr20',
    title: 'Guardião de Normas & Legislação',
    description: 'Dominou 10 ou mais cartões de Normas, Lei 13.303 e SMS',
    icon: 'ShieldCheck',
    maxProgress: 10,
    currentProgress: 0,
    category: 'mastery'
  }
];

export function checkBadges(stats: UserStats, allCards: Flashcard[], currentBadges: GamificationBadge[], sessionAccuracy?: number): GamificationBadge[] {
  return currentBadges.map((badge) => {
    // Map legacy badge id if present
    const badgeId = badge.id === 'cards_120' ? 'cards_160' : badge.id;
    if (badge.unlockedAt) return { ...badge, id: badgeId };

    let progress = badge.currentProgress;
    let unlocked = false;
    let maxProgress = badge.maxProgress;

    if (badgeId === 'first_step') {
      progress = Math.min(stats.totalReviews, 1);
      if (progress >= 1) unlocked = true;
    } else if (badgeId === 'streak_3') {
      progress = Math.min(stats.streak, 3);
      if (progress >= 3) unlocked = true;
    } else if (badgeId === 'streak_7') {
      progress = Math.min(stats.streak, 7);
      if (progress >= 7) unlocked = true;
    } else if (badgeId === 'accuracy_master') {
      if (sessionAccuracy !== undefined && sessionAccuracy >= 100) {
        progress = 1;
        unlocked = true;
      }
    } else if (badgeId === 'errados_revisados') {
      const fixedErrors = allCards.filter(c => c.status === 'dominado' && (c.repetitionCount || 0) > 1).length;
      progress = Math.min(fixedErrors, 15);
      if (progress >= 15) unlocked = true;
    } else if (badgeId === 'cards_50') {
      progress = Math.min(stats.totalReviews, 50);
      if (progress >= 50) unlocked = true;
    } else if (badgeId === 'cards_160') {
      maxProgress = 160;
      const reviewedCardsCount = allCards.filter(c => (c.repetitionCount || 0) > 0 || c.status !== 'novo').length;
      progress = Math.min(reviewedCardsCount, 160);
      if (progress >= 160) unlocked = true;
    } else if (badgeId === 'master_nr20') {
      const smsMastered = allCards.filter(c => 
        (c.tags.some(t => /sms|nr|norma|segurança|ambiental|iso|lei|transporte|licitaç/i.test(t)) || 
         c.themeId === 'theme_licitacoes_estatais_transporte') && 
        c.status === 'dominado'
      ).length;
      progress = Math.min(smsMastered, 10);
      if (progress >= 10) unlocked = true;
    }

    return {
      ...badge,
      id: badgeId,
      maxProgress,
      currentProgress: progress,
      unlockedAt: unlocked ? new Date().toISOString() : undefined
    };
  });
}
