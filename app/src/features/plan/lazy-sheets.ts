// X14: os painéis de IA só baixam quando abertos pela primeira vez (fora do pacote principal).
import { lazy } from 'react';

export const LazyAiPlanSheet = lazy(() => import('./AiPlanSheet').then(m => ({ default: m.AiPlanSheet })));
export const LazyAiReviewSheet = lazy(() => import('./AiReviewSheet').then(m => ({ default: m.AiReviewSheet })));
