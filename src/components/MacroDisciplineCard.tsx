import { 
  BookOpen, 
  Anchor, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  PlayCircle,
  Building2,
  DollarSign,
  Truck,
  Laptop
} from 'lucide-react';
import { MacroDiscipline, ThemeDeck, Flashcard } from '../types';
import { isCardDue } from '../utils/spacedRepetition';

interface MacroDisciplineCardProps {
  key?: string;
  macro: MacroDiscipline;
  allCards: Flashcard[];
  deckProgressMap?: Record<string, { currentIndex: number; totalCards: number; updatedAt: string }>;
  onSelectTheme: (theme: ThemeDeck) => void;
  onStudyMacro: (macro: MacroDiscipline) => void;
}

export function MacroDisciplineCard({
  macro,
  allCards,
  deckProgressMap = {},
  onSelectTheme,
  onStudyMacro
}: MacroDisciplineCardProps) {
  const macroCards = allCards.filter(c => c.macroId === macro.id);
  const totalCount = macroCards.length;
  const masteredCount = macroCards.filter(c => c.status === 'dominado').length;
  const dueCount = macroCards.filter(isCardDue).length;
  const mistakesCount = macroCards.filter(c => c.errorCount > 0).length;
  const masteryPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;
  const macroProgress = deckProgressMap[macro.id];

  // Icon mapping
  const renderMacroIcon = () => {
    switch (macro.iconName) {
      case 'Building2': return <Building2 className="w-6 h-6 text-white" />;
      case 'DollarSign': return <DollarSign className="w-6 h-6 text-white" />;
      case 'Truck': return <Truck className="w-6 h-6 text-white" />;
      case 'Laptop': return <Laptop className="w-6 h-6 text-white" />;
      case 'BookOpen': return <BookOpen className="w-6 h-6 text-white" />;
      case 'Anchor': return <Anchor className="w-6 h-6 text-white" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-white" />;
      case 'AlertTriangle': return <AlertTriangle className="w-6 h-6 text-white" />;
      default: return <Layers className="w-6 h-6 text-white" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Macro Header Banner */}
      <div className={`p-5 bg-gradient-to-r ${macro.gradient} text-white relative overflow-hidden`}>
        {/* Subtle geometric background watermark */}
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <div className="w-36 h-36 rounded-full border-8 border-white" />
        </div>

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 shadow-inner">
              {renderMacroIcon()}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                Macro Área Transpetro
              </span>
              <h3 className="font-extrabold text-lg sm:text-xl text-white leading-tight">
                {macro.name}
              </h3>
            </div>
          </div>

          <button
            onClick={() => onStudyMacro(macro)}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border backdrop-blur-xs shadow-xs ${
              macroProgress && macroProgress.currentIndex > 0
                ? 'bg-amber-400 text-amber-950 hover:bg-amber-300 border-amber-300'
                : 'bg-white/20 hover:bg-white text-white hover:text-zinc-900 border-white/30'
            }`}
          >
            <PlayCircle className="w-4 h-4" />
            <span>
              {macroProgress && macroProgress.currentIndex > 0
                ? `Continuar (Card ${macroProgress.currentIndex + 1})`
                : 'Revisar Macro'}
            </span>
          </button>
        </div>

        <p className="text-xs text-white/90 mt-2.5 leading-relaxed relative z-10 max-w-xl">
          {macro.description}
        </p>

        {/* Macro Progress Stats */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-white/95">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="font-mono-numbers font-bold">{totalCount}</span>
              <span className="text-white/80">cards</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-white/90" />
              <span className="font-mono-numbers font-bold">{masteredCount}</span>
              <span className="text-white/80">dominados</span>
            </div>
            {dueCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-white/25 font-semibold text-[11px]">
                {dueCount} para hoje
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono-numbers font-bold">{masteryPercentage}%</span>
            <div className="w-16 bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all"
                style={{ width: `${masteryPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sub-themes list */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3 bg-zinc-50/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Baralhos Temáticos (20 cards cada)
          </span>
          <button
            onClick={() => onStudyMacro(macro)}
            className="sm:hidden text-xs font-bold text-zinc-700 hover:text-zinc-900 underline"
          >
            Revisar Todos
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {macro.themes.map((theme) => {
            const themeCards = allCards.filter(c => c.themeId === theme.id);
            const themeTotal = themeCards.length;
            const themeMastered = themeCards.filter(c => c.status === 'dominado').length;
            const themeDue = themeCards.filter(isCardDue).length;
            const themeErrors = themeCards.filter(c => c.errorCount > 0).length;
            const pct = themeTotal > 0 ? Math.round((themeMastered / themeTotal) * 100) : 0;

            return (
              <div
                key={theme.id}
                onClick={() => onSelectTheme(theme)}
                className="bg-white p-4 rounded-xl border border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-sm text-zinc-800 group-hover:text-emerald-700 transition leading-snug">
                      {theme.title}
                    </h4>
                    {deckProgressMap[theme.id] && deckProgressMap[theme.id].currentIndex > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono-numbers bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0">
                        <PlayCircle className="w-3 h-3 text-amber-700" />
                        Card {deckProgressMap[theme.id].currentIndex + 1}/{themeTotal}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono-numbers bg-zinc-100 text-zinc-700 shrink-0">
                        {themeTotal} cards
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-zinc-500 line-clamp-2 leading-relaxed">
                    {theme.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {themeDue > 0 ? (
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        {themeDue} pendentes
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Em dia ✓
                      </span>
                    )}

                    {themeErrors > 0 && (
                      <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                        {themeErrors} erros
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-emerald-600 transition font-bold text-xs">
                    <span>{pct}%</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
