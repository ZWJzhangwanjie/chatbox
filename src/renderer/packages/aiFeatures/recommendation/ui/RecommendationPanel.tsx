/**
 * 主动推荐 - UI组件
 */

import React, { useState } from 'react';
import type { Recommendation } from '../../types';
import styles from './RecommendationPanel.module.css';

interface RecommendationPanelProps {
  recommendations: Recommendation[];
  onSelect: (recommendation: Recommendation) => void;
  onDismiss?: () => void;
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendations,
  onSelect,
  onDismiss,
}) => {
  const [activeTab, setActiveTab] = useState<Recommendation['type'] | 'all'>('all');

  const grouped = groupByType(recommendations);
  const filtered = activeTab === 'all'
    ? recommendations
    : grouped[activeTab] || [];

  if (filtered.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.icon}>🎯</span>
          <span>为您推荐</span>
        </div>
        {onDismiss && (
          <button className={styles.dismiss} onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>

      {/* 标签页 */}
      <div className={styles.tabs}>
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
        >
          全部 ({recommendations.length})
        </TabButton>
        {Object.entries(grouped).map(([type, items]) => (
          <TabButton
            key={type}
            active={activeTab === type}
            onClick={() => setActiveTab(type as Recommendation['type'] | 'all')}
          >
            {getTypeLabel(type)} ({items.length})
          </TabButton>
        ))}
      </div>

      {/* 推荐列表 */}
      <div className={styles.list}>
        {filtered.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
};

// 推荐卡片
const RecommendationCard: React.FC<{
  recommendation: Recommendation;
  onSelect: (rec: Recommendation) => void;
}> = ({ recommendation, onSelect }) => {
  return (
    <div
      className={styles.card}
      onClick={() => onSelect(recommendation)}
    >
      <div className={styles.cardIcon}>
        {recommendation.icon || getTypeIcon(recommendation.type)}
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardTitle}>{recommendation.title}</div>
        <div className={styles.cardDescription}>{recommendation.description}</div>

        <div className={styles.cardMetadata}>
          {recommendation.metadata.difficulty && (
            <span className={`${styles.badge} ${styles[recommendation.metadata.difficulty]}`}>
              {getDifficultyLabel(recommendation.metadata.difficulty)}
            </span>
          )}
          {recommendation.metadata.estimatedTime && (
            <span className={styles.time}>
              ⏱️ {recommendation.metadata.estimatedTime}
            </span>
          )}
        </div>
      </div>

      {/* 相关度分数 */}
      <div className={styles.score}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="3"
            strokeDasharray={`${recommendation.score * 88} 88`}
            transform="rotate(-90 18 18)"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
};

// 标签按钮
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    className={`${styles.tab} ${active ? styles.tabActive : ''}`}
    onClick={onClick}
  >
    {children}
  </button>
);

// 辅助函数
function groupByType(recommendations: Recommendation[]) {
  return recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    resource: '📚 资源',
    tool: '🛠️ 工具',
    branch: '💡 探索',
    faq: '❓ 问答',
  };
  return labels[type] || type;
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    resource: '📚',
    tool: '🛠️',
    branch: '💡',
    faq: '❓',
  };
  return icons[type] || '📄';
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    beginner: '入门',
    intermediate: '进阶',
    advanced: '高级',
  };
  return labels[difficulty] || difficulty;
}
