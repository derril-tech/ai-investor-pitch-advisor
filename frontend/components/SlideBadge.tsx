'use client'

import { useState } from 'react'
import { Info, CheckCircle, AlertCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react'

interface SlideBadgeProps {
  type: 'score' | 'suggestion' | 'warning' | 'info'
  value?: number
  label: string
  hint?: string
  onClick?: () => void
  className?: string
}

export default function SlideBadge({ 
  type, 
  value, 
  label, 
  hint, 
  onClick, 
  className = '' 
}: SlideBadgeProps) {
  const [showHint, setShowHint] = useState(false)

  const getBadgeStyles = () => {
    switch (type) {
      case 'score':
        if (value! >= 8) return 'bg-green-100 text-green-800 border-green-200'
        if (value! >= 6) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
        if (value! >= 4) return 'bg-orange-100 text-orange-800 border-orange-200'
        return 'bg-red-100 text-red-800 border-red-200'
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'info':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getIcon = () => {
    switch (type) {
      case 'score':
        if (value! >= 8) return <CheckCircle className="h-3 w-3" />
        if (value! >= 6) return <TrendingUp className="h-3 w-3" />
        return <TrendingDown className="h-3 w-3" />
      case 'suggestion':
        return <Info className="h-3 w-3" />
      case 'warning':
        return <AlertCircle className="h-3 w-3" />
      case 'info':
        return <Info className="h-3 w-3" />
      default:
        return <Info className="h-3 w-3" />
    }
  }

  return (
    <div className="relative">
      <div
        className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border
          ${getBadgeStyles()}
          ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}
          ${className}
        `}
        onClick={onClick}
        onMouseEnter={() => hint && setShowHint(true)}
        onMouseLeave={() => hint && setShowHint(false)}
      >
        {getIcon()}
        <span>{label}</span>
        {type === 'score' && value !== undefined && (
          <span className="font-bold">{value.toFixed(1)}</span>
        )}
      </div>

      {/* Hint Tooltip */}
      {hint && showHint && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-10">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
            {hint}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}

interface SlideBadgesProps {
  scores?: Record<string, number>
  suggestions?: string[]
  warnings?: string[]
  info?: string[]
  onBadgeClick?: (type: string, value?: any) => void
  className?: string
}

export function SlideBadges({ 
  scores, 
  suggestions, 
  warnings, 
  info, 
  onBadgeClick, 
  className = '' 
}: SlideBadgesProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Score Badges */}
      {scores && Object.entries(scores).map(([dimension, score]) => (
        <SlideBadge
          key={`score-${dimension}`}
          type="score"
          value={score}
          label={dimension.charAt(0).toUpperCase() + dimension.slice(1)}
          hint={`${dimension} score: ${score.toFixed(1)}/10`}
          onClick={() => onBadgeClick?.('score', { dimension, score })}
        />
      ))}

      {/* Suggestion Badges */}
      {suggestions && suggestions.map((suggestion, index) => (
        <SlideBadge
          key={`suggestion-${index}`}
          type="suggestion"
          label="Suggestion"
          hint={suggestion}
          onClick={() => onBadgeClick?.('suggestion', suggestion)}
        />
      ))}

      {/* Warning Badges */}
      {warnings && warnings.map((warning, index) => (
        <SlideBadge
          key={`warning-${index}`}
          type="warning"
          label="Warning"
          hint={warning}
          onClick={() => onBadgeClick?.('warning', warning)}
        />
      ))}

      {/* Info Badges */}
      {info && info.map((infoItem, index) => (
        <SlideBadge
          key={`info-${index}`}
          type="info"
          label="Info"
          hint={infoItem}
          onClick={() => onBadgeClick?.('info', infoItem)}
        />
      ))}
    </div>
  )
}
