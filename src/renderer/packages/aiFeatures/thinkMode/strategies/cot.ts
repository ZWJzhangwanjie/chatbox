/**
 * Think模式 - Chain of Thought策略
 * 使用流式LLM服务生成思考过程（打字机效果）
 */

import { StepParser } from '../core/stepParser';
import type { ThinkModeConfig, ThoughtProcess, ThoughtStep } from '../types';
import type { Message } from 'src/shared/types';
import { streamText } from '@/packages/model-calls';
import { getModel } from 'src/shared/models';
import { createModelDependencies } from '@/adapters';
import { settingsStore } from '@/stores/settingsStore';
import { createMessage } from 'src/shared/types';

// 流式回调类型
export interface ThoughtStreamCallback {
  onStepStart?: (step: ThoughtStep) => void;
  onStepUpdate?: (step: ThoughtStep, content: string) => void;
  onStepComplete?: (step: ThoughtStep) => void;
  onProgress?: (content: string) => void;
}

export class COTStrategy {
  private stepParser: StepParser;
  private abortController: AbortController | null = null;

  constructor() {
    this.stepParser = new StepParser();
  }

  /**
   * 取消当前思考过程
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 执行Chain of Thought推理 - 使用流式LLM服务
   */
  async execute(
    prompt: string,
    config: ThinkModeConfig,
    sessionSettings: any,
    signal?: AbortSignal,
    callbacks?: ThoughtStreamCallback
  ): Promise<ThoughtProcess> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    // 如果外部提供了signal，监听取消事件
    if (signal) {
      signal.addEventListener('abort', () => {
        this.abort();
      });
    }

    try {
      // 创建模型实例
      const globalSettings = settingsStore.getState().getSettings();
      const dependencies = await createModelDependencies();

      // 根据配置选择模型
      let modelSettings = sessionSettings;
      if (!config.useSameModel && config.thinkModelProvider && config.thinkModelId) {
        // 使用专门配置的思考模型
        modelSettings = {
          ...sessionSettings,
          provider: config.thinkModelProvider,
          modelId: config.thinkModelId,
        };
      }

      const model = getModel(modelSettings, globalSettings, { uuid: 'think-mode-cot' }, dependencies);

      // 构建消息
      const messages: Message[] = [
        createMessage('system', prompt),
      ];

      // 收集完整的思考内容
      let fullContent = '';
      const steps: ThoughtStep[] = [];
      const currentSteps = new Map<number, { title: string; content: string }>();

      // 使用流式生成
      const result = await streamText(model, {
        messages,
        onResultChangeWithCancel: async (data) => {
          if (this.abortController?.signal.aborted) {
            return;
          }

          // 提取文本内容
          const text = data.contentParts
            ?.filter(p => p.type === 'text')
            .map(p => (p as any).text || '')
            .join('') || '';

          if (text === fullContent) return;

          // 计算新增内容
          const newContent = text.slice(fullContent.length);
          fullContent = text;

          // 回调进度
          callbacks?.onProgress?.(fullContent);

          // 实时解析步骤
          const parsedSteps = this.stepParser.parseThoughtProcess(fullContent);

          // 检测新增的步骤
          for (const step of parsedSteps) {
            if (!currentSteps.has(step.order)) {
              // 新步骤开始
              currentSteps.set(step.order, {
                title: step.title,
                content: step.content,
              });
              callbacks?.onStepStart?.(step);
            } else {
              // 已有步骤，检查是否有更新
              const existing = currentSteps.get(step.order)!;
              if (step.content !== existing.content) {
                currentSteps.set(step.order, {
                  title: step.title,
                  content: step.content,
                });
                callbacks?.onStepUpdate?.(step, step.content);
              }
            }
          }
        },
      });

      if (this.abortController.signal.aborted) {
        return {
          steps: Array.from(currentSteps.values()).map((s, i) => ({
            order: i + 1,
            type: 'analysis' as const,
            title: s.title,
            content: s.content,
            completed: false,
          })),
          startTime,
          status: 'failed',
          error: '思考已取消',
        };
      }

      // 最终解析
      const finalSteps = this.stepParser.parseThoughtProcess(fullContent);

      // 触发步骤完成回调
      finalSteps.forEach(step => {
        callbacks?.onStepComplete?.(step);
      });

      // 验证步骤质量
      const validSteps = this.validateSteps(finalSteps);

      const endTime = Date.now();

      return {
        steps: validSteps,
        startTime,
        endTime,
        totalDuration: endTime - startTime,
        status: 'completed',
      };
    } catch (error) {
      console.error('[🧠 THINK STREAM] Error:', error);
      return {
        steps: [],
        startTime,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 验证步骤质量
   */
  private validateSteps(steps: any[]): any[] {
    return steps.filter(step => {
      if (!step.title || step.title.trim().length === 0) return false;
      if (!step.content || step.content.trim().length === 0) return false;
      return true;
    });
  }
}
