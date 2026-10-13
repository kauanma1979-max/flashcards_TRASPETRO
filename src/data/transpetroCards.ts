import { MacroDiscipline, Flashcard } from '../types';
import { MACRO_1_DISCIPLINE, MACRO_1_CARDS } from './macro1_processos';

export const INITIAL_MACRO_DISCIPLINES: MacroDiscipline[] = [
  MACRO_1_DISCIPLINE
];

export const ALL_INITIAL_FLASHCARDS: Flashcard[] = [
  ...MACRO_1_CARDS
];
