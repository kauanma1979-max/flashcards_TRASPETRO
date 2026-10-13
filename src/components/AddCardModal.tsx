import { useState, FormEvent, ChangeEvent } from 'react';
import { PlusCircle, X, CheckCircle2, AlertCircle, BookOpen, Lightbulb } from 'lucide-react';
import { Flashcard, MacroDiscipline } from '../types';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  macros: MacroDiscipline[];
  onAddCard: (card: Flashcard) => void;
}

export function AddCardModal({
  isOpen,
  onClose,
  macros,
  onAddCard
}: AddCardModalProps) {
  const [macroId, setMacroId] = useState(macros[0]?.id || '');
  const [themeId, setThemeId] = useState(macros[0]?.themes[0]?.id || '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [tip, setTip] = useState('');
  const [difficulty, setDifficulty] = useState<'facil' | 'medio' | 'dificil'>('medio');
  const [tagInput, setTagInput] = useState('');
  
  // Validation state
  const [hasInteracted, setHasInteracted] = useState(false);

  const currentMacro = macros.find(m => m.id === macroId) || macros[0];

  const handleMacroChange = (newMacroId: string) => {
    setMacroId(newMacroId);
    const m = macros.find(item => item.id === newMacroId);
    if (m && m.themes.length > 0) {
      setThemeId(m.themes[0].id);
    }
  };

  const isQuestionValid = question.trim().length >= 5;
  const isAnswerValid = answer.trim().length >= 3;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setHasInteracted(true);
    if (!isQuestionValid || !isAnswerValid) return;

    const tags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newCard: Flashcard = {
      id: `custom_${Date.now()}`,
      macroId,
      themeId,
      question: question.trim(),
      answer: answer.trim(),
      explanation: explanation.trim() || answer.trim(),
      tip: tip.trim() || undefined,
      difficulty,
      tags: tags.length > 0 ? tags : ['Transpetro', 'Personalizado'],
      repetitionCount: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      consecutiveCorrect: 0,
      errorCount: 0,
      status: 'novo',
      userCreated: true
    };

    onAddCard(newCard);
    // Reset fields
    setQuestion('');
    setAnswer('');
    setExplanation('');
    setTip('');
    setTagInput('');
    setHasInteracted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200/90 max-h-[90vh] overflow-y-auto fade-in modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '16px' }}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 leading-tight">
                Novo Flashcard Transpetro
              </h3>
              <p className="text-xs text-zinc-500">
                Adicione suas próprias anotações e questões de simulados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="py-5 space-y-4">
          
          {/* Select Macro & Theme */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Macro Disciplina:
              </label>
              <select
                value={macroId}
                onChange={(e) => handleMacroChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {macros.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Baralho Específico:
              </label>
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {currentMacro?.themes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.shortTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Campo Pergunta com validação visual */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Pergunta / Desafio Cesgranrio: <span className="text-rose-500">*</span>
              </label>
              {question.trim().length > 0 && (
                <span className="text-[11px] flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Válido
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setHasInteracted(true);
                }}
                rows={3}
                placeholder="Ex: Qual é a diferença fundamental entre desconto racional e desconto comercial?"
                className={`w-full px-3.5 py-2.5 pr-8 rounded-xl border text-xs text-zinc-900 transition ${
                  hasInteracted && !isQuestionValid
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                }`}
                required
              />
              {isQuestionValid && (
                <div className="absolute right-2.5 top-3 text-emerald-500 pointer-events-none">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            {hasInteracted && !isQuestionValid && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                A pergunta deve ter pelo menos 5 caracteres.
              </p>
            )}
          </div>

          {/* Campo Resposta com validação visual */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Resposta / Gabarito Direto: <span className="text-rose-500">*</span>
              </label>
              {isAnswerValid && (
                <span className="text-[11px] flex items-center gap-1 font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Válido
                </span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setHasInteracted(true);
                }}
                rows={3}
                placeholder="Ex: O desconto racional incide sobre o valor presente; o comercial incide sobre o valor futuro."
                className={`w-full px-3.5 py-2.5 pr-8 rounded-xl border text-xs text-zinc-900 transition ${
                  hasInteracted && !isAnswerValid
                    ? 'border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-zinc-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                }`}
                required
              />
              {isAnswerValid && (
                <div className="absolute right-2.5 top-3 text-emerald-500 pointer-events-none">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>
            {hasInteracted && !isAnswerValid && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                A resposta não pode ficar em branco.
              </p>
            )}
          </div>

          {/* Explicação & Ponto de Atenção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Fundamentação Teórica (Opcional):
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                placeholder="Ex: Artigo ou fórmula matemática detalhada..."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Ponto de Ouro / Mnemônico (Dica):
              </label>
              <textarea
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                rows={2}
                placeholder="Ex: Pulo do gato: Racional = presente, Comercial = futuro!"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Dificuldade & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Dificuldade Estimada:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['facil', 'medio', 'dificil'] as const).map((dif) => (
                  <button
                    key={dif}
                    type="button"
                    onClick={() => setDifficulty(dif)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize transition border ${
                      difficulty === dif
                        ? dif === 'facil'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : dif === 'medio'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-rose-600 text-white border-rose-600'
                        : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    {dif === 'facil' ? 'Fácil' : dif === 'medio' ? 'Médio' : 'Difícil'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Tags (separadas por vírgula):
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Ex: Cesgranrio, Fórmulas, Alta Prioridade"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-100 transition smooth-transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isQuestionValid || !isAnswerValid}
              className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition smooth-transition ${
                isQuestionValid && isAnswerValid
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 cursor-pointer active:scale-95'
                  : 'bg-zinc-300 cursor-not-allowed opacity-60'
              }`}
            >
              Adicionar Flashcard
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
