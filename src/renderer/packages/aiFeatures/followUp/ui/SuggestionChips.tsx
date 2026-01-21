/**
 * 智能追问 - UI组件
 */

import React, { useState, useEffect } from 'react';
import type { FollowUpSuggestion } from '../../types';
import styles from './SuggestionChips.module.css';

// 注入关键帧动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
if (typeof document !== 'undefined' && !document.head.querySelector('style[data-follow-up-anim]')) {
  styleSheet.setAttribute('data-follow-up-anim', 'true');
  document.head.appendChild(styleSheet);
}

interface SuggestionChipsProps {
  suggestions: FollowUpSuggestion[];
  onSelect: (suggestion: FollowUpSuggestion) => void;
  onCustomFollowUp?: () => void;
  loading?: boolean;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  suggestions,
  onSelect,
  onCustomFollowUp,
  loading = false,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // 组件挂载后延迟显示，实现淡入效果
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // 调试日志
  console.log('[AI Features SuggestionChips] Rendering', {
    suggestionsCount: suggestions.length,
    loading,
    suggestions,
    isVisible,
  });

  if (loading) {
    return <div style={{ padding: '16px', color: '#9ca3af', fontSize: '14px', textAlign: 'center', background: 'yellow', border: '2px solid red' }}>加载建议中...</div>;
  }

  if (suggestions.length === 0) {
    console.log('[AI Features SuggestionChips] No suggestions, returning null');
    return null;
  }

  // 按类型分组
  const grouped = groupByType(suggestions);
  console.log('[AI Features SuggestionChips] Grouped suggestions', grouped);

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
      borderRadius: '12px',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
    }}>
      {/* 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#6366f1' }}>
        <span style={{ fontSize: '18px' }}>💡</span>
        <span>建议继续了解</span>
      </div>

      {/* 按类型展示 */}
      {Object.entries(grouped).map(([type, items], groupIndex) => (
        <div key={type} style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: '#8b5cf6', marginBottom: '6px' }}>
            {getTypeLabel(type)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {items.map((suggestion, index) => (
              <div
                key={suggestion.id}
                style={{
                  position: 'relative',
                  padding: '10px 12px',
                  background: 'white',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  opacity: 0,
                  animation: `fadeInUp 0.3s ease-out ${groupIndex * 0.1 + index * 0.05}s forwards`,
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => onSelect(suggestion)}
              >
                {/* 置信度指示条 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    height: '2px',
                    background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                    transition: 'width 0.3s ease',
                    width: `${suggestion.confidence * 100}%`,
                  }}
                />

                {/* 建议文本 */}
                <span style={{ display: 'block', fontSize: '13px', color: '#1f2937', lineHeight: '1.4' }}>
                  {suggestion.text}
                </span>

                {/* 箭头 */}
                {hoveredIndex === index && (
                  <span style={{ position: 'absolute', bottom: '6px', right: '6px', color: '#6366f1', fontSize: '14px' }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 自定义追问按钮 */}
      {onCustomFollowUp && (
        <button
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px',
            marginTop: '8px',
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px dashed rgba(99, 102, 241, 0.3)',
            borderRadius: '8px',
            color: '#6366f1',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: 0,
            animation: 'fadeInUp 0.3s ease-out 0.3s forwards',
          }}
          onClick={onCustomFollowUp}
        >
          <span>✏️</span>
          <span>自定义追问</span>
        </button>
      )}
    </div>
  );
};

// 辅助函数
function groupByType(suggestions: FollowUpSuggestion[]) {
  return suggestions.reduce((acc, s) => {
    if (!acc[s.type]) acc[s.type] = [];
    acc[s.type].push(s);
    return acc;
  }, {} as Record<string, FollowUpSuggestion[]>);
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    clarification: '🔍 深入了解',
    elaboration: '📖 扩展阅读',
    example: '💡 实例说明',
    action: '⚡ 实践建议',
  };
  return labels[type] || type;
}
