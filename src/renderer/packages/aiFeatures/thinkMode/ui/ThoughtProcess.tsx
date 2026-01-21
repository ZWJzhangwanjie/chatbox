/**
 * Think模式 - 思考过程展示组件
 * 直接展示思考内容，不区分步骤
 * 支持流式打字机效果
 */

import React, { useState, useEffect } from 'react';
import type { ThoughtProcess as ThoughtProcessType } from '../../types';
import styles from './ThoughtProcess.module.css';

interface ThoughtProcessProps {
  thoughtProcess: ThoughtProcessType;
}

export const ThoughtProcess: React.FC<ThoughtProcessProps> = ({ thoughtProcess }) => {
  const { steps, status } = thoughtProcess;

  // 将所有步骤内容合并为一个整体
  const fullContent = steps.map(step => step.content).join('\n\n');

  // 打字机状态
  const [displayedContent, setDisplayedContent] = useState('');

  // 监听内容变化，重置显示
  useEffect(() => {
    // 内容变化时会触发重新渲染
  }, [fullContent]);

  // 实现打字机效果
  useEffect(() => {
    if (fullContent === displayedContent) return;

    const timers: NodeJS.Timeout[] = [];
    let charIndex = displayedContent.length;

    const nextChar = () => {
      if (charIndex < fullContent.length) {
        setDisplayedContent(fullContent.slice(0, charIndex + 1));
        charIndex++;
        const timer = setTimeout(nextChar, 5); // 每个字符间隔5ms
        timers.push(timer);
      }
    };

    const timer = setTimeout(nextChar, 0);
    timers.push(timer);

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [fullContent]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <p className={styles.text}>
          {displayedContent}
          {/* 打字机光标效果 */}
          {status === 'thinking' && displayedContent !== fullContent && (
            <span className={styles.cursor}>|</span>
          )}
        </p>
      </div>

      {status === 'completed' && (
        <div className={styles.complete}>
          <span>✓</span>
          <span>思考完成，准备回答...</span>
        </div>
      )}
    </div>
  );
};
