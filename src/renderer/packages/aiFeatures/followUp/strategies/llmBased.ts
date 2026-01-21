/**
 * 智能追问 - LLM引擎策略
 * 使用大语言模型生成高质量追问建议
 * 支持主备模型切换
 */

import type { FollowUpContext, FollowUpSuggestion } from '../types';
import { getMessageText } from '../../utils/messageUtils';
import { generateText } from '@/packages/model-calls';
import { getModel } from 'src/shared/models';
import { ModelProviderEnum } from 'src/shared/types/provider';
import { createModelDependencies } from '@/adapters';
import { settingsStore } from '@/stores/settingsStore';
import { createMessage } from 'src/shared/types';

export class LLMBasedStrategy {
  // 备用模型配置（用户提供的配置）
  private readonly FALLBACK_CONFIG = {
    provider: ModelProviderEnum.CustomOpenAI,
    modelId: 'gemini-3-flash-preview',
    apiHost: 'https://api.cursorai.art/v1',
    apiKey: 'sk-SBWp54GCKfoUZ0dn6I9T2XPkdLJ2fj7D3vkEBmLGGFHXmbpe',
  };

  private readonly BACKUP_MODEL = 'gpt-5.2-chat';

  /**
   * 基于LLM生成追问建议（支持主备模型切换）
   */
  async generate(context: FollowUpContext): Promise<FollowUpSuggestion[]> {
    console.log('[AI Features LLM] LLMBasedStrategy.generate called');

    const lastUserMessage = this.getLastUserMessage(context.messages);
    const lastAIMessage = this.getLastAIMessage(context.messages);

    if (!lastUserMessage || !lastAIMessage) {
      console.log('[AI Features LLM] No sufficient messages for LLM generation');
      return [];
    }

    // 构建提示词
    const prompt = this.buildPrompt(lastUserMessage, lastAIMessage, context);
    console.log('[AI Features LLM] Generated prompt for LLM');

    // 首先尝试使用会话设置
    if (context.sessionSettings) {
      try {
        console.log('[AI Features LLM] Trying with session settings');
        const suggestions = await this.generateWithSettings(context.sessionSettings, prompt);
        if (suggestions.length > 0) {
          return suggestions;
        }
      } catch (error) {
        console.warn('[AI Features LLM] Session settings failed, trying fallback:', error);
      }
    }

    // 尝试使用备用模型配置
    try {
      console.log('[AI Features LLM] Trying with fallback model');
      const suggestions = await this.generateWithFallback(prompt);
      if (suggestions.length > 0) {
        return suggestions;
      }
    } catch (error) {
      console.error('[AI Features LLM] Fallback model also failed:', error);
    }

    return [];
  }

  /**
   * 使用指定设置生成建议
   */
  private async generateWithSettings(sessionSettings: any, prompt: { system: string; user: string }): Promise<FollowUpSuggestion[]> {
    const globalSettings = settingsStore.getState().getSettings();
    const dependencies = await createModelDependencies();
    const model = getModel(sessionSettings, globalSettings, { uuid: 'follow-up-llm' }, dependencies);

    return await this.callModel(model, prompt);
  }

  /**
   * 使用备用配置生成建议
   */
  private async generateWithFallback(prompt: { system: string; user: string }): Promise<FollowUpSuggestion[]> {
    // 首先尝试主备用模型
    try {
      console.log('[AI Features LLM] Trying primary fallback model:', this.FALLBACK_CONFIG.modelId);
      const result = await this.callModelWithConfig(this.FALLBACK_CONFIG.modelId, prompt);
      if (result.length > 0) return result;
    } catch (error) {
      console.warn('[AI Features LLM] Primary fallback failed, trying backup:', error);
    }

    // 如果主备用模型失败，尝试第二个备用模型
    console.log('[AI Features LLM] Trying secondary fallback model:', this.BACKUP_MODEL);
    return await this.callModelWithConfig(this.BACKUP_MODEL, prompt);
  }

  /**
   * 使用特定配置调用模型
   */
  private async callModelWithConfig(modelId: string, prompt: { system: string; user: string }): Promise<FollowUpSuggestion[]> {
    const globalSettings = settingsStore.getState().getSettings();

    // 创建临时 provider 设置
    const tempProviderId = `temp-follow-up-${Date.now()}`;
    const tempSettings = {
      ...globalSettings,
      providers: {
        ...globalSettings.providers,
        [tempProviderId]: {
          apiHost: this.FALLBACK_CONFIG.apiHost,
          apiKey: this.FALLBACK_CONFIG.apiKey,
          models: [{ modelId }],
        },
      },
    };

    const sessionSettings = {
      provider: tempProviderId,
      modelId: modelId,
    };

    const dependencies = await createModelDependencies();
    const model = getModel(sessionSettings, tempSettings, { uuid: 'follow-up-llm' }, dependencies);

    return await this.callModel(model, prompt);
  }

  /**
   * 调用模型生成建议
   */
  private async callModel(model: any, prompt: { system: string; user: string }): Promise<FollowUpSuggestion[]> {
    const messages = [
      createMessage('system', prompt.system),
      createMessage('user', prompt.user),
    ];

    const result = await generateText(model, messages);

    // 提取文本
    const text = result.contentParts
      .filter(p => p.type === 'text')
      .map(p => (p as any).text || '')
      .join('\n');

    console.log('[AI Features LLM] LLM response:', text);

    // 解析LLM响应
    const suggestions = this.parseLLMResponse(text);
    console.log('[AI Features LLM] Parsed suggestions:', suggestions);

    return suggestions;
  }

  /**
   * 构建LLM提示词
   */
  private buildPrompt(userMessage: any, aiMessage: any, context: FollowUpContext) {
    const userText = getMessageText(userMessage);
    const aiText = getMessageText(aiMessage);
    const topic = context.metadata?.topic || this.extractTopic(userText);

    return {
      system: `你是一个智能对话助手，负责预测用户最想问的后续问题。

**重要：角色反转**
现在你要扮演用户角色。基于上面的对话，思考：如果你是用户，听了AI的回答后，你会想问AI什么问题？

**核心原则：**
1. 用户视角：问题必须是用户问AI的，不是AI问用户的
2. 简洁直接：每个问题10-15字以内
3. 疑问句式：使用"吗？"、"如何"、"怎么"等疑问词
4. 深入话题：引导向更深层的知识或实践方向
5. 实用价值：用户真正关心的问题

**正确示例（用户问AI）：**
- "今天气温多少度？"
- "如何配置环境变量？"
- "这个错误怎么解决？"
- "需要安装哪些依赖？"

**错误示例（AI问用户）：**
- "你想了解哪个城市？" ❌
- "你需要详细的教程吗？" ❌
- "你更关心哪方面内容？" ❌

**输出要求：**
- 直接输出3-4个问题，每行一个
- 不要编号，不要markdown格式
- 不要任何解释文字`,
      user: `用户的问题：${userText}

AI的回答：${aiText.substring(0, 2000)}...

话题：${topic}

请预测用户最可能问的3-4个后续问题：`
    };
  }

  /**
   * 解析LLM响应
   */
  private parseLLMResponse(text: string): FollowUpSuggestion[] {
    // 分割成行
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const suggestions: FollowUpSuggestion[] = [];

    for (const line of lines) {
      // 跳过标题行和说明文字
      if (this.isHeaderLine(line)) {
        continue;
      }

      // 移除编号和前缀
      const cleanedLine = this.cleanLine(line);

      // 验证是否是有效的用户视角问题
      if (this.isValidUserQuestion(cleanedLine)) {
        suggestions.push({
          id: this.generateId(),
          text: cleanedLine,
          type: this.classifySuggestion(cleanedLine),
          confidence: this.calculateConfidence(cleanedLine),
          source: 'llm',
        });
      }
    }

    // 按置信度排序并返回前4个
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 4);
  }

  /**
   * 判断是否是标题行
   */
  private isHeaderLine(line: string): boolean {
    const headerPrefixes = ['以下是', '追问', '建议', '预测', '可能', '示例', '问题'];
    return headerPrefixes.some(prefix => line.startsWith(prefix)) ||
           line.match(/^[第\s\d*个]+问题/);
  }

  /**
   * 清理行内容
   */
  private cleanLine(line: string): string {
    return line
      .replace(/^\d+[\.\、)]\s*/, '') // 移除数字编号
      .replace(/^[-\*•]\s*/, '') // 移除列表符号
      .replace(/^["「『]/, '') // 移除前引号
      .replace(/["」』]$/, '') // 移除后引号
      .trim();
  }

  /**
   * 验证是否是有效的用户视角问题
   */
  private isValidUserQuestion(text: string): boolean {
    // 长度检查：10-50字
    if (text.length < 5 || text.length > 50) {
      return false;
    }

    // 排除AI视角的问题特征
    const aiPerspectivePatterns = [
      /你想了解/, /你需要/, /你是否/, /你希望/,
      /你想知道/, /你打算/, /你想要/,
      /愿意.*吗/, /需要.*吗/,
      /哪方面/, /哪种/, /哪个/, /哪些/,
      /具体/, /详细/, /更多/, /进一步/,
    ];

    for (const pattern of aiPerspectivePatterns) {
      if (pattern.test(text)) {
        console.warn('[AI Features LLM] Filtered AI-perspective question:', text);
        return false;
      }
    }

    // 必须包含疑问词或疑问语气
    const questionIndicators = [
      '吗', '呢', '？', '?',
      '如何', '怎么', '怎样',
      '什么', '哪些', '哪个',
      '为什么', '为何',
      '是否', '有没有', '能不能',
      '可以', '会', '要', '需要',
    ];

    const hasQuestionIndicator = questionIndicators.some(indicator => text.includes(indicator));

    if (!hasQuestionIndicator) {
      return false;
    }

    return true;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(text: string): number {
    let confidence = 0.85; // 基础置信度

    // 长度适中加分
    if (text.length >= 8 && text.length <= 20) {
      confidence += 0.05;
    }

    // 包含具体疑问词加分
    const specificQuestions = ['如何', '怎么', '什么', '为什么', '怎么'];
    if (specificQuestions.some(q => text.includes(q))) {
      confidence += 0.05;
    }

    // 包含专业词汇可能表示更深入的问题
    const technicalKeywords = ['配置', '安装', '部署', '调试', '优化', '实现', '原理'];
    if (technicalKeywords.some(kw => text.includes(kw))) {
      confidence += 0.03;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * 分类建议类型
   */
  private classifySuggestion(text: string): 'clarification' | 'elaboration' | 'example' | 'action' {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('如何') || lowerText.includes('怎么') || lowerText.includes('方法')) {
      return 'action';
    }

    if (lowerText.includes('什么是') || lowerText.includes('解释') || lowerText.includes('为什么')) {
      return 'clarification';
    }

    if (lowerText.includes('例如') || lowerText.includes('比如') || lowerText.includes('例子')) {
      return 'example';
    }

    return 'elaboration';
  }

  /**
   * 提取话题
   */
  private extractTopic(content: string): string {
    if (!content) return '这个话题';
    const words = content.split(/\s+/).filter(w => w.length > 2);
    return words[0] || '这个话题';
  }

  private getLastUserMessage(messages: any[]): any | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i];
    }
    return null;
  }

  private getLastAIMessage(messages: any[]): any | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }

  private generateId(): string {
    return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
