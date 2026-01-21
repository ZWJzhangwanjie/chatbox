/**
 * Think模式 - 质量检查器
 */

import type { ThoughtProcess } from '../types';

interface QualityCheckInput {
  question: string;
  thought: ThoughtProcess;
  answer: string;
}

interface QualityResult {
  score: number;
  issues: string[];
  suggestions: string[];
}

export class QualityChecker {
  async check(input: QualityCheckInput): Promise<QualityResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 1.0;

    // 检查1: 思考步骤数量
    if (input.thought.steps.length < 2) {
      issues.push('思考步骤过少');
      suggestions.push('建议至少包含2-3个思考步骤');
      score -= 0.3;
    }

    // 检查2: 步骤内容长度
    const avgStepLength = input.thought.steps.reduce((sum, step) =>
      sum + step.content.length, 0
    ) / input.thought.steps.length;

    if (avgStepLength < 30) {
      issues.push('思考步骤过于简略');
      suggestions.push('建议每个步骤至少30字，充分展示推理过程');
      score -= 0.2;
    }

    // 检查3: 步骤类型多样性
    const types = new Set(input.thought.steps.map(s => s.type));
    if (types.size < 2) {
      issues.push('思考类型单一');
      suggestions.push('建议包含多种思考类型（理解、分析、推理等）');
      score -= 0.1;
    }

    // 检查4: 答案与思考的一致性
    if (!this.checkConsistency(input.thought, input.answer)) {
      issues.push('答案与思考过程不一致');
      suggestions.push('确保答案基于思考过程得出');
      score -= 0.3;
    }

    // 检查5: 答案是否回应问题
    if (!this.checkAnswerRelevance(input.question, input.answer)) {
      issues.push('答案未能有效回应用户问题');
      suggestions.push('确保答案直接回应问题核心');
      score -= 0.2;
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
    };
  }

  /**
   * 检查一致性
   */
  private checkConsistency(thought: ThoughtProcess, answer: string): boolean {
    const thoughtKeywords = this.extractKeywords(
      thought.steps.map(s => s.content).join(' ')
    );
    const answerLower = answer.toLowerCase();

    const matchCount = thoughtKeywords.filter(kw =>
      answerLower.includes(kw.toLowerCase())
    ).length;

    return matchCount >= Math.max(1, thoughtKeywords.length * 0.2);
  }

  /**
   * 检查答案相关性
   */
  private checkAnswerRelevance(question: string, answer: string): boolean {
    const questionKeywords = this.extractKeywords(question);
    const answerLower = answer.toLowerCase();

    const matchCount = questionKeywords.filter(kw =>
      answerLower.includes(kw.toLowerCase())
    ).length;

    return matchCount >= Math.max(1, questionKeywords.length * 0.3);
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', '的', '了', '是', '在', '和', '有']);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !stopWords.has(word));
  }
}
