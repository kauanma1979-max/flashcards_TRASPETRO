import { MacroDiscipline, Flashcard } from '../types';
import { MACRO_1_DISCIPLINE, MACRO_1_CARDS } from './macro1_processos';
import { MACRO_2_DISCIPLINE, MACRO_2_CARDS } from './macro2_financas';
import { MACRO_3_DISCIPLINE, MACRO_3_CARDS } from './macro3_logistica';
import { MACRO_4_DISCIPLINE, MACRO_4_CARDS } from './macro4_informatica';

export const INITIAL_MACRO_DISCIPLINES: MacroDiscipline[] = [
  MACRO_1_DISCIPLINE,
  MACRO_2_DISCIPLINE,
  MACRO_3_DISCIPLINE,
  MACRO_4_DISCIPLINE
];

export const ALL_INITIAL_FLASHCARDS: Flashcard[] = [
  ...MACRO_1_CARDS,
  ...MACRO_2_CARDS,
  ...MACRO_3_CARDS,
  ...MACRO_4_CARDS
];
