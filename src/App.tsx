import { useState, useEffect, useRef } from 'react';
import { 
  PlayCircle, 
  Flame, 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Filter,
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  Flashcard, 
  MacroDiscipline, 
  ThemeDeck, 
  UserStats, 
  StudyAlarmConfig, 
  GamificationBadge, 
  SessionResult, 
  Rating,
  ActiveSessionState
} from './types';
import { INITIAL_MACRO_DISCIPLINES } from './data/transpetroCards';
import { 
  getStoredCards, 
  saveCards, 
  getStoredStats, 
  saveStats, 
  updateStatsOnStudy, 
  getStoredBadges, 
  saveBadges, 
  getStoredAlarm, 
  saveAlarm,
  getStoredActiveSession,
  saveActiveSession,
  clearActiveSession,
  getDeckProgressMap,
  saveDeckProgress,
  clearDeckProgress,
  resetCardsByIds,
  resetMacroCards,
  resetAllCards,
  recalculateStatsFromCards,
  getInitialUserStats
} from './utils/storage';
import { 
  calculateSpacedRepetition, 
  calculateXpEarned, 
  checkBadges, 
  isCardDue,
  getLevelForXp,
  INITIAL_BADGES
} from './utils/spacedRepetition';
import { playStudyAlarm, stopStudyAlarm } from './utils/audio';

import { Navbar } from './components/Navbar';
import { MacroDisciplineCard } from './components/MacroDisciplineCard';
import { StudySession } from './components/StudySession';
import { CadernoDeErros } from './components/CadernoDeErros';
import { ProgressDashboard } from './components/ProgressDashboard';
import { StudyAlarmModal } from './components/StudyAlarmModal';
import { AddCardModal } from './components/AddCardModal';
import { BackupModal } from './components/BackupModal';
import { BackupData } from './utils/backup';

interface ActiveSession {
  sessionKey: string;
  title: string;
  macroId?: string;
  themeId?: string;
  cards: Flashcard[];
  currentIndex: number;
  sessionReviews: { cardId: string; rating: Rating }[];
  initialCardsSnapshot: Flashcard[];
  initialStatsSnapshot: UserStats;
  initialBadgesSnapshot: GamificationBadge[];
}

export default function App() {
  // Application Data States
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [badges, setBadges] = useState<GamificationBadge[]>(getStoredBadges());
  const [alarmConfig, setAlarmConfig] = useState<StudyAlarmConfig>(getStoredAlarm());
  
  // Navigation & Session View States
  const [currentView, setCurrentView] = useState<'home' | 'deck' | 'erros' | 'stats' | 'alarm'>('home');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [savedActiveSession, setSavedActiveSession] = useState<ActiveSessionState | null>(null);
  const [deckProgressMap, setDeckProgressMap] = useState<Record<string, { currentIndex: number; totalCards: number; updatedAt: string }>>({});

  // Modal Dialogs
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupModalTab, setBackupModalTab] = useState<'export' | 'import'>('export');

  // Search & Filtering in Home
  const [homeSearch, setHomeSearch] = useState('');

  // Ref to avoid duplicate alarms in the same minute
  const lastAlarmTriggerRef = useRef<string>('');

  // Initialize cards, saved session on mount and reconcile any restarted decks
  useEffect(() => {
    const loadedCards = getStoredCards();
    let currentStats = getStoredStats();
    let currentBadges = getStoredBadges();
    const saved = getStoredActiveSession();
    let reconciledCards = loadedCards;

    // Check if a saved session was restarted (index 0 or empty reviews)
    if (saved && (saved.currentIndex === 0 || !saved.sessionReviews || saved.sessionReviews.length === 0)) {
      const hasAnswered = saved.cardIds.some(id => {
        const c = loadedCards.find(card => card.id === id);
        return c && (c.status !== 'novo' || (c.repetitionCount || 0) > 0);
      });
      if (hasAnswered) {
        reconciledCards = resetCardsByIds(loadedCards, saved.cardIds);
        currentStats = recalculateStatsFromCards(reconciledCards, currentStats);
        currentBadges = checkBadges(currentStats, reconciledCards, currentBadges);
        saveBadges(currentBadges);
      }
    }

    // Reconcile stats in case totalReviews is out of sync with actual card reviews
    let totalCardReviews = 0;
    reconciledCards.forEach(c => {
      totalCardReviews += ((c.repetitionCount || 0) + (c.errorCount || 0));
    });
    if (totalCardReviews === 0 && currentStats.totalReviews > 0) {
      currentStats = recalculateStatsFromCards(reconciledCards, currentStats);
      currentBadges = checkBadges(currentStats, reconciledCards, currentBadges);
      saveBadges(currentBadges);
    }

    setCards(reconciledCards);
    setStats(currentStats);
    setBadges(currentBadges);
    setDeckProgressMap(getDeckProgressMap());
    if (saved && saved.currentIndex > 0) {
      setSavedActiveSession(saved);
    }
  }, []);

  // Alarm & Pomodoro background timer loop
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayDateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

      // Check daily scheduled alarm
      if (
        alarmConfig.enabled &&
        alarmConfig.time === currentTimeStr &&
        lastAlarmTriggerRef.current !== `${todayDateStr}_${currentTimeStr}`
      ) {
        lastAlarmTriggerRef.current = `${todayDateStr}_${currentTimeStr}`;
        setIsAlarmRinging(true);
        playStudyAlarm(alarmConfig.sound);

        // Native notification if allowed
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Transpetro Flashcards', {
              body: `Hora de revisar! Mantenha seu ritmo rumo à aprovação na Transpetro.`,
              icon: '/favicon.ico'
            });
          } catch {
            // ignore
          }
        }
      }

      // Check Pomodoro timer
      if (alarmConfig.pomodoroActive) {
        if (alarmConfig.pomodoroTimeRemaining <= 1) {
          setIsAlarmRinging(true);
          playStudyAlarm(alarmConfig.sound);
          const updated = {
            ...alarmConfig,
            pomodoroActive: false,
            pomodoroTimeRemaining: (alarmConfig.pomodoroMinutes || 25) * 60
          };
          setAlarmConfig(updated);
          saveAlarm(updated);
        } else {
          setAlarmConfig(prev => ({
            ...prev,
            pomodoroTimeRemaining: prev.pomodoroTimeRemaining - 1
          }));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarmConfig]);

  // Derived counts
  const mistakeCards = cards.filter(c => (c.errorCount || 0) > 0 || c.status === 'aprendendo');
  const dueCards = cards.filter(isCardDue);

  // Helper to consolidate reviews into cards and user stats
  const consolidateReviews = (
    baseCards: Flashcard[],
    baseStats: UserStats,
    baseBadges: GamificationBadge[],
    reviews: { cardId: string; rating: Rating }[],
    accuracy?: number
  ) => {
    if (reviews.length === 0) {
      return {
        updatedCards: baseCards,
        updatedStats: baseStats,
        updatedBadges: baseBadges
      };
    }

    let updatedCards = [...baseCards];
    let totalXp = 0;
    let anyCorrect = false;

    reviews.forEach(({ cardId, rating }) => {
      const idx = updatedCards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const updated = calculateSpacedRepetition(updatedCards[idx], rating);
        updatedCards[idx] = updated;

        const isCorrect = rating === 'bom' || rating === 'facil';
        if (isCorrect) anyCorrect = true;
        const xp = calculateXpEarned(rating, 1);
        totalXp += xp;
      }
    });

    const updatedStats = updateStatsOnStudy(baseStats, anyCorrect, totalXp);
    const updatedBadges = checkBadges(updatedStats, updatedCards, baseBadges, accuracy);

    return {
      updatedCards,
      updatedStats,
      updatedBadges
    };
  };

  // Resume saved in-progress study session
  const handleResumeSavedSession = () => {
    const stored = savedActiveSession || getStoredActiveSession();
    if (!stored) return;

    const sessionCards = stored.cardIds
      .map(id => cards.find(c => c.id === id))
      .filter((c): c is Flashcard => !!c);

    if (sessionCards.length === 0) {
      clearActiveSession();
      setSavedActiveSession(null);
      return;
    }

    const session: ActiveSession = {
      sessionKey: stored.sessionKey,
      title: stored.title,
      macroId: stored.macroId,
      themeId: stored.themeId,
      cards: sessionCards,
      currentIndex: Math.min(stored.currentIndex, sessionCards.length - 1),
      sessionReviews: stored.sessionReviews || [],
      initialCardsSnapshot: stored.initialCardsSnapshot || JSON.parse(JSON.stringify(cards)),
      initialStatsSnapshot: stored.initialStatsSnapshot || JSON.parse(JSON.stringify(stats)),
      initialBadgesSnapshot: stored.initialBadgesSnapshot || JSON.parse(JSON.stringify(badges))
    };

    setActiveSession(session);
    setCurrentView('deck');
  };

  // Discard saved in-progress study session
  const handleDiscardSavedSession = () => {
    if (savedActiveSession) {
      if (savedActiveSession.initialCardsSnapshot) {
        setCards(savedActiveSession.initialCardsSnapshot);
        saveCards(savedActiveSession.initialCardsSnapshot);
      }
      if (savedActiveSession.initialStatsSnapshot) {
        setStats(savedActiveSession.initialStatsSnapshot);
        saveStats(savedActiveSession.initialStatsSnapshot);
      }
      if (savedActiveSession.initialBadgesSnapshot) {
        setBadges(savedActiveSession.initialBadgesSnapshot);
        saveBadges(savedActiveSession.initialBadgesSnapshot);
      }
      clearDeckProgress(savedActiveSession.sessionKey);
    }
    clearActiveSession();
    setSavedActiveSession(null);
    setDeckProgressMap(getDeckProgressMap());
  };

  // Start study session for a specific sub-theme
  const handleSelectTheme = (theme: ThemeDeck) => {
    const themeCards = cards.filter(c => c.themeId === theme.id);
    if (themeCards.length === 0) return;

    const stored = getStoredActiveSession();
    const progress = getDeckProgressMap()[theme.id];

    let startIndex = 0;
    let reviews: { cardId: string; rating: Rating }[] = [];
    let initialCardsSnap = JSON.parse(JSON.stringify(cards));
    let initialStatsSnap = JSON.parse(JSON.stringify(stats));
    let initialBadgesSnap = JSON.parse(JSON.stringify(badges));

    if (stored && stored.sessionKey === theme.id && stored.currentIndex < themeCards.length) {
      startIndex = stored.currentIndex;
      reviews = stored.sessionReviews || [];
      if (stored.initialCardsSnapshot) initialCardsSnap = stored.initialCardsSnapshot;
      if (stored.initialStatsSnapshot) initialStatsSnap = stored.initialStatsSnapshot;
      if (stored.initialBadgesSnapshot) initialBadgesSnap = stored.initialBadgesSnapshot;
    } else if (progress && progress.currentIndex > 0 && progress.currentIndex < themeCards.length) {
      startIndex = progress.currentIndex;
    }

    const session: ActiveSession = {
      sessionKey: theme.id,
      title: theme.title,
      macroId: theme.macroId,
      themeId: theme.id,
      cards: themeCards,
      currentIndex: startIndex,
      sessionReviews: reviews,
      initialCardsSnapshot: initialCardsSnap,
      initialStatsSnapshot: initialStatsSnap,
      initialBadgesSnapshot: initialBadgesSnap
    };

    const sessionState: ActiveSessionState = {
      sessionKey: theme.id,
      title: theme.title,
      macroId: theme.macroId,
      themeId: theme.id,
      cardIds: themeCards.map(c => c.id),
      currentIndex: startIndex,
      sessionReviews: reviews,
      initialCardsSnapshot: initialCardsSnap,
      initialStatsSnapshot: initialStatsSnap,
      initialBadgesSnapshot: initialBadgesSnap,
      updatedAt: new Date().toISOString()
    };

    setActiveSession(session);
    saveActiveSession(sessionState);
    setSavedActiveSession(sessionState);
    setCurrentView('deck');
  };

  // Start study session for entire macro discipline
  const handleStudyMacro = (macro: MacroDiscipline) => {
    const macroCards = cards.filter(c => c.macroId === macro.id);
    if (macroCards.length === 0) return;

    const stored = getStoredActiveSession();
    const progress = getDeckProgressMap()[macro.id];

    let startIndex = 0;
    let reviews: { cardId: string; rating: Rating }[] = [];
    let initialCardsSnap = JSON.parse(JSON.stringify(cards));
    let initialStatsSnap = JSON.parse(JSON.stringify(stats));
    let initialBadgesSnap = JSON.parse(JSON.stringify(badges));

    if (stored && stored.sessionKey === macro.id && stored.currentIndex < macroCards.length) {
      startIndex = stored.currentIndex;
      reviews = stored.sessionReviews || [];
      if (stored.initialCardsSnapshot) initialCardsSnap = stored.initialCardsSnapshot;
      if (stored.initialStatsSnapshot) initialStatsSnap = stored.initialStatsSnapshot;
      if (stored.initialBadgesSnapshot) initialBadgesSnap = stored.initialBadgesSnapshot;
    } else if (progress && progress.currentIndex > 0 && progress.currentIndex < macroCards.length) {
      startIndex = progress.currentIndex;
    }

    const session: ActiveSession = {
      sessionKey: macro.id,
      title: macro.name,
      macroId: macro.id,
      cards: macroCards,
      currentIndex: startIndex,
      sessionReviews: reviews,
      initialCardsSnapshot: initialCardsSnap,
      initialStatsSnapshot: initialStatsSnap,
      initialBadgesSnapshot: initialBadgesSnap
    };

    const sessionState: ActiveSessionState = {
      sessionKey: macro.id,
      title: macro.name,
      macroId: macro.id,
      cardIds: macroCards.map(c => c.id),
      currentIndex: startIndex,
      sessionReviews: reviews,
      initialCardsSnapshot: initialCardsSnap,
      initialStatsSnapshot: initialStatsSnap,
      initialBadgesSnapshot: initialBadgesSnap,
      updatedAt: new Date().toISOString()
    };

    setActiveSession(session);
    saveActiveSession(sessionState);
    setSavedActiveSession(sessionState);
    setCurrentView('deck');
  };

  // Start revision for all due cards
  const handleStudyAllDue = () => {
    if (dueCards.length === 0) return;
    const initialCardsSnap = JSON.parse(JSON.stringify(cards));
    const initialStatsSnap = JSON.parse(JSON.stringify(stats));
    const initialBadgesSnap = JSON.parse(JSON.stringify(badges));

    const session: ActiveSession = {
      sessionKey: 'all_due_reviews',
      title: 'Revisão Espaçada Diária (Pendentes)',
      cards: dueCards,
      currentIndex: 0,
      sessionReviews: [],
      initialCardsSnapshot: initialCardsSnap,
      initialStatsSnapshot: initialStatsSnap,
      initialBadgesSnapshot: initialBadgesSnap
    };
    setActiveSession(session);
    setCurrentView('deck');
  };

  // Start revision of mistaken cards
  const handleStartReviewMistakes = (cardsToReview: Flashcard[]) => {
    if (cardsToReview.length === 0) return;
    const initialCardsSnap = JSON.parse(JSON.stringify(cards));
    const initialStatsSnap = JSON.parse(JSON.stringify(stats));
    const initialBadgesSnap = JSON.parse(JSON.stringify(badges));

    const session: ActiveSession = {
      sessionKey: 'caderno_erros_intensivo',
      title: 'Revisão Intensiva: Caderno de Erros',
      cards: cardsToReview,
      currentIndex: 0,
      sessionReviews: [],
      initialCardsSnapshot: initialCardsSnap,
      initialStatsSnapshot: initialStatsSnap,
      initialBadgesSnapshot: initialBadgesSnap
    };
    setActiveSession(session);
    setCurrentView('deck');
  };

  // Immediate card rating handler: updates active session state & saves progress in real time
  // Note: Card SM-2 stats are NOT permanently committed here so that if the user restarts from the 1st card, nothing is counted!
  const handleCardAnswered = (
    _cardId: string,
    _rating: Rating,
    nextIndex: number,
    allReviews: { cardId: string; rating: Rating }[]
  ) => {
    if (activeSession) {
      const updatedSessionState: ActiveSessionState = {
        sessionKey: activeSession.sessionKey,
        title: activeSession.title,
        macroId: activeSession.macroId,
        themeId: activeSession.themeId,
        cardIds: activeSession.cards.map(c => c.id),
        currentIndex: nextIndex,
        sessionReviews: allReviews,
        initialCardsSnapshot: activeSession.initialCardsSnapshot,
        initialStatsSnapshot: activeSession.initialStatsSnapshot,
        initialBadgesSnapshot: activeSession.initialBadgesSnapshot,
        updatedAt: new Date().toISOString()
      };
      saveActiveSession(updatedSessionState);
      saveDeckProgress(activeSession.sessionKey, nextIndex, activeSession.cards.length);
      setSavedActiveSession(updatedSessionState);
      setDeckProgressMap(getDeckProgressMap());
      setActiveSession(prev => prev ? { ...prev, currentIndex: nextIndex, sessionReviews: allReviews } : null);
    }
  };

  // Exit study session handler - saves & commits progress up to this point because user did NOT restart
  const handleExitSession = (lastIndex: number, reviews: { cardId: string; rating: Rating }[]) => {
    if (activeSession) {
      // If at card 0 with no reviews, do not commit
      if (lastIndex === 0 && reviews.length === 0) {
        clearActiveSession();
        clearDeckProgress(activeSession.sessionKey);
        setSavedActiveSession(null);
        setDeckProgressMap(getDeckProgressMap());
        setActiveSession(null);
        setCurrentView('home');
        return;
      }

      // Since the user did NOT click restart, we commit the cards answered so far
      const { updatedCards, updatedStats, updatedBadges } = consolidateReviews(
        activeSession.initialCardsSnapshot,
        activeSession.initialStatsSnapshot,
        activeSession.initialBadgesSnapshot,
        reviews
      );
      setCards(updatedCards);
      saveCards(updatedCards);
      setStats(updatedStats);
      saveStats(updatedStats);
      setBadges(updatedBadges);
      saveBadges(updatedBadges);

      const updatedSessionState: ActiveSessionState = {
        sessionKey: activeSession.sessionKey,
        title: activeSession.title,
        macroId: activeSession.macroId,
        themeId: activeSession.themeId,
        cardIds: activeSession.cards.map(c => c.id),
        currentIndex: lastIndex,
        sessionReviews: reviews,
        initialCardsSnapshot: activeSession.initialCardsSnapshot,
        initialStatsSnapshot: activeSession.initialStatsSnapshot,
        initialBadgesSnapshot: activeSession.initialBadgesSnapshot,
        updatedAt: new Date().toISOString()
      };
      saveActiveSession(updatedSessionState);
      saveDeckProgress(activeSession.sessionKey, lastIndex, activeSession.cards.length);
      setSavedActiveSession(updatedSessionState);
      setDeckProgressMap(getDeckProgressMap());
    }
    setCurrentView('home');
  };

  // Restart study session from first card
  // CRITICAL RULE: Since the user clicked restart from first card, NONE of the cards in this session are counted!
  const handleRestartSession = () => {
    if (activeSession) {
      const sessionCardIds = activeSession.cards.map(c => c.id);

      // 1. Explicitly reset all cards belonging to this session back to pristine 'novo' state
      const updatedCards = resetCardsByIds(cards, sessionCardIds);
      setCards(updatedCards);

      // 2. Recalculate stats without these cards so Progress dashboard and counters are accurate
      const updatedStats = recalculateStatsFromCards(updatedCards, stats);
      setStats(updatedStats);

      // 3. Update badges
      const updatedBadges = checkBadges(updatedStats, updatedCards, badges);
      setBadges(updatedBadges);
      saveBadges(updatedBadges);

      // 4. Clear deck progress for this deck
      clearDeckProgress(activeSession.sessionKey);

      // 5. Update session state with pristine cards and 0 reviews
      const pristineCardsForSession = updatedCards.filter(c => sessionCardIds.includes(c.id));
      const updatedSessionState: ActiveSessionState = {
        sessionKey: activeSession.sessionKey,
        title: activeSession.title,
        macroId: activeSession.macroId,
        themeId: activeSession.themeId,
        cardIds: sessionCardIds,
        currentIndex: 0,
        sessionReviews: [],
        initialCardsSnapshot: JSON.parse(JSON.stringify(updatedCards)),
        initialStatsSnapshot: JSON.parse(JSON.stringify(updatedStats)),
        initialBadgesSnapshot: JSON.parse(JSON.stringify(updatedBadges)),
        updatedAt: new Date().toISOString()
      };
      saveActiveSession(updatedSessionState);
      setSavedActiveSession(updatedSessionState);
      setDeckProgressMap(getDeckProgressMap());

      setActiveSession({
        ...activeSession,
        cards: pristineCardsForSession,
        currentIndex: 0,
        sessionReviews: [],
        initialCardsSnapshot: JSON.parse(JSON.stringify(updatedCards)),
        initialStatsSnapshot: JSON.parse(JSON.stringify(updatedStats)),
        initialBadgesSnapshot: JSON.parse(JSON.stringify(updatedBadges))
      });
    }
  };

  // Reset all progress across all 160 cards, stats, and badges
  const handleResetAllProgress = () => {
    const freshCards = resetAllCards();
    setCards(freshCards);
    const freshStats = getInitialUserStats();
    setStats(freshStats);
    saveStats(freshStats);
    const freshBadges = INITIAL_BADGES.map(b => ({ ...b, currentProgress: 0, unlockedAt: undefined }));
    setBadges(freshBadges);
    saveBadges(freshBadges);
    clearActiveSession();
    setSavedActiveSession(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('transpetro_deck_progress_v2');
    }
    setDeckProgressMap({});
  };

  // Reset progress of a single macro discipline
  const handleResetMacroCards = (macroId: string) => {
    const updatedCards = resetMacroCards(cards, macroId);
    setCards(updatedCards);
    const updatedStats = recalculateStatsFromCards(updatedCards, stats);
    setStats(updatedStats);
    const updatedBadges = checkBadges(updatedStats, updatedCards, badges);
    setBadges(updatedBadges);
    saveBadges(updatedBadges);

    clearDeckProgress(macroId);
    INITIAL_MACRO_DISCIPLINES.find(m => m.id === macroId)?.themes.forEach(t => {
      clearDeckProgress(t.id);
    });
    setDeckProgressMap(getDeckProgressMap());

    if (savedActiveSession && savedActiveSession.macroId === macroId) {
      clearActiveSession();
      setSavedActiveSession(null);
    }
  };

  // Clean cards from any restarted or incomplete session
  const handleCleanRestartedSession = () => {
    let targetCardIds: string[] = [];
    const stored = getStoredActiveSession();
    if (stored && (stored.currentIndex === 0 || !stored.sessionReviews || stored.sessionReviews.length === 0)) {
      targetCardIds.push(...stored.cardIds);
      clearActiveSession();
      setSavedActiveSession(null);
    }

    // Check deck progress map for 0-index decks
    Object.entries(deckProgressMap).forEach(([key, prog]) => {
      if ((prog as { currentIndex: number }).currentIndex === 0) {
        const matching = cards.filter(c => c.themeId === key || c.macroId === key).map(c => c.id);
        targetCardIds.push(...matching);
        clearDeckProgress(key);
      }
    });

    if (targetCardIds.length > 0) {
      const updated = resetCardsByIds(cards, targetCardIds);
      setCards(updated);
      const newStats = recalculateStatsFromCards(updated, stats);
      setStats(newStats);
      const newBadges = checkBadges(newStats, updated, badges);
      setBadges(newBadges);
      saveBadges(newBadges);
      setDeckProgressMap(getDeckProgressMap());
    } else {
      // Reconcile stats from cards
      const newStats = recalculateStatsFromCards(cards, stats);
      setStats(newStats);
      const newBadges = checkBadges(newStats, cards, badges);
      setBadges(newBadges);
      saveBadges(newBadges);
    }
  };

  // Open Backup & Restore modal
  const handleOpenBackupModal = (tab: 'export' | 'import' = 'export') => {
    setBackupModalTab(tab);
    setIsBackupModalOpen(true);
  };

  // Restore complete backup data from parsed JSON
  const handleRestoreBackup = (backupData: BackupData) => {
    // 1. Update cards
    setCards(backupData.cards);
    saveCards(backupData.cards);

    // 2. Update stats
    setStats(backupData.stats);
    saveStats(backupData.stats);

    // 3. Update badges
    setBadges(backupData.badges);
    saveBadges(backupData.badges);

    // 4. Update alarm config if present
    if (backupData.alarmConfig) {
      setAlarmConfig(backupData.alarmConfig);
      saveAlarm(backupData.alarmConfig);
    }

    // 5. Update deck progress map
    if (backupData.deckProgressMap) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('transpetro_deck_progress_v2', JSON.stringify(backupData.deckProgressMap));
      }
      setDeckProgressMap(backupData.deckProgressMap);
    }

    // 6. Update active session
    if (backupData.activeSession) {
      saveActiveSession(backupData.activeSession);
      setSavedActiveSession(backupData.activeSession);
    } else {
      clearActiveSession();
      setSavedActiveSession(null);
    }
  };

  // Finish study session handler
  // User completed the full session WITHOUT clicking restart -> commit all cards and session stats!
  const handleFinishSession = (
    result: SessionResult,
    sessionReviews: { cardId: string; rating: Rating }[]
  ) => {
    const baseCards = activeSession?.initialCardsSnapshot || cards;
    const baseStats = activeSession?.initialStatsSnapshot || stats;
    const baseBadges = activeSession?.initialBadgesSnapshot || badges;

    const { updatedCards, updatedStats, updatedBadges } = consolidateReviews(
      baseCards,
      baseStats,
      baseBadges,
      sessionReviews,
      result.accuracy
    );

    setCards(updatedCards);
    saveCards(updatedCards);
    setStats(updatedStats);
    saveStats(updatedStats);
    setBadges(updatedBadges);
    saveBadges(updatedBadges);

    if (activeSession) {
      clearActiveSession();
      clearDeckProgress(activeSession.sessionKey);
      setSavedActiveSession(null);
      setDeckProgressMap(getDeckProgressMap());
    }

    setActiveSession(null);
    setCurrentView('home');
  };

  // Reset an error card directly from Caderno de Erros
  const handleResetError = (cardId: string) => {
    const updatedCards = cards.map(c => {
      if (c.id === cardId) {
        return {
          ...c,
          errorCount: 0,
          status: 'dominado' as const,
          consecutiveCorrect: 3
        };
      }
      return c;
    });
    setCards(updatedCards);
    saveCards(updatedCards);
  };

  // Add custom card
  const handleAddCard = (newCard: Flashcard) => {
    const updated = [newCard, ...cards];
    setCards(updated);
    saveCards(updated);
  };

  // Dismiss ringing alarm
  const handleDismissAlarm = () => {
    stopStudyAlarm();
    setIsAlarmRinging(false);
  };

  // Start Pomodoro
  const handleStartPomodoro = (minutes: number) => {
    const updated: StudyAlarmConfig = {
      ...alarmConfig,
      pomodoroActive: true,
      pomodoroMinutes: minutes,
      pomodoroTimeRemaining: minutes * 60
    };
    setAlarmConfig(updated);
    saveAlarm(updated);
  };

  // Stop Pomodoro
  const handleStopPomodoro = () => {
    stopStudyAlarm();
    const updated: StudyAlarmConfig = {
      ...alarmConfig,
      pomodoroActive: false,
      pomodoroTimeRemaining: (alarmConfig.pomodoroMinutes || 25) * 60
    };
    setAlarmConfig(updated);
    saveAlarm(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-zinc-900 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-950 font-sans">
      
      {/* Navigation Bar */}
      <Navbar
        stats={stats}
        alarmConfig={alarmConfig}
        mistakesCount={mistakeCards.length}
        currentView={currentView}
        onNavigate={(view) => {
          setActiveSession(null);
          setCurrentView(view);
        }}
        onOpenAddCard={() => setIsAddCardOpen(true)}
        onOpenAlarmModal={() => setIsAlarmModalOpen(true)}
        isAlarmRinging={isAlarmRinging}
        onDismissAlarm={handleDismissAlarm}
        onOpenBackupModal={() => handleOpenBackupModal('export')}
      />

      {/* Main App Body */}
      <main className="flex-1 pb-16">
        
        {/* VIEW 1: ACTIVE STUDY SESSION */}
        {currentView === 'deck' && activeSession && (
          <StudySession
            deckTitle={activeSession.title}
            cards={activeSession.cards}
            initialIndex={activeSession.currentIndex}
            initialReviews={activeSession.sessionReviews}
            onCardAnswered={handleCardAnswered}
            onFinishSession={handleFinishSession}
            onExit={handleExitSession}
            onRestart={handleRestartSession}
          />
        )}

        {/* VIEW 2: CADERNO DE ERROS */}
        {currentView === 'erros' && (
          <CadernoDeErros
            cards={cards}
            macros={INITIAL_MACRO_DISCIPLINES}
            onStartReviewMistakes={handleStartReviewMistakes}
            onResetError={handleResetError}
          />
        )}

        {/* VIEW 3: STATS & DASHBOARD */}
        {currentView === 'stats' && (
          <ProgressDashboard
            stats={stats}
            allCards={cards}
            macros={INITIAL_MACRO_DISCIPLINES}
            badges={badges}
            onResetAllProgress={handleResetAllProgress}
            onResetMacro={handleResetMacroCards}
            onCleanRestartedSession={handleCleanRestartedSession}
            onOpenBackupModal={handleOpenBackupModal}
            hasRestartedSessionPending={
              Boolean(savedActiveSession && (savedActiveSession.currentIndex === 0 || !savedActiveSession.sessionReviews || savedActiveSession.sessionReviews.length === 0)) ||
              Object.values(deckProgressMap).some((p: { currentIndex: number }) => p.currentIndex === 0)
            }
          />
        )}

        {/* VIEW 4: HOME (Macro Disciplines & Thematic Decks) */}
        {currentView === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
            
            {/* In-Progress Session Resume Banner */}
            {savedActiveSession && savedActiveSession.currentIndex > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-teal-500/15 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <PlayCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded">
                        Sessão em Andamento
                      </span>
                      <span className="text-xs font-bold text-zinc-600 font-mono-numbers">
                        Você parou no Card {savedActiveSession.currentIndex + 1} de {savedActiveSession.cardIds.length}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-sm sm:text-base text-zinc-900 mt-0.5">
                      {savedActiveSession.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    onClick={handleResumeSavedSession}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition flex items-center gap-1.5"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Continuar de Onde Parou</span>
                  </button>
                  <button
                    onClick={handleDiscardSavedSession}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {/* Hero & Quick Action Bar */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
              {/* Abstract wave decoration */}
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-y-8 translate-x-8">
                <div className="w-96 h-96 rounded-full border-[18px] border-white" />
              </div>

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      Edital Transpetro 2024 / 2025
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      20 Cards por Tema (160 no total)
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                    Preparatório Gamificado Transpetro
                  </h1>
                  <p className="text-sm text-emerald-100/90 mt-2 leading-relaxed">
                    Memorização ativa com repetição espaçada dividida nas 4 macro áreas do concurso.
                    Pratique, zere seus erros e acompanhe sua evolução para conquistar sua vaga na frota e nos terminais.
                  </p>
                </div>

                {/* Primary Quick Start CTAs */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  {dueCards.length > 0 ? (
                    <button
                      onClick={handleStudyAllDue}
                      className="px-6 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-extrabold text-sm shadow-lg shadow-emerald-950/40 transition flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <PlayCircle className="w-5 h-5 text-emerald-950" />
                      <span>Revisar Pendentes ({dueCards.length} hoje)</span>
                    </button>
                  ) : (
                    <div className="px-5 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-bold text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Todas as revisões de hoje estão em dia!</span>
                    </div>
                  )}

                  {mistakeCards.length > 0 && (
                    <button
                      onClick={() => setCurrentView('erros')}
                      className="px-5 py-3 rounded-2xl bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/40 text-rose-100 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <AlertOctagon className="w-4 h-4 text-rose-300" />
                      <span>Caderno de Erros ({mistakeCards.length} pendentes)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pomodoro status bar if active */}
              {alarmConfig.pomodoroActive && (
                <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>
                      Timer Pomodoro Ativo: {Math.floor(alarmConfig.pomodoroTimeRemaining / 60)}m {alarmConfig.pomodoroTimeRemaining % 60}s restantes
                    </span>
                  </div>
                  <button
                    onClick={handleStopPomodoro}
                    className="text-xs text-rose-300 hover:underline font-bold"
                  >
                    Parar Pomodoro
                  </button>
                </div>
              )}
            </div>

            {/* Quick Macro Discipline Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
                  Estrutura Curricular
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                  As 4 Macro Disciplinas do Concurso
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500">
                  Total: {cards.length} flashcards carregados
                </span>
              </div>
            </div>

            {/* Grid of the 4 Macro Disciplines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {INITIAL_MACRO_DISCIPLINES.map((macro) => (
                <MacroDisciplineCard
                  key={macro.id}
                  macro={macro}
                  allCards={cards}
                  deckProgressMap={deckProgressMap}
                  onSelectTheme={handleSelectTheme}
                  onStudyMacro={handleStudyMacro}
                />
              ))}
            </div>

            {/* Bottom Motivation Banner */}
            <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-zinc-900">
                    Constância é a Chave da Aprovação
                  </h4>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    15 a 20 minutos de flashcards diários garantem fixação 4x superior à leitura passiva.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsAlarmModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-zinc-600" />
                  <span>Configurar Alarme</span>
                </button>
                <button
                  onClick={() => setIsAddCardOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Card</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Modal: Study Alarm & Pomodoro */}
      <StudyAlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        alarmConfig={alarmConfig}
        onSaveAlarm={(newConfig) => {
          setAlarmConfig(newConfig);
          saveAlarm(newConfig);
        }}
        onStartPomodoro={handleStartPomodoro}
        onStopPomodoro={handleStopPomodoro}
      />

      {/* Modal: Add Custom Card */}
      <AddCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        macros={INITIAL_MACRO_DISCIPLINES}
        onAddCard={handleAddCard}
      />

      {/* Modal: Backup & Restore JSON */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        cards={cards}
        stats={stats}
        badges={badges}
        alarmConfig={alarmConfig}
        deckProgressMap={deckProgressMap}
        activeSession={activeSession ? {
          sessionKey: activeSession.sessionKey,
          title: activeSession.title,
          macroId: activeSession.macroId,
          themeId: activeSession.themeId,
          cardIds: activeSession.cards.map(c => c.id),
          currentIndex: activeSession.currentIndex,
          sessionReviews: activeSession.sessionReviews,
          initialCardsSnapshot: activeSession.initialCardsSnapshot,
          initialStatsSnapshot: activeSession.initialStatsSnapshot,
          initialBadgesSnapshot: activeSession.initialBadgesSnapshot,
          updatedAt: new Date().toISOString()
        } : savedActiveSession}
        onRestoreBackup={handleRestoreBackup}
        initialTab={backupModalTab}
      />

    </div>
  );
}
