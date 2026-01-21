/**
 * Think模式 - UI组件
 * 支持流式打字机效果
 */

import React, { useState, useEffect } from 'react';
import { ThoughtProcess } from './ThoughtProcess';
import type { ThoughtProcess as ThoughtProcessType } from '../../types';
import styles from './ThinkIndicator.module.css';

interface ThinkIndicatorProps {
  thoughtProcess: ThoughtProcessType;
  defaultCollapsed?: boolean;
}

export const ThinkIndicator: React.FC<ThinkIndicatorProps> = ({
  thoughtProcess,
  defaultCollapsed = true,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const { steps, totalDuration, status } = thoughtProcess;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={styles.container}>
      {collapsed ? (
        // 折叠状态
        <div
          className={styles.collapsed}
          onClick={() => setCollapsed(false)}
        >
          <div className={styles.header}>
            <div className={styles.iconSection}>
              {status === 'thinking' ? (
                <div className={styles.thinking}>
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </div>
              ) : (
                <span>💭</span>
              )}
              <span className={styles.label}>
                {status === 'thinking' ? '我正在思考...' : '思考过程'}
              </span>
            </div>

            <div className={styles.meta}>
              <span className={styles.steps}>✓ {steps.length} 个步骤</span>
              {totalDuration && (
                <span className={styles.duration}>⏱️ {formatDuration(totalDuration)}</span>
              )}
            </div>

            <span className={styles.expand}>▼</span>
          </div>
        </div>
      ) : (
        // 展开状态 - 显示流式步骤
        <div className={styles.expanded}>
          <div className={styles.header} onClick={() => setCollapsed(true)}>
            <div className={styles.iconSection}>
              {status === 'thinking' ? (
                <div className={styles.thinking}>
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </div>
              ) : (
                <span>💭</span>
              )}
              <span className={styles.label}>
                {status === 'thinking' ? '我正在思考...' : '思考过程'}
              </span>
            </div>
            <span className={styles.collapse}>▲</span>
          </div>

          <ThoughtProcess thoughtProcess={thoughtProcess} />
        </div>
      )}
    </div>
  );
};
