/**
 * AI功能 - 消息工具函数
 * 用于从chatbox的Message类型中提取文本内容
 */

import type { Message } from 'src/shared/types';

/**
 * 从Message中提取文本内容
 * 支持contentParts格式
 */
export function getMessageText(message: Message): string {
  // 如果有contentParts，从中提取文本
  if (message.contentParts && message.contentParts.length > 0) {
    return message.contentParts
      .filter(p => p.type === 'text')
      .map(p => (p as any).text || '')
      .join('\n');
  }

  // 兼容旧格式（如果有的话）
  return '';
}

/**
 * 检查消息是否包含指定关键词
 */
export function messageContains(message: Message, keyword: string): boolean {
  const text = getMessageText(message);
  return text.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * 从Message数组中提取最后一条用户消息
 */
export function getLastUserMessage(messages: Message[]): Message | undefined {
  return [...messages].reverse().find(m => m.role === 'user');
}

/**
 * 从Message数组中提取最后一条AI消息
 */
export function getLastAssistantMessage(messages: Message[]): Message | undefined {
  return [...messages].reverse().find(m => m.role === 'assistant');
}
