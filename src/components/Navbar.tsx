import { useState, useEffect } from 'react';
import { 
  Flame, 
  Award, 
  Bell, 
  Volume2, 
  VolumeX, 
  Layers, 
  AlertOctagon, 
  BarChart3, 
  PlusCircle,
  Timer,
  HardDrive
} from 'lucide-react';
import { UserStats, StudyAlarmConfig } from '../types';
import { LEVELS, getLevelForXp } from '../utils/spacedRepetition';
import { getSoundMuted, setSoundMuted } from '../utils/audio';

interface NavbarProps {
  stats: UserStats;
  alarmConfig: StudyAlarmConfig;
  mistakesCount: number;
  currentView: 'home' | 'deck' | 'erros' | 'stats' | 'alarm';
  onNavigate: (view: 'home' | 'erros' | 'stats' | 'alarm') => void;
  onOpenAddCard: () => void;
  onOpenAlarmModal: () => void;
  isAlarmRinging: boolean;
  onDismissAlarm: () => void;
  onOpenBackupModal?: () => void;
}

export function Navbar({
  stats,
  alarmConfig,
  mistakesCount,
  currentView,
  onNavigate,
  onOpenAddCard,
  onOpenAlarmModal,
  isAlarmRinging,
  onDismissAlarm,
  onOpenBackupModal
}: NavbarProps) {
  const [muted, setMuted] = useState(getSoundMuted());

  useEffect(() => {
    setMuted(getSoundMuted());
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const levelInfo = getLevelForXp(stats.xp);
  const nextLevel = LEVELS.find(l => l.level === levelInfo.level + 1);
  const currentLevelMin = levelInfo.minXp;
  const currentLevelMax = nextLevel ? nextLevel.minXp : levelInfo.minXp + 1000;
  const xpInCurrentLevel = Math.max(0, stats.xp - currentLevelMin);
  const xpSpan = currentLevelMax - currentLevelMin;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpSpan) * 100));

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
      {/* 1.3 Cabeçalho Animado com Gradiente Contínuo */}
      <div className="h-1 w-full header-animated" />

      {/* Alarm Alert Bar if actively ringing */}
      {isAlarmRinging && (
        <div className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 animate-bounce" />
            <span className="font-bold text-sm">
              HORA DA REVISÃO TRANSPETRO! Mantenha a disciplina de aprovação.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onDismissAlarm();
                onNavigate('erros');
              }}
              className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-md shadow-xs transition"
            >
              Revisar Errados
            </button>
            <button
              onClick={onDismissAlarm}
              className="px-3 py-1 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold rounded-md transition"
            >
              Parar Alarme
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand & Logo */}
          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition transform">
              <span className="font-extrabold text-base tracking-tighter">TP</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-zinc-900 leading-tight">
                  Transpetro
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Cards
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium hidden sm:block leading-none">
                Concurso & Memorização Ativa
              </p>
            </div>
          </div>

          {/* Gamification Counters: Streak & XP Level */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Daily Streak */}
            <div 
              title={`${stats.streak} dia(s) consecutivos de estudo`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 shadow-2xs"
            >
              <Flame className={`w-4 h-4 ${stats.streak > 0 ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-zinc-400'}`} />
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-sm font-mono-numbers">{stats.streak}</span>
                <span className="text-[11px] font-medium text-amber-700 hidden md:inline">dias</span>
              </div>
            </div>

            {/* Level & XP Bar */}
            <div className="hidden sm:flex flex-col items-start min-w-[140px] max-w-[190px]">
              <div className="flex items-center justify-between w-full text-[11px] font-semibold text-zinc-700 mb-1">
                <span className="flex items-center gap-1 truncate text-emerald-800">
                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Nv. {levelInfo.level}: {levelInfo.title.split(' ')[0]}
                </span>
                <span className="text-[10px] font-mono-numbers text-zinc-500 font-medium">
                  {stats.xp} XP
                </span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden border border-zinc-200">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Daily cards goal badge */}
            <div 
              title="Cartões revisados hoje vs meta diária"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-semibold border border-zinc-200 font-mono-numbers"
            >
              <span>🎯 {stats.todayReviewsCount}/{stats.dailyGoal}</span>
              <span className="text-[10px] text-zinc-500">hoje</span>
            </div>
          </div>

          {/* Nav Actions & Views */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* View: Baralhos (Home) */}
            <button
              onClick={() => onNavigate('home')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                currentView === 'home' || currentView === 'deck'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden md:inline">Disciplinas</span>
            </button>

            {/* View: Caderno de Erros */}
            <button
              onClick={() => onNavigate('erros')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                currentView === 'erros'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80'
              }`}
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Errados</span>
              {mistakesCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-numbers font-extrabold ${
                  currentView === 'erros' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
                }`}>
                  {mistakesCount}
                </span>
              )}
            </button>

            {/* View: Estatísticas */}
            <button
              onClick={() => onNavigate('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                currentView === 'stats'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Progresso</span>
            </button>

            {/* View / Button: Alarme & Timer */}
            <button
              onClick={onOpenAlarmModal}
              title={`Lembrete diário: ${alarmConfig.enabled ? alarmConfig.time : 'Desativado'}`}
              className={`relative p-2 rounded-lg text-xs font-bold transition ${
                currentView === 'alarm' || alarmConfig.pomodoroActive
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {alarmConfig.pomodoroActive ? (
                <Timer className="w-4 h-4 text-amber-600 animate-spin" />
              ) : (
                <Bell className={`w-4 h-4 ${alarmConfig.enabled ? 'text-amber-600' : 'text-zinc-400'}`} />
              )}
              {alarmConfig.enabled && !alarmConfig.pomodoroActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>

            {/* Add Custom Card */}
            <button
              onClick={onOpenAddCard}
              title="Adicionar Flashcard Personalizado"
              className="p-2 rounded-lg text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
            >
              <PlusCircle className="w-4 h-4" />
            </button>

            {/* Backup & Restore JSON */}
            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                title="Backup e Restauração (JSON)"
                className="p-2 rounded-lg text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
              >
                <HardDrive className="w-4 h-4" />
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={toggleMute}
              title={muted ? 'Ativar som' : 'Desativar som'}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
            >
              {muted ? <VolumeX className="w-4 h-4 text-zinc-400" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
