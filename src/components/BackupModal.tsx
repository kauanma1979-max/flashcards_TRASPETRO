import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FileJson, 
  HardDrive, 
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  Award
} from 'lucide-react';
import { Flashcard, UserStats, GamificationBadge, StudyAlarmConfig, ActiveSessionState } from '../types';
import { generateBackupJson, downloadBackupFile, parseAndValidateBackup, BackupData } from '../utils/backup';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  stats: UserStats;
  badges: GamificationBadge[];
  alarmConfig: StudyAlarmConfig;
  deckProgressMap: Record<string, { currentIndex: number; totalCards: number; updatedAt: string }>;
  activeSession: ActiveSessionState | null;
  onRestoreBackup: (backup: BackupData) => void;
  initialTab?: 'export' | 'import';
}

export function BackupModal({
  isOpen,
  onClose,
  cards,
  stats,
  badges,
  alarmConfig,
  deckProgressMap,
  activeSession,
  onRestoreBackup,
  initialTab = 'export'
}: BackupModalProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab);
  const [dragOver, setDragOver] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<BackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    const jsonStr = generateBackupJson({
      cards,
      stats,
      badges,
      alarmConfig,
      deckProgressMap,
      activeSession
    });
    downloadBackupFile(jsonStr);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const handleFileProcess = (file: File) => {
    setParseError(null);
    setParsedPreview(null);
    setRestoreSuccess(false);
    setSelectedFileName(file.name);

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setParseError('Por favor, selecione um arquivo válido com extensão .json');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      const validation = parseAndValidateBackup(content);
      if (validation.success) {
        setParsedPreview(validation.data);
      } else {
        setParseError(validation.error);
      }
    };
    reader.onerror = () => {
      setParseError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleConfirmRestore = () => {
    if (!parsedPreview) return;
    onRestoreBackup(parsedPreview);
    setRestoreSuccess(true);
    setTimeout(() => {
      setRestoreSuccess(false);
      onClose();
    }, 1800);
  };

  const unlockedBadgesCount = badges.filter(b => b.unlockedAt).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-zinc-200 relative overflow-hidden flex flex-col max-h-[90vh] modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '16px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <HardDrive className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-zinc-900">
                Backup & Restauração JSON
              </h3>
              <p className="text-xs text-zinc-500">
                Transpetro Flashcards • Salve ou recupere seu histórico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 rounded-xl mt-4">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Fazer Backup (Exportar)</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Restaurar Backup (Importar)</span>
          </button>
        </div>

        {/* Tab 1: Export Backup */}
        {activeTab === 'export' && (
          <div className="py-4 space-y-4 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 space-y-1">
                  <p className="font-bold">O que está incluído no arquivo JSON:</p>
                  <ul className="list-disc list-inside text-emerald-800 space-y-0.5">
                    <li>Todos os flashcards com intervalos de repetição espaçada</li>
                    <li>Caderno de erros e histórico de respostas certas/erradas</li>
                    <li>Pontuação total de XP, nível de carreira e ofensiva diária</li>
                    <li>Todas as conquistas e medalhas desbloqueadas</li>
                    <li>Configurações de alarme e progresso dos baralhos</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current stats snapshot */}
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Flashcards</span>
                <span className="text-base font-extrabold text-zinc-800 font-mono-numbers">{cards.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Revisões</span>
                <span className="text-base font-extrabold text-zinc-800 font-mono-numbers">{stats.totalReviews}</span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total XP</span>
                <span className="text-base font-extrabold text-emerald-600 font-mono-numbers">{stats.xp}</span>
              </div>
            </div>

            {downloadSuccess && (
              <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Arquivo de backup baixado com sucesso!</span>
              </div>
            )}

            <button
              onClick={handleDownload}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo de Backup (.json)</span>
            </button>
          </div>
        )}

        {/* Tab 2: Import / Restore Backup */}
        {activeTab === 'import' && (
          <div className="py-4 space-y-4 overflow-y-auto">
            {/* Usability Pattern: Drag-and-drop & Manual Click */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                dragOver 
                  ? 'border-emerald-500 bg-emerald-50/50' 
                  : 'border-zinc-300 hover:border-emerald-400 hover:bg-zinc-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <FileJson className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-zinc-800">
                Arraste e solte o arquivo JSON aqui ou <span className="text-blue-600 underline">clique para selecionar</span>
              </p>
              <p className="text-[11px] text-zinc-400">
                Suporta backups gerados pelo Transpetro Flashcards (.json)
              </p>
              {selectedFileName && (
                <span className="mt-1 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 text-[11px] font-mono font-medium border border-zinc-200">
                  {selectedFileName}
                </span>
              )}
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Preview of Parsed Data */}
            {parsedPreview && (
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Arquivo de Backup Válido
                  </span>
                  {parsedPreview.exportedAt && (
                    <span className="text-zinc-500 text-[11px] font-mono-numbers">
                      {new Date(parsedPreview.exportedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-white border border-zinc-200">
                    <span className="text-[10px] text-zinc-400 font-bold block">CARDS</span>
                    <span className="font-extrabold text-zinc-800 font-mono-numbers">
                      {parsedPreview.cards.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-zinc-200">
                    <span className="text-[10px] text-zinc-400 font-bold block">REVISÕES</span>
                    <span className="font-extrabold text-zinc-800 font-mono-numbers">
                      {parsedPreview.stats.totalReviews}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-zinc-200">
                    <span className="text-[10px] text-zinc-400 font-bold block">XP TOTAL</span>
                    <span className="font-extrabold text-emerald-600 font-mono-numbers">
                      {parsedPreview.stats.xp}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-zinc-200">
                    <span className="text-[10px] text-zinc-400 font-bold block">OFENSIVA</span>
                    <span className="font-extrabold text-amber-600 font-mono-numbers">
                      {parsedPreview.stats.streak}d
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ <strong>Atenção:</strong> A restauração irá substituir o progresso e estatísticas atuais pelos dados contidos neste arquivo.
                </p>

                {restoreSuccess ? (
                  <div className="p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Backup restaurado com sucesso! Atualizando dados...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleConfirmRestore}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-700/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirmar e Restaurar Dados</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Formato: JSON puro (.json)</span>
          <span>Compatível com qualquer navegador</span>
        </div>
      </div>
    </div>
  );
}
