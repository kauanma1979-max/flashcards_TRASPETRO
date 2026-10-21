import { useState, useEffect, useCallback, MouseEvent } from 'react';
import confetti from 'canvas-confetti';
import { 
  RotateCw, 
  RotateCcw,
  Lightbulb, 
  Check, 
  X, 
  Flame, 
  ChevronLeft,
  ChevronRight, 
  Trophy, 
  Sparkles, 
  ArrowLeft,
  Volume2,
  VolumeX,
  AlertCircle
} from 'lucide-react';
import { Flashcard, Rating, SessionResult } from '../types';
import { 
  playFlipSound, 
  playSuccessSound, 
  playWrongSound, 
  playLevelUpFanfare,
  speakText,
  stopSpeaking
} from '../utils/audio';
import { calculateXpEarned } from '../utils/spacedRepetition';

interface StudySessionProps {
  deckTitle: string;
  cards: Flashcard[];
  initialIndex?: number;
  initialReviews?: { cardId: string; rating: Rating }[];
  onCardAnswered?: (cardId: string, rating: Rating, nextIndex: number, allReviews: { cardId: string; rating: Rating }[]) => void;
  onFinishSession: (result: SessionResult, updatedCards: { cardId: string; rating: Rating }[]) => void;
  onExit: (currentIndex: number, currentReviews: { cardId: string; rating: Rating }[]) => void;
  onRestart?: () => void;
}

export function StudySession({
  deckTitle,
  cards,
  initialIndex = 0,
  initialReviews = [],
  onCardAnswered,
  onFinishSession,
  onExit,
  onRestart
}: StudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 && initialIndex < cards.length ? initialIndex : 0
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [combo, setCombo] = useState(0);
  const [sessionReviews, setSessionReviews] = useState<{ cardId: string; rating: Rating }[]>(initialReviews);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);

  const handleConfirmRestart = () => {
    stopSpeaking();
    setIsRestartConfirmOpen(false);
    setCurrentIndex(0);
    setSessionReviews([]);
    setIsFlipped(false);
    setShowTip(false);
    setCombo(0);
    onRestart?.();
  };

  // Sync index if initialIndex changes externally
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < cards.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, cards.length]);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? Math.round(((currentIndex) / cards.length) * 100) : 0;

  // Clean up audio on unmount or card change
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const handleToggleSpeak = useCallback((textToSpeak: string, e?: MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speakText(textToSpeak, () => setIsSpeaking(false));
    }
  }, [isSpeaking]);

  // Handle flipping
  const handleFlip = useCallback(() => {
    stopSpeaking();
    setIsSpeaking(false);
    setIsFlipped(prev => {
      const next = !prev;
      playFlipSound();
      return next;
    });
  }, []);

  // Handle moving backward without answering
  const handlePrevCard = useCallback(() => {
    if (currentIndex > 0) {
      stopSpeaking();
      setIsSpeaking(false);
      setIsFlipped(false);
      setShowTip(false);
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  // Handle moving forward without answering
  const handleNextCard = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      stopSpeaking();
      setIsSpeaking(false);
      setIsFlipped(false);
      setShowTip(false);
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, cards.length]);

  // Handle rating answer
  const handleRate = useCallback((rating: Rating) => {
    if (!currentCard) return;

    const isCorrect = rating === 'bom' || rating === 'facil';
    const isHard = rating === 'dificil';

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo);
      playSuccessSound(newCombo);
    } else if (isHard) {
      setCombo(Math.max(1, combo));
      playSuccessSound(1);
    } else {
      setCombo(0);
      playWrongSound();
    }

    const nextReviews = [...sessionReviews, { cardId: currentCard.id, rating }];
    setSessionReviews(nextReviews);

    // Persist answer immediately in real-time so nothing is lost
    const nextIndex = currentIndex + 1;
    if (onCardAnswered) {
      onCardAnswered(currentCard.id, rating, nextIndex, nextReviews);
    }

    // Reset card view state
    setIsFlipped(false);
    setShowTip(false);

    if (nextIndex < cards.length) {
      setCurrentIndex(nextIndex);
    } else {
      // Completed all cards in this session!
      setIsCompleted(true);
      const correctCount = nextReviews.filter(r => r.rating === 'bom' || r.rating === 'facil').length;
      const wrongCount = nextReviews.filter(r => r.rating === 'errei').length;
      const accuracy = nextReviews.length > 0 ? Math.round((correctCount / nextReviews.length) * 100) : 0;

      if (accuracy >= 80) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
        playLevelUpFanfare();
      }
    }
  }, [currentCard, combo, sessionReviews, currentIndex, cards.length, onCardAnswered]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if user is in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevCard();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextCard();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('errei');
        else if (e.key === '2') handleRate('dificil');
        else if (e.key === '3') handleRate('bom');
        else if (e.key === '4') handleRate('facil');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handlePrevCard, handleNextCard, handleRate, isFlipped]);

  // Session summary calculation
  if (isCompleted) {
    const correctCount = sessionReviews.filter(r => r.rating === 'bom' || r.rating === 'facil').length;
    const wrongCount = sessionReviews.filter(r => r.rating === 'errei').length;
    const hardCount = sessionReviews.filter(r => r.rating === 'dificil').length;
    const accuracy = sessionReviews.length > 0 ? Math.round((correctCount / sessionReviews.length) * 100) : 0;
    
    // Total XP
    let totalXp = 0;
    sessionReviews.forEach(r => {
      totalXp += calculateXpEarned(r.rating, 1);
    });

    const mistakeCardIds = sessionReviews.filter(r => r.rating === 'errei').map(r => r.cardId);

    const sessionResult: SessionResult = {
      deckTitle,
      totalCards: cards.length,
      correctCount,
      wrongCount,
      xpEarned: totalXp,
      accuracy,
      mistakeCardIds
    };

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-lg p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Trophy className="w-8 h-8" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
            Sessão Concluída!
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mt-1">
            {deckTitle}
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Excelente prática de memorização ativa para o concurso Transpetro!
          </p>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 my-6">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <span className="text-xs font-bold text-emerald-800 uppercase block">Taxa de Acerto</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono-numbers">
                {accuracy}%
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80">
              <span className="text-xs font-bold text-amber-800 uppercase block">XP Ganho</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono-numbers">
                +{totalXp}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/80">
              <span className="text-xs font-bold text-blue-800 uppercase block">Revisados</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono-numbers">
                {cards.length}
              </span>
            </div>
          </div>

          {/* Breakdown Pills */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-zinc-600 mb-8 flex-wrap">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
              ✓ {correctCount} acertos
            </span>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              ~ {hardCount} difíceis
            </span>
            <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-full">
              ✕ {wrongCount} erros adicionados ao Caderno
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onFinishSession(sessionResult, sessionReviews)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm shadow-md transition"
            >
              Salvar Progresso & Voltar
            </button>

            {mistakeCardIds.length > 0 && (
              <button
                onClick={() => {
                  onFinishSession(sessionResult, sessionReviews);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm border border-rose-200 transition"
              >
                Ver no Caderno de Erros ({mistakeCardIds.length})
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Nenhum cartão para revisar nesta sessão.</p>
        <button onClick={onExit} className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6">
      
      {/* Top Header: Navigation & Progress */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              stopSpeaking();
              onExit(currentIndex, sessionReviews);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 transition px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 border border-zinc-200 shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Salvar & Sair</span>
          </button>

          {currentIndex > 0 && onRestart && (
            <button
              onClick={() => setIsRestartConfirmOpen(true)}
              className="text-xs font-semibold text-zinc-500 hover:text-amber-700 hover:underline px-2 py-1 rounded transition flex items-center gap-1 hover:bg-amber-50"
              title="Reiniciar esta sessão a partir do primeiro card"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar do 1º card</span>
            </button>
          )}
        </div>

        {/* Modal de Confirmação: Reiniciar do 1º card */}
        {isRestartConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 animate-in fade-in zoom-in duration-150">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-zinc-900 mb-1.5">
                Reiniciar do 1º card?
              </h3>
              <p className="text-xs text-zinc-600 leading-relaxed mb-5">
                Ao reiniciar, <strong>nenhum dos cards respondidos nesta tentativa será contabilizado</strong> no seu histórico, repetição espaçada ou estatísticas. A sessão recomeçará do zero.
              </p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsRestartConfirmOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmRestart}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs"
                >
                  Sim, Reiniciar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* Combo badge */}
          {combo > 1 && (
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-xs shadow-xs animate-bounce">
              <Flame className="w-3.5 h-3.5 fill-white" />
              <span>Combo x{combo}!</span>
            </div>
          )}

          {/* Quick Arrow Nav in Header */}
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={handlePrevCard}
              disabled={currentIndex === 0}
              title={currentIndex === 0 ? "Primeiro cartão" : "Passar para trás sem responder [Seta ←]"}
              className={`p-1 rounded-lg transition ${
                currentIndex === 0
                  ? 'opacity-30 cursor-not-allowed text-zinc-400'
                  : 'text-zinc-700 hover:bg-white hover:shadow-xs cursor-pointer'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-zinc-700 font-mono-numbers px-2">
              {currentIndex + 1} / {cards.length}
            </span>
            <button
              onClick={handleNextCard}
              disabled={currentIndex >= cards.length - 1}
              title={currentIndex >= cards.length - 1 ? "Último cartão" : "Passar para frente sem responder [Seta →]"}
              className={`p-1 rounded-lg transition ${
                currentIndex >= cards.length - 1
                  ? 'opacity-30 cursor-not-allowed text-zinc-400'
                  : 'text-zinc-700 hover:bg-white hover:shadow-xs cursor-pointer'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-200 rounded-full h-2 mb-4 overflow-hidden">
        <div 
          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Card Stage with Flanking Arrow Buttons (Passar sem responder) */}
      <div className="relative flex items-center justify-between gap-2 sm:gap-3.5">
        
        {/* Seta Esquerda Lateral: Passar para trás sem responder */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrevCard();
          }}
          disabled={currentIndex === 0}
          title={currentIndex === 0 ? "Primeiro cartão da sessão" : "Passar para trás sem responder [Seta ←]"}
          aria-label="Passar para trás sem responder"
          className={`hidden md:flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 shrink-0 shadow-sm group ${
            currentIndex === 0
              ? 'opacity-25 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-400'
              : 'bg-white hover:bg-emerald-50 hover:border-emerald-400 text-zinc-700 hover:text-emerald-800 active:scale-95 cursor-pointer shadow-zinc-200/50'
          }`}
        >
          <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-[10px] font-bold text-zinc-500 mt-1">Voltar</span>
          <kbd className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1 rounded mt-0.5">←</kbd>
        </button>

        {/* 3D Flashcard Container */}
        <div className="flex-1 perspective-1000 min-h-[380px] sm:min-h-[420px] select-none">
          <div 
            onClick={handleFlip}
            className={`w-full h-full min-h-[380px] sm:min-h-[420px] rounded-3xl cursor-pointer transition-transform duration-500 transform-style-3d relative shadow-lg hover:shadow-xl border border-zinc-200/90 ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            
            {/* ======================================================== */}
            {/* FRONT SIDE (Question) */}
            {/* ======================================================== */}
            <div className="absolute inset-0 w-full h-full bg-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between backface-hidden">
              <div>
              {/* Top Card Info Bar */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {deckTitle}
                  </span>
                  {currentCard.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 text-zinc-600">
                      #{tag}
                    </span>
                  ))}
                </div>

                {currentCard.errorCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <AlertCircle className="w-3 h-3" />
                    Erros: {currentCard.errorCount}
                  </span>
                )}
              </div>

              {/* Question Text */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 block">
                    Pergunta / Desafio Cesgranrio:
                  </span>
                  <button
                    onClick={(e) => handleToggleSpeak(currentCard.question, e)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition ${
                      isSpeaking
                        ? 'bg-rose-100 text-rose-700 animate-pulse'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                    title={isSpeaking ? 'Parar áudio' : 'Ouvir pergunta'}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                        <span>Parar Voz</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Ouvir</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-lg sm:text-xl font-bold text-zinc-900 leading-relaxed">
                  {currentCard.question}
                </p>
              </div>

              {/* Tip Accordion */}
              {currentCard.tip && (
                <div className="mt-6" onClick={(e) => e.stopPropagation()}>
                  {!showTip ? (
                    <button
                      onClick={() => setShowTip(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition"
                    >
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ver Dica / Mnemônico</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        <span>Mnemônico / Pulo do Gato:</span>
                      </div>
                      <p>{currentCard.tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Card Footer with Hint */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 font-medium">
              <span className="hidden sm:inline">Pressione <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded border text-zinc-700 font-mono">Espaço</kbd> ou clique para virar</span>
              <span className="sm:hidden">Toque para ver a resposta</span>
              <div className="flex items-center gap-1 font-bold text-emerald-700">
                <span>Virar Cartão</span>
                <RotateCw className="w-3.5 h-3.5" />
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* BACK SIDE (Answer & Detailed Explanation) */}
          {/* ======================================================== */}
          <div className="absolute inset-0 w-full h-full bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between backface-hidden rotate-y-180 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Gabarito & Fundamento
                  </span>
                  <button
                    onClick={(e) => handleToggleSpeak(`${currentCard.answer}. Explicação: ${currentCard.explanation}`, e)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full transition ${
                      isSpeaking
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-400/40 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title={isSpeaking ? 'Parar leitura' : 'Ouvir resposta e explicação'}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3 h-3 text-rose-400" />
                        <span>Parar</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3 h-3 text-emerald-400" />
                        <span>Ouvir</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-xs text-zinc-400 font-mono-numbers">
                  Card {currentIndex + 1}/{cards.length}
                </span>
              </div>

              {/* Direct Answer */}
              <div className="mt-2">
                <p className="text-base sm:text-lg font-extrabold text-emerald-300 leading-relaxed">
                  {currentCard.answer}
                </p>
              </div>

              {/* Technical Context & Explanation */}
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Explicação Teórica Transpetro:
                </span>
                <p className="whitespace-pre-line">{currentCard.explanation}</p>
              </div>

              {/* Memory Tip if exists */}
              {currentCard.tip && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-xs text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lembrete Rápido:</span>
                  </div>
                  <p>{currentCard.tip}</p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Como foi sua lembrança? Avalie abaixo:</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlip();
                }}
                className="text-slate-400 hover:text-white flex items-center gap-1 underline font-medium"
              >
                Voltar à pergunta
              </button>
            </div>
          </div>

        </div>
      </div>

        {/* Seta Direita Lateral: Passar para frente sem responder */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNextCard();
          }}
          disabled={currentIndex >= cards.length - 1}
          title={currentIndex >= cards.length - 1 ? "Último cartão da sessão" : "Passar para frente sem responder [Seta →]"}
          aria-label="Passar para frente sem responder"
          className={`hidden md:flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 shrink-0 shadow-sm group ${
            currentIndex >= cards.length - 1
              ? 'opacity-25 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-400'
              : 'bg-white hover:bg-emerald-50 hover:border-emerald-400 text-zinc-700 hover:text-emerald-800 active:scale-95 cursor-pointer shadow-zinc-200/50'
          }`}
        >
          <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-0.5" />
          <span className="text-[10px] font-bold text-zinc-500 mt-1">Avançar</span>
          <kbd className="text-[9px] font-mono text-zinc-400 bg-zinc-100 px-1 rounded mt-0.5">→</kbd>
        </button>
      </div>

      {/* Barra de Navegação com Setas (Passar o cartão pra frente ou pra trás sem responder) */}
      <div className="mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs">
        <button
          type="button"
          onClick={handlePrevCard}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl border transition ${
            currentIndex === 0
              ? 'opacity-30 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-400'
              : 'bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 text-zinc-700 hover:text-emerald-900 border-zinc-200 active:scale-95 cursor-pointer'
          }`}
          title="Passar para o cartão anterior sem responder [Seta ←]"
        >
          <ChevronLeft className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Cartão Anterior</span>
          <kbd className="hidden sm:inline px-1 py-0.5 bg-zinc-200/70 rounded text-[10px] text-zinc-600 font-mono">←</kbd>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center">
          <span className="text-[11px] font-medium text-zinc-500">
            Navegue sem responder:
          </span>
          <span className="text-xs font-extrabold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono-numbers">
            Card {currentIndex + 1} de {cards.length}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextCard}
          disabled={currentIndex >= cards.length - 1}
          className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-2 rounded-xl border transition ${
            currentIndex >= cards.length - 1
              ? 'opacity-30 cursor-not-allowed bg-zinc-100 border-zinc-200 text-zinc-400'
              : 'bg-zinc-50 hover:bg-emerald-50 hover:border-emerald-300 text-zinc-700 hover:text-emerald-900 border-zinc-200 active:scale-95 cursor-pointer'
          }`}
          title="Passar para o próximo cartão sem responder [Seta →]"
        >
          <span>Próximo Cartão</span>
          <kbd className="hidden sm:inline px-1 py-0.5 bg-zinc-200/70 rounded text-[10px] text-zinc-600 font-mono">→</kbd>
          <ChevronRight className="w-4 h-4 text-emerald-700 shrink-0" />
        </button>
      </div>

      {/* Spaced Repetition Rating Controls */}
      <div className="mt-4">
        {isFlipped ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* ERREI (1) */}
              <button
                onClick={() => handleRate('errei')}
                className="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 font-bold transition flex flex-col items-center justify-center gap-0.5 shadow-xs active:scale-95 group cursor-pointer"
              >
                <div className="flex items-center gap-1 text-sm font-extrabold">
                  <X className="w-4 h-4 text-rose-600 group-hover:scale-110 transition" />
                  <span>Errei</span>
                </div>
                <span className="text-[10px] text-rose-700 font-medium">Revisar Hoje (+5 XP)</span>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">[Tecla 1]</span>
              </button>

              {/* DIFÍCIL (2) */}
              <button
                onClick={() => handleRate('dificil')}
                className="p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold transition flex flex-col items-center justify-center gap-0.5 shadow-xs active:scale-95 group cursor-pointer"
              >
                <div className="flex items-center gap-1 text-sm font-extrabold">
                  <span>Difícil</span>
                </div>
                <span className="text-[10px] text-amber-700 font-medium">Em 1 dia (+10 XP)</span>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">[Tecla 2]</span>
              </button>

              {/* BOM (3) */}
              <button
                onClick={() => handleRate('bom')}
                className="p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 font-bold transition flex flex-col items-center justify-center gap-0.5 shadow-xs active:scale-95 group cursor-pointer"
              >
                <div className="flex items-center gap-1 text-sm font-extrabold">
                  <Check className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
                  <span>Bom</span>
                </div>
                <span className="text-[10px] text-blue-700 font-medium">Em 3 dias (+15 XP)</span>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">[Tecla 3]</span>
              </button>

              {/* FÁCIL (4) */}
              <button
                onClick={() => handleRate('facil')}
                className="p-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold transition flex flex-col items-center justify-center gap-0.5 shadow-xs active:scale-95 group cursor-pointer"
              >
                <div className="flex items-center gap-1 text-sm font-extrabold">
                  <Sparkles className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
                  <span>Fácil</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-medium">Em 5 dias (+20 XP)</span>
                <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">[Tecla 4]</span>
              </button>

            </div>

            {/* Option to skip without rating even after flipping */}
            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={handleNextCard}
                disabled={currentIndex >= cards.length - 1}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:underline flex items-center gap-1 cursor-pointer transition disabled:opacity-30 disabled:pointer-events-none"
              >
                <span>Pular para o próximo cartão sem registrar nota</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <button
              onClick={handleFlip}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Mostrar Resposta e Justificativa</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
