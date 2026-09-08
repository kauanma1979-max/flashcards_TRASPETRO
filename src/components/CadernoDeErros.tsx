import { useState } from 'react';
import { 
  AlertOctagon, 
  PlayCircle, 
  CheckCircle2, 
  RotateCcw, 
  BookOpen, 
  Search, 
  Filter,
  Sparkles
} from 'lucide-react';
import { Flashcard, MacroDiscipline } from '../types';

interface CadernoDeErrosProps {
  cards: Flashcard[];
  macros: MacroDiscipline[];
  onStartReviewMistakes: (mistakeCards: Flashcard[]) => void;
  onResetError: (cardId: string) => void;
}

export function CadernoDeErros({
  cards,
  macros,
  onStartReviewMistakes,
  onResetError
}: CadernoDeErrosProps) {
  const [selectedMacroId, setSelectedMacroId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cards with errors
  const mistakeCards = cards.filter(c => (c.errorCount || 0) > 0 || c.status === 'aprendendo');

  const filteredCards = mistakeCards.filter(card => {
    const matchesMacro = selectedMacroId === 'all' || card.macroId === selectedMacroId;
    const matchesSearch = searchQuery === '' || 
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesMacro && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white shadow-md relative overflow-hidden mb-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold uppercase tracking-wider mb-3">
              <AlertOctagon className="w-4 h-4 text-rose-200" />
              <span>Fixação de Pontos Vulneráveis</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Caderno de Erros Transpetro
            </h1>
            <p className="text-sm text-rose-100 mt-2 leading-relaxed">
              Os cartões que você marcou como "Errei" ficam salvos aqui para repetição intensiva. 
              Elimine seus erros para alcançar a segurança máxima no dia da prova!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {mistakeCards.length > 0 ? (
              <button
                onClick={() => onStartReviewMistakes(filteredCards.length > 0 ? filteredCards : mistakeCards)}
                className="px-6 py-3.5 rounded-2xl bg-white text-rose-800 hover:bg-rose-50 font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5 text-rose-700" />
                <span>Revisar Errados ({filteredCards.length})</span>
              </button>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-white/20 border border-white/30 text-white font-bold text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                <span>Nenhum erro pendente!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        
        {/* Macro Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedMacroId('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedMacroId === 'all'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Todos ({mistakeCards.length})
          </button>
          {macros.map(m => {
            const count = mistakeCards.filter(c => c.macroId === m.id).length;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMacroId(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedMacroId === m.id
                    ? 'bg-rose-700 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                <span>{m.shortName}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono-numbers font-bold ${
                    selectedMacroId === m.id ? 'bg-white text-rose-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar nos errados..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
          />
        </div>

      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-zinc-200 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-800">
            {mistakeCards.length === 0 ? 'Caderno de Erros Vazio!' : 'Nenhum erro encontrado neste filtro'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            {mistakeCards.length === 0 
              ? 'Parabéns! Você não possui nenhum cartão pendente de correção no momento. Continue revisando os baralhos regulares.'
              : 'Tente alterar os termos da busca ou selecionar outra macro disciplina.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCards.map((card) => {
            const macro = macros.find(m => m.id === card.macroId);
            return (
              <div
                key={card.id}
                className="p-5 bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${macro?.badgeBg || 'bg-zinc-100 text-zinc-700'}`}>
                      {macro?.shortName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 font-mono-numbers">
                      {card.errorCount} {card.errorCount === 1 ? 'erro' : 'erros'}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-900 leading-snug mb-2">
                    {card.question}
                  </h4>

                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-700 leading-relaxed mb-3">
                    <span className="font-bold text-zinc-500 uppercase text-[10px] block mb-0.5">Resposta:</span>
                    <p className="font-medium text-zinc-800">{card.answer}</p>
                  </div>

                  {card.tip && (
                    <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{card.tip}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-400">
                    Status: <span className="font-semibold text-zinc-600 capitalize">{card.status}</span>
                  </span>

                  <button
                    onClick={() => onResetError(card.id)}
                    title="Remover do Caderno de Erros (zerar contagem de erro)"
                    className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Marcar como Dominado</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
