/**
 * Think模式 - 提示词构建器
 */

import type { ThinkModeConfig, ThoughtProcess, Message } from '../types';

export class PromptBuilder {
  /**
   * 构建思维链提示词
   */
  async buildThinkPrompt(
    question: string,
    context: Message[] = [],
    config: ThinkModeConfig
  ): Promise<string> {
    const contextStr = this.buildContextString(context);
    const stepsInstruction = this.getStepsInstruction(config.maxSteps);

    return `你现在的任务是进行深度的逻辑分析和思考，而不是直接回答问题。

【用户的问题】
${question}

${contextStr ? `【之前的对话】\n${contextStr}\n` : ''}

请你作为一名严谨的分析师，遵循以下规则进行输出：

1. 你的输出必须完全包裹在 <think> 和 </think> 标签之间
2. 在标签内，请详细记录你的思维过程：
   - 拆解用户的意图和问题的核心
   - 检查已有的上下文信息
   - 规划回答的结构和要点
   - 预演可能的解决方案并自我纠错
3. **绝对不要**在 <think> 标签之外输出任何内容
4. **不要**试图在这个阶段直接生成最终回复给用户的答案
5. 深入分析但不急于得出结论，让思考自然展开

格式示例：


请开始你的思考：`;
  }

  /**
   * 构建答案提示词
   */
  async buildAnswerPrompt(
    question: string,
    thoughtProcess: ThoughtProcess,
    context: Message[] = []
  ): Promise<string> {
    const thoughtStr = this.formatThoughtProcess(thoughtProcess);
    const contextStr = this.buildContextString(context);

    // 去除可能存在的标签，只保留内容
    const cleanThought = thoughtStr.replace(/<\/?think>/g, '').trim();

    return `基于以下的深度思考过程，请为用户生成最终的回复。

【用户问题】
${question}

${contextStr ? `【对话上下文】\n${contextStr}\n` : ''}

【你的思考过程】
${cleanThought}

【回复要求】
1. 充分利用上述思考过程中的分析
2. 回答要逻辑清晰、结构化
3. 语气要自然亲切，直接面对用户（不要提及"根据思考过程..."）
4. 只输出最终答案，不要再次输出思考过程

请生成最终回答：`;
  }

  /**
   * 获取步骤指令
   */
  private getStepsInstruction(maxSteps: number): string {
    return `1. 理解问题：分析用户问题的核心和意图
2. 分析思路：梳理关键要点和回答方向
3. 总结要点：明确回答的重点内容`;
  }

  /**
   * 格式化思考过程
   */
  private formatThoughtProcess(thoughtProcess: ThoughtProcess): string {
    return thoughtProcess.steps
      .map(step => {
        let str = `Step ${step.order}: ${step.title}\n${step.content}`;
        if (step.subSteps && step.subSteps.length > 0) {
          str += '\n' + step.subSteps
            .map(sub => `  - ${sub.content}`)
            .join('\n');
        }
        return str;
      })
      .join('\n\n');
  }

  /**
   * 构建上下文字符串
   */
  private buildContextString(context: Message[]): string {
    if (context.length === 0) return '';

    return context
      .slice(-5)
      .map(m => {
        // 从 contentParts 提取文本
        const text = m.contentParts
          ?.filter(p => p.type === 'text')
          .map(p => (p as any).text || '')
          .join('\n') || '';
        return `${m.role}: ${text}`;
      })
      .join('\n');
  }
}
