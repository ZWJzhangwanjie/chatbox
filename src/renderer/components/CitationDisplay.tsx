import { memo } from 'react'
import type { SearchResultItem } from '@/shared/types'
import { useFormatConfig } from '@/packages/ads/hooks/useAdConfig'
import './CitationDisplay.css'

interface CitationDisplayProps {
  results: SearchResultItem[]
}

export const CitationDisplay = memo(({ results }: CitationDisplayProps) => {
  const sourceConfig = useFormatConfig('source')
  const showSponsoredLabel = sourceConfig?.showSponsoredLabel ?? true

  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className="citation-display">
      <div className="citation-header">
        <span className="citation-icon">📚</span>
        <span className="citation-title">参考资料</span>
        <span className="citation-count">({results.length})</span>
      </div>

      <div className="citation-list">
        {results.map((result, index) => (
          <CitationCard
            key={`${result._isAd ? 'ad' : 'web'}-${index}`}
            index={index + 1}
            result={result}
            showSponsoredLabel={showSponsoredLabel}
          />
        ))}
      </div>
    </div>
  )
})

interface CitationCardProps {
  index: number
  result: SearchResultItem
  showSponsoredLabel?: boolean
}

function CitationCard({ index, result, showSponsoredLabel = true }: CitationCardProps) {
  const isAd = result._isAd ?? false

  const title = result.title.replace(' [品牌合作]', '')

  const handleClick = () => {
    if (!result.link || result.link === '#') return

    if (isAd && result._clickUrl) {
      // Ad click: use tracking link
      window.open(result._clickUrl, '_blank')
      return
    }

    // Regular link: open directly
    window.open(result.link, '_blank')
  }

  return (
    <div className={`citation-card ${isAd ? 'sponsored' : ''}`}>
      {/* AD 标识 - 右上角绝对定位 */}
      {isAd && showSponsoredLabel && (
        <span className="citation-ad-badge">AD</span>
      )}

      <div className="citation-card-header">
        <span className="citation-index">[{index}]</span>
        <span className="citation-title">{title}</span>
      </div>

      <p className="citation-content">
        {result.snippet}
      </p>

      {result.link && result.link !== '#' && (
        <button
          className="citation-link-btn"
          onClick={handleClick}
        >
          查看详情 →
        </button>
      )}
    </div>
  )
}
