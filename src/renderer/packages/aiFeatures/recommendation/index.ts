/**
 * 主动推荐 - 导出
 */

export { RecommendationEngine } from './core/engine';
export { RecommendationTrigger } from './core/trigger';
export { RecommendationRanker } from './core/ranker';
export { ContentBasedStrategy } from './strategies/contentBased';
export { toolRegistry } from './resources/toolRegistry';
export { contentIndex } from './resources/contentIndex';
export { RecommendationPanel } from './ui/RecommendationPanel';
export * from './types';
