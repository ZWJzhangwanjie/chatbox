/**
 * AI功能 - 统一导出
 */

// 统一调度器
export { AIFeaturesCoordinator } from './scheduler/coordinator';

// 状态管理
export { useAIFeaturesStore } from '../../stores/aiFeaturesStore';

// 智能追问
export { FollowUpEngine } from './followUp/core/engine';
export { RuleBasedStrategy } from './followUp/strategies/ruleBased';
export { PatternMatchingStrategy } from './followUp/strategies/patternMatching';
export { SuggestionChips } from './followUp/ui/SuggestionChips';
export type {
  FollowUpContext,
  FollowUpSuggestion,
  FollowUpConfig,
  Rule,
  RuleCondition,
} from './followUp/types';

// 主动推荐
export { RecommendationEngine } from './recommendation/core/engine';
export { RecommendationTrigger } from './recommendation/core/trigger';
export { RecommendationRanker } from './recommendation/core/ranker';
export { ContentBasedStrategy } from './recommendation/strategies/contentBased';
export { toolRegistry } from './recommendation/resources/toolRegistry';
export { contentIndex } from './recommendation/resources/contentIndex';
export { RecommendationPanel } from './recommendation/ui/RecommendationPanel';
export type {
  RecommendationContext,
  Recommendation,
  RecommendationConfig,
  Tool,
  ContentItem,
  UserAction,
  RelatedTopic,
} from './recommendation/types';

// Think模式
export { ThinkModeEngine } from './thinkMode/core/engine';
export { PromptBuilder } from './thinkMode/core/promptBuilder';
export { StepParser } from './thinkMode/core/stepParser';
export { QualityChecker } from './thinkMode/core/qualityChecker';
export { COTStrategy } from './thinkMode/strategies/cot';
export { ThinkIndicator } from './thinkMode/ui/ThinkIndicator';
export { ThoughtProcess } from './thinkMode/ui/ThoughtProcess';
export type {
  ThoughtStep,
  ThinkModeConfig,
  ThinkRequest,
  ThinkResponse,
} from './thinkMode/types';
