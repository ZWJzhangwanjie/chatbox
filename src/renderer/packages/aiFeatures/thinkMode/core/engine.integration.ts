/**
 * Think模式 - 集成实际的LLM服务
 * 支持流式打字机效果
 */

import { PromptBuilder } from './promptBuilder';
import { QualityChecker } from './qualityChecker';
import { COTStrategy, ThoughtStreamCallback } from '../strategies/cot';
import type { ThinkRequest, ThinkResponse, ThinkModeConfig } from '../types';
import type { Message } from 'src/shared/types';
import { streamText } from '@/packages/model-calls';
import { getModel } from 'src/shared/models';
import { createModelDependencies } from '@/adapters';
import { settingsStore } from '@/stores/settingsStore';

export class ThinkModeEngine {
  private promptBuilder: PromptBuilder;
  private qualityChecker: QualityChecker;
  private strategies: Map<string, any>;

  constructor(config: ThinkModeConfig) {
    this.promptBuilder = new PromptBuilder();
    this.qualityChecker = new QualityChecker();
    this.strategies = new Map([
      ['cot', new COTStrategy()],
    ]);
  }

  /**
   * 执行Think模式 - 使用实际的LLM服务
   * @param onAnswerChunk 答案流式回调
   */
  async think(
    request: ThinkRequest,
    sessionSettings: any,
    signal?: AbortSignal,
    callbacks?: ThoughtStreamCallback,
    onAnswerChunk?: (chunk: string) => void
  ): Promise<ThinkResponse> {
    const startTime = Date.now();
    const strategy = this.strategies.get(request.config.strategy);

    if (!strategy) {
      throw new Error(`Unknown strategy: ${request.config.strategy}`);
    }

    // 1. 构建思维链提示词
    const thinkPrompt = await this.promptBuilder.buildThinkPrompt(
      request.prompt,
      request.context,
      request.config
    );

    // 2. 执行思维链推理 - 使用策略（支持流式回调）
    const thoughtProcess = await strategy.execute(
      thinkPrompt,
      request.config,
      sessionSettings,
      signal,
      callbacks
    );

    // 如果思考失败，直接返回
    if (thoughtProcess.status === 'failed') {
      return {
        thoughtProcess: {
          ...thoughtProcess,
          endTime: Date.now(),
          totalDuration: Date.now() - startTime,
        },
        finalAnswer: thoughtProcess.error || '思考过程失败',
        metadata: {
          model: 'unknown',
          totalTokens: 0,
          thoughtTokens: 0,
          answerTokens: 0,
          thinkingTime: Date.now() - startTime,
          answeringTime: 0,
        },
      };
    }

    // 3. 基于思考过程生成最终答案
    const answerPrompt = await this.promptBuilder.buildAnswerPrompt(
      request.prompt,
      thoughtProcess,
      request.context
    );

    // 创建模型实例
    const globalSettings = settingsStore.getState().getSettings();
    const dependencies = await createModelDependencies();

    // 根据配置选择答案生成模型
    let answerSettings = sessionSettings;
    if (!request.config.useSameModel && request.config.answerModelProvider && request.config.answerModelId) {
      // 使用专门配置的答案模型
      answerSettings = {
        ...sessionSettings,
        provider: request.config.answerModelProvider,
        modelId: request.config.answerModelId,
      };
    }

    const model = getModel(answerSettings, globalSettings, { uuid: 'think-mode-answer' }, dependencies);

    const answerMessages: Message[] = [
      { id: 'answer-system', role: 'system', contentParts: [{ type: 'text', text: answerPrompt }] },
      ...(request.context || []),
      { id: 'answer-user', role: 'user', contentParts: [{ type: 'text', text: request.prompt }] },
    ];

    const finalAnswer = await this.generateAnswer(model, answerMessages, signal, onAnswerChunk);

    const endTime = Date.now();

    return {
      thoughtProcess: {
        ...thoughtProcess,
        endTime,
        totalDuration: endTime - startTime,
        status: 'completed',
      },
      finalAnswer,
      metadata: {
        model: model.modelId,
        totalTokens: 0,
        thoughtTokens: 0,
        answerTokens: 0,
        thinkingTime: thoughtProcess.totalDuration || 0,
        answeringTime: endTime - startTime - (thoughtProcess.totalDuration || 0),
      },
    };
  }

  /**
   * 生成最终答案 - 使用实际的LLM服务
   * 支持流式展示
   */
  private async generateAnswer(
    model: any,
    messages: Message[],
    signal?: AbortSignal,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      // 使用流式生成
      const controller = new AbortController();
      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }

      let fullContent = '';

      const result = await streamText(model, {
        messages,
        onResultChangeWithCancel: async (data) => {
          if (data.contentParts) {
            const newContent = data.contentParts
              .filter(p => p.type === 'text')
              .map(p => (p as any).text || '')
              .join('');

            // 如果有新内容，触发回调
            if (newContent !== fullContent && onChunk) {
              onChunk(newContent);
            }

            fullContent = newContent;
          }
        },
      });

      if (controller.signal.aborted) {
        return fullContent || '生成已中断';
      }

      return fullContent || result.contentParts
        ?.filter(p => p.type === 'text')
        .map(p => (p as any).text || '')
        .join('') || '';
    } catch (error) {
      console.error('[🧠 THINK ENGINE] Generate answer failed:', error);
      throw error;
    }
  }
}
