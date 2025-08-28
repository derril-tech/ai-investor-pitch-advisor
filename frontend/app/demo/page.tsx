'use client'

import { useState } from 'react'
import ScoreDashboard from '@/components/ScoreDashboard'
import DeckViewer from '@/components/DeckViewer'

// Sample data for demonstration
const sampleScores = {
  clarity: 7.5,
  design: 8.2,
  storytelling: 6.8,
  investorFit: 7.9,
}

const sampleExplanations = {
  clarity: 'Good overall clarity with clear messaging. Some slides could benefit from more concise bullet points.',
  design: 'Excellent visual design with consistent branding and professional layout.',
  storytelling: 'Narrative flow is present but could be strengthened with better transitions between slides.',
  investorFit: 'Strong market positioning and competitive analysis. Financial projections are well-presented.',
}

const sampleSlides = [
  {
    id: '1',
    slideNumber: 1,
    title: 'Problem Statement',
    content: 'The current market lacks efficient solutions for...',
    scores: { clarity: 8.5, storytelling: 7.2 },
    suggestions: ['Add more specific examples', 'Include market size data'],
  },
  {
    id: '2',
    slideNumber: 2,
    title: 'Solution Overview',
    content: 'Our innovative platform addresses these challenges by...',
    scores: { clarity: 7.8, design: 8.5 },
    warnings: ['Consider adding more technical details'],
  },
  {
    id: '3',
    slideNumber: 3,
    title: 'Market Opportunity',
    content: 'Total Addressable Market: $50B\nServiceable Market: $10B',
    scores: { investorFit: 9.1, clarity: 8.2 },
    info: ['Market data from 2023 industry report'],
  },
  {
    id: '4',
    slideNumber: 4,
    title: 'Business Model',
    content: 'Revenue streams:\n• Subscription fees\n• Transaction fees\n• Premium features',
    scores: { investorFit: 8.7, storytelling: 7.5 },
    suggestions: ['Add revenue projections', 'Include pricing strategy'],
  },
  {
    id: '5',
    slideNumber: 5,
    title: 'Team',
    content: 'Experienced team with backgrounds in...',
    scores: { investorFit: 7.8 },
    info: ['Team bios available in appendix'],
  },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'viewer'>('dashboard')

  const handleBadgeClick = (type: string, value: any) => {
    console.log('Badge clicked:', type, value)
    // In a real app, this could open a detailed modal or navigate to specific analysis
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Pitch Advisor Demo</h1>
          <p className="text-gray-600">Explore the analysis features and deck viewer</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Score Dashboard
              </button>
              <button
                onClick={() => setActiveTab('viewer')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'viewer'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Deck Viewer
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Analysis Results</h2>
                <p className="card-description">
                  Comprehensive scoring across multiple dimensions with detailed explanations
                </p>
              </div>
              <div className="card-content">
                <ScoreDashboard
                  scores={sampleScores}
                  explanations={sampleExplanations}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'viewer' && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Interactive Deck Viewer</h2>
              <p className="card-description">
                Navigate through slides with real-time analysis badges and suggestions
              </p>
            </div>
            <div className="card-content p-0">
              <div className="h-[600px]">
                <DeckViewer
                  slides={sampleSlides}
                  deckName="Sample Pitch Deck"
                  onBadgeClick={handleBadgeClick}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
