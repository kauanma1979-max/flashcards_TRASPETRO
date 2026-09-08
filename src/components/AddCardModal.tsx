import { useState, FormEvent } from 'react';
import { PlusCircle, X, Check, BookOpen, Lightbulb } from 'lucide-react';
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

  const currentMacro = macros.find(m => m.id === macroId) || macros[0];

  const handleMacroChange = (newMacroId: string) => {
    setMacroId(newMacroId);
    const m = macros.find(item => item.id === newMacroId);
    if (m && m.themes.length > 0) {
      setThemeId(m.themes[0].id);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;

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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
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
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {currentMacro?.themes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.shortTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Pergunta / Desafio Cesgranrio: *
            </label>
            <textarea
              required
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual o ponto de corte de temperatura para líquidos inflamáveis na NR-20?"
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Answer Input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Gabarito Direto: *
            </label>
            <textarea
              required
              rows={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Ex: Ponto de fulgor igual ou inferior a 60 graus Celsius."
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
              Fundamentação / Explicação Teórica:
            </label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Ex: A NR-20 estabelece que líquidos combustíveis possuem ponto de fulgor maior que 60ºC e até 93ºC..."
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Mnemonic / Tip */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              <span>Macete de Memorização (Opcional):</span>
            </label>
            <input
              type="text"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="Ex: Macete: 60 graus divide o fogo do combustível!"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Tags & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Tags (separadas por vírgula):
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="NR-20, Simulado 2024"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                Dificuldade Estimada:
              </label>
              <div className="flex items-center gap-2">
                {(['facil', 'medio', 'dificil'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition border ${
                      difficulty === d
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Flashcard</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
