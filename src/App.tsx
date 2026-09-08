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
  Rating 
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
  saveAlarm 
} from './utils/storage';
import { 
  calculateSpacedRepetition, 
  calculateXpEarned, 
  checkBadges, 
  isCardDue,
  getLevelForXp
} from './utils/spacedRepetition';
import { playStudyAlarm, stopStudyAlarm } from './utils/audio';

import { Navbar } from './components/Navbar';
import { MacroDisciplineCard } from './components/MacroDisciplineCard';
import { StudySession } from './components/StudySession';
import { CadernoDeErros } from './components/CadernoDeErros';
import { ProgressDashboard } from './components/ProgressDashboard';
import { StudyAlarmModal } from './components/StudyAlarmModal';
import { AddCardModal } from './components/AddCardModal';

export default function App() {
  // Application Data States
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [badges, setBadges] = useState<GamificationBadge[]>(getStoredBadges());
  const [alarmConfig, setAlarmConfig] = useState<StudyAlarmConfig>(getStoredAlarm());
  
  // Navigation & Session View States
  const [currentView, setCurrentView] = useState<'home' | 'deck' | 'erros' | 'stats' | 'alarm'>('home');
  const [activeSession, setActiveSession] = useState<{ title: string; cards: Flashcard[] } | null>(null);

  // Modal Dialogs
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

  // Search & Filtering in Home
  const [homeSearch, setHomeSearch] = useState('');

  // Ref to avoid duplicate alarms in the same minute
  const lastAlarmTriggerRef = useRef<string>('');

  // Initialize cards on mount
  useEffect(() => {
    const loadedCards = getStoredCards();
    setCards(loadedCards);
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

  // Start study session for a specific sub-theme
  const handleSelectTheme = (theme: ThemeDeck) => {
    const themeCards = cards.filter(c => c.themeId === theme.id);
    if (themeCards.length === 0) return;
    setActiveSession({
      title: theme.title,
      cards: themeCards
    });
    setCurrentView('deck');
  };

  // Start study session for entire macro discipline
  const handleStudyMacro = (macro: MacroDiscipline) => {
    const macroCards = cards.filter(c => c.macroId === macro.id);
    if (macroCards.length === 0) return;
    setActiveSession({
      title: macro.name,
      cards: macroCards
    });
    setCurrentView('deck');
  };

  // Start revision for all due cards
  const handleStudyAllDue = () => {
    if (dueCards.length === 0) return;
    setActiveSession({
      title: 'Revisão Espaçada Diária (Pendentes)',
      cards: dueCards
    });
    setCurrentView('deck');
  };

  // Start revision of mistaken cards
  const handleStartReviewMistakes = (cardsToReview: Flashcard[]) => {
    if (cardsToReview.length === 0) return;
    setActiveSession({
      title: 'Revisão Intensiva: Caderno de Erros',
      cards: cardsToReview
    });
    setCurrentView('deck');
  };

  // Finish study session handler
  const handleFinishSession = (
    result: SessionResult,
    sessionReviews: { cardId: string; rating: Rating }[]
  ) => {
    let updatedCards = [...cards];
    let totalXpEarned = 0;
    let anyCorrect = false;

    sessionReviews.forEach(({ cardId, rating }) => {
      const idx = updatedCards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const updated = calculateSpacedRepetition(updatedCards[idx], rating);
        updatedCards[idx] = updated;

        const isCorrect = rating === 'bom' || rating === 'facil';
        if (isCorrect) anyCorrect = true;
        const xp = calculateXpEarned(rating, 1);
        totalXpEarned += xp;
      }
    });

    // Update stats
    const newStats = updateStatsOnStudy(stats, anyCorrect, totalXpEarned);
    setStats(newStats);

    // Check badges
    const updatedBadges = checkBadges(newStats, updatedCards, badges, result.accuracy);
    setBadges(updatedBadges);
    saveBadges(updatedBadges);

    // Save cards
    setCards(updatedCards);
    saveCards(updatedCards);

    // Return to home or errors view
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
      />

      {/* Main App Body */}
      <main className="flex-1 pb-16">
        
        {/* VIEW 1: ACTIVE STUDY SESSION */}
        {currentView === 'deck' && activeSession && (
          <StudySession
            deckTitle={activeSession.title}
            cards={activeSession.cards}
            onFinishSession={handleFinishSession}
            onExit={() => {
              setActiveSession(null);
              setCurrentView('home');
            }}
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
          />
        )}

        {/* VIEW 4: HOME (Macro Disciplines & Thematic Decks) */}
        {currentView === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
            
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

    </div>
  );
}
