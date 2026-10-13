import { useState, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Clock, 
  Volume2, 
  Play, 
  Square, 
  Check, 
  Timer, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { StudyAlarmConfig } from '../types';
import { playStudyAlarm, stopStudyAlarm } from '../utils/audio';

interface StudyAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  alarmConfig: StudyAlarmConfig;
  onSaveAlarm: (config: StudyAlarmConfig) => void;
  onStartPomodoro: (minutes: number) => void;
  onStopPomodoro: () => void;
}

export function StudyAlarmModal({
  isOpen,
  onClose,
  alarmConfig,
  onSaveAlarm,
  onStartPomodoro,
  onStopPomodoro
}: StudyAlarmModalProps) {
  const [enabled, setEnabled] = useState(alarmConfig.enabled);
  const [time, setTime] = useState(alarmConfig.time);
  const [sound, setSound] = useState<StudyAlarmConfig['sound']>(alarmConfig.sound);
  const [label, setLabel] = useState(alarmConfig.label);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [pomodoroMins, setPomodoroMins] = useState(alarmConfig.pomodoroMinutes || 25);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [isOpen]);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  const handleTestSound = () => {
    if (isPlayingTest) {
      stopStudyAlarm();
      setIsPlayingTest(false);
    } else {
      setIsPlayingTest(true);
      playStudyAlarm(sound);
      // Auto stop test after 4 seconds
      setTimeout(() => {
        stopStudyAlarm();
        setIsPlayingTest(false);
      }, 4000);
    }
  };

  const handleSave = () => {
    stopStudyAlarm();
    setIsPlayingTest(false);
    onSaveAlarm({
      ...alarmConfig,
      enabled,
      time,
      sound,
      label,
      pomodoroMinutes: pomodoroMins
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 relative overflow-hidden modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '16px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 leading-tight">
                Alarme & Lembretes de Estudo
              </h3>
              <p className="text-xs text-zinc-500">
                Fixação garantida com revisões diárias pontuais
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopStudyAlarm();
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-5 space-y-6">
          
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <div>
              <span className="font-bold text-sm text-zinc-900 block">
                Ativar Alarme Diário
              </span>
              <span className="text-xs text-zinc-500">
                Dispara um alerta sonoro e visual para você revisar seus cards
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Time Picker */}
          {enabled && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                  Horário da Revisão Diária:
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Clock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-zinc-200 text-sm font-bold font-mono-numbers text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Nome do alarme"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Sound Style Picker & Test */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                  Som do Alarme / Sintetizador:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['digital', 'chime', 'radar', 'gong'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSound(s)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition border ${
                        sound === s
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                      }`}
                    >
                      {s === 'digital' ? 'Digital 🔔' : s === 'chime' ? 'Sino 🎵' : s === 'radar' ? 'Radar 📡' : 'Gongo 🥁'}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-emerald-700 transition"
                  >
                    {isPlayingTest ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                        <span>Parar teste de som</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                        <span>Testar som do alarme</span>
                      </>
                    )}
                  </button>

                  {/* Browser notification helper */}
                  {notificationPermission !== 'granted' && (
                    <button
                      type="button"
                      onClick={requestNotificationPermission}
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Ativar Notificações</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pomodoro Focus Timer Section */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-700" />
                <span className="font-bold text-xs text-amber-900 uppercase tracking-wider">
                  Timer Pomodoro de Estudo
                </span>
              </div>
              {alarmConfig.pomodoroActive && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 animate-pulse">
                  Em execução
                </span>
              )}
            </div>
            
            <p className="text-xs text-amber-800 mb-3 leading-relaxed">
              Inicie um sprint de 25 minutos focado nos flashcards. O alarme tocará automaticamente ao término da sessão.
            </p>

            <div className="flex items-center gap-2">
              {[15, 25, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPomodoroMins(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono-numbers transition ${
                    pomodoroMins === m
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  {m} min
                </button>
              ))}

              <div className="ml-auto">
                {alarmConfig.pomodoroActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStopPomodoro();
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    Cancelar Timer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onStartPomodoro(pomodoroMins);
                      onClose();
                    }}
                    className="px-4 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Iniciar {pomodoroMins}m</span>
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              stopStudyAlarm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>

      </div>
    </div>
  );
}
