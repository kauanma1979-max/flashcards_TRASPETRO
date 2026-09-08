import { useState } from 'react';
import { 
  BarChart3, 
  Trophy, 
  Flame, 
  Award, 
  CheckCircle2, 
  Clock, 
  Target, 
  Layers, 
  Sparkles,
  Zap,
  RotateCcw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { UserStats, Flashcard, MacroDiscipline, GamificationBadge } from '../types';
import { LEVELS, getLevelForXp } from '../utils/spacedRepetition';

interface ProgressDashboardProps {
  stats: UserStats;
  allCards: Flashcard[];
  macros: MacroDiscipline[];
  badges: GamificationBadge[];
  onResetAllProgress?: () => void;
  onResetMacro?: (macroId: string) => void;
  onCleanRestartedSession?: () => void;
  hasRestartedSessionPending?: boolean;
}

export function ProgressDashboard({
  stats,
  allCards,
  macros,
  badges,
  onResetAllProgress,
  onResetMacro,
  onCleanRestartedSession,
  hasRestartedSessionPending = false
}: ProgressDashboardProps) {
  const [isResetAllModalOpen, setIsResetAllModalOpen] = useState(false);
  const [macroToReset, setMacroToReset] = useState<MacroDiscipline | null>(null);

  const totalCards = allCards.length;
  const masteredCards = allCards.filter(c => c.status === 'dominado').length;
  const reviewingCards = allCards.filter(c => c.status === 'revisando').length;
  const learningCards = allCards.filter(c => c.status === 'aprendendo').length;
  const newCards = allCards.filter(c => c.status === 'novo').length;

  const totalReviews = stats.totalReviews || 0;
  const accuracyRate = totalReviews > 0 ? Math.round((stats.totalCorrect / totalReviews) * 100) : 0;
  const overallMastery = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  const levelInfo = getLevelForXp(stats.xp);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      
      {/* Top Banner: Career Rank & Level Progress */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-slate-900 to-emerald-950 text-white shadow-xl relative overflow-hidden border border-zinc-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50 shrink-0">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                  Carreira Transpetro • Nível {levelInfo.level}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
                {levelInfo.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                Progresso contínuo rumo à nomeação e posse no concurso!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <div>
              <span className="text-[11px] font-bold text-zinc-300 uppercase block">Total de XP</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono-numbers">
                {stats.xp}
              </span>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <span className="text-[11px] font-bold text-zinc-300 uppercase block">Ofensiva</span>
              <div className="flex items-center gap-1.5 text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono-numbers">
                <Flame className="w-6 h-6 fill-amber-400" />
                <span>{stats.streak}d</span>
              </div>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <span className="text-[11px] font-bold text-zinc-300 uppercase block">Taxa Acerto</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono-numbers">
                {accuracyRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Dominados */}
        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dominados</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-emerald-700 font-mono-numbers">
              {masteredCards}
            </span>
            <span className="text-xs text-zinc-500 font-medium ml-1">/ {totalCards} cards</span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${overallMastery}%` }}
            />
          </div>
        </div>

        {/* Em Revisão */}
        <div className="p-5 rounded-2xl bg-white border border-blue-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Em Revisão</span>
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-blue-700 font-mono-numbers">
              {reviewingCards}
            </span>
            <span className="text-xs text-zinc-500 font-medium ml-1">no ciclo</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Repetição espaçada ativa</p>
        </div>

        {/* Aprendendo */}
        <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Aprendendo / Erros</span>
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-amber-700 font-mono-numbers">
              {learningCards}
            </span>
            <span className="text-xs text-zinc-500 font-medium ml-1">cards</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">Exigem maior reforço</p>
        </div>

        {/* Total Revisões Feitas */}
        <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-700 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Revisões Totais</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-3xl font-extrabold text-zinc-900 font-mono-numbers">
              {totalReviews}
            </span>
            <span className="text-xs text-zinc-500 font-medium ml-1">vezes</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-3">
            {stats.totalCorrect} certas • {stats.totalWrong} erradas
          </p>
        </div>

      </div>

      {/* Management & Reset Bar */}
      <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-800">Controle de Progresso & Estatísticas</h4>
            <p className="text-[11px] text-zinc-500">
              Sessões reiniciadas a partir do 1º card não são contabilizadas. Use os controles para alinhar ou zerar dados se necessário.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(hasRestartedSessionPending || onCleanRestartedSession) && (
            <button
              onClick={onCleanRestartedSession}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Zera os cards de sessões que foram reiniciadas do primeiro card"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zerar Cards Reiniciados</span>
            </button>
          )}

          {onResetAllProgress && (
            <button
              onClick={() => setIsResetAllModalOpen(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Zera todos os 160 cards de volta a 'Novo' e redefine as estatísticas para zero"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Todo o Progresso</span>
            </button>
          )}
        </div>
      </div>

      {/* Mastery by Macro Discipline (4 Macro Areas Breakdown) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-800">
              Desempenho por Matéria
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900">
              Progresso nas 4 Macro Disciplinas
            </h3>
          </div>
          <span className="text-xs font-bold text-zinc-500">{totalCards} Flashcards Totais</span>
        </div>

        <div className="space-y-5">
          {macros.map(m => {
            const macroCards = allCards.filter(c => c.macroId === m.id);
            const mTotal = macroCards.length;
            const mMastered = macroCards.filter(c => c.status === 'dominado').length;
            const mErrors = macroCards.filter(c => c.errorCount > 0).length;
            const pct = mTotal > 0 ? Math.round((mMastered / mTotal) * 100) : 0;
            const hasActivity = mMastered > 0 || mErrors > 0 || pct > 0 || macroCards.some(c => c.status !== 'novo');

            return (
              <div key={m.id} className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${m.gradient}`} />
                    <h4 className="font-bold text-sm text-zinc-900">{m.name}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-zinc-600">
                      {mMastered} de {mTotal} dominados
                    </span>
                    {mErrors > 0 && (
                      <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {mErrors} com erros
                      </span>
                    )}
                    <span className="font-mono-numbers font-extrabold text-zinc-800 text-sm">
                      {pct}%
                    </span>

                    {onResetMacro && hasActivity && (
                      <button
                        onClick={() => setMacroToReset(m)}
                        className="px-2 py-0.5 rounded text-[11px] font-bold text-zinc-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition flex items-center gap-1 cursor-pointer"
                        title={`Zerar o progresso dos cards da matéria ${m.name}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Zerar Matéria</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full bg-zinc-200 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${m.gradient} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gamification Badges Section (Conquistas Transpetro) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
              Gamificação de Estudo
            </span>
            <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900">
              Medalhas & Conquistas Desbloqueadas
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-mono-numbers">
            {badges.filter(b => b.unlockedAt).length} de {badges.length} desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((badge) => {
            const isUnlocked = !!badge.unlockedAt;
            const pct = Math.min(100, Math.round((badge.currentProgress / badge.maxProgress) * 100));

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? 'bg-amber-50/50 border-amber-300 shadow-2xs'
                    : 'bg-zinc-50 border-zinc-200/80 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isUnlocked ? 'bg-amber-500 text-white shadow-xs' : 'bg-zinc-200 text-zinc-500'
                    }`}>
                      <Trophy className="w-5 h-5" />
                    </div>
                    {isUnlocked ? (
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                        Conquistado!
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-zinc-500 font-mono-numbers">
                        {badge.currentProgress}/{badge.maxProgress}
                      </span>
                    )}
                  </div>

                  <h5 className="font-bold text-sm text-zinc-900 leading-snug">
                    {badge.title}
                  </h5>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>

                {!isUnlocked && (
                  <div className="w-full bg-zinc-200 rounded-full h-1.5 mt-3 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Confirm Reset All Progress */}
      {isResetAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-zinc-900 mb-1.5">
              Zerar Todo o Progresso?
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-5">
              Esta ação redefinirá <strong>todos os 160 flashcards</strong> para o status inicial ("Novo"), apagará todo o histórico de repetições, zerará o XP e o contador de revisões.
              <br /><br />
              Use esta opção se desejar recomeçar seus estudos 100% do zero.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsResetAllModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsResetAllModalOpen(false);
                  onResetAllProgress?.();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm transition cursor-pointer"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Reset Single Macro */}
      {macroToReset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-lg text-zinc-900 mb-1.5">
              Zerar Matéria: {macroToReset.name}?
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed mb-5">
              Todos os <strong>40 flashcards</strong> desta macro área retornarão ao status "Novo" e as revisões associadas serão deduzidas das estatísticas gerais.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMacroToReset(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const mId = macroToReset.id;
                  setMacroToReset(null);
                  onResetMacro?.(mId);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shadow-sm transition cursor-pointer"
              >
                Sim, Zerar Matéria
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
