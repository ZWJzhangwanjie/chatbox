/**
 * Think模式 - 步骤解析器
 * 支持 解析
 */

import type { ThoughtStep } from '../types';

export class StepParser {
  /**
   * 解析LLM输出的思考过程
   * 将整个内容作为一个思考步骤
   */
  parseThoughtProcess(rawContent: string): ThoughtStep[] {
    let cleanContent = '';

    // 尝试提取  标签内的内容
    const thinkMatch = rawContent.match(/([\s\S]*?)<\/think>/i);
    if (thinkMatch && thinkMatch[1]) {
      // 找到标签，提取内容
      cleanContent = thinkMatch[1].trim();
    } else {
      // 没有标签，使用原始内容（向后兼容）
      cleanContent = rawContent
        .replace(/【思考过程】\s*/gi, '')
        .replace(/请开始你的思考[：:]\s*/gi, '')
        .replace(/<\/?think>/g, '') // 清理可能的不完整标签
        .trim();
    }

    // 如果内容太短，返回空数组
    if (cleanContent.length < 10) {
      return [];
    }

    // 将整个内容作为一个思考步骤
    const step: ThoughtStep = {
      order: 1,
      type: 'analysis',
      title: '思考过程',
      content: cleanContent,
      completed: true,
    };

    return [step];
  }
}
