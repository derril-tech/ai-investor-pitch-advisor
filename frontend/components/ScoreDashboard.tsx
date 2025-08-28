'use client'

import { useState, useEffect } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Score {
  dimension: string
  score: number
  explanation: string
}

interface ScoreDashboardProps {
  scores: Record<string, number>
  explanations: Record<string, string>
  isLoading?: boolean
}

export default function ScoreDashboard({ scores, explanations, isLoading = false }: ScoreDashboardProps) {
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null)

  // Transform scores for radar chart
  const radarData = Object.entries(scores).map(([dimension, score]) => ({
    dimension: dimension.charAt(0).toUpperCase() + dimension.slice(1),
    score,
    fullName: dimension,
  }))

  // Transform scores for bar chart
  const barData = Object.entries(scores).map(([dimension, score]) => ({
    dimension: dimension.charAt(0).toUpperCase() + dimension.slice(1),
    score,
    fullName: dimension,
  }))

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    if (score >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100'
    if (score >= 6) return 'bg-yellow-100'
    if (score >= 4) return 'bg-orange-100'
    return 'bg-red-100'
  }

  const getScoreBorderColor = (score: number) => {
    if (score >= 8) return 'border-green-200'
    if (score >= 6) return 'border-yellow-200'
    if (score >= 4) return 'border-orange-200'
    return 'border-red-200'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 8) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (score >= 6) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Overall Performance</h3>
          <p className="card-description">Radar chart showing scores across all dimensions</p>
        </div>
        <div className="card-content">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" />
                <PolarRadiusAxis angle={90} domain={[0, 10]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Dimension Scores</h3>
          <p className="card-description">Detailed breakdown of each dimension</p>
        </div>
        <div className="card-content">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dimension" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(scores).map(([dimension, score]) => (
          <div
            key={dimension}
            className={`card cursor-pointer transition-all hover:shadow-md ${
              selectedDimension === dimension ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedDimension(selectedDimension === dimension ? null : dimension)}
          >
            <div className="card-content">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 capitalize">
                  {dimension.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                {getScoreIcon(score)}
              </div>
              
              <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(1)}
              </div>
              
              <div className={`mt-2 p-2 rounded text-sm ${getScoreBgColor(score)} ${getScoreBorderColor(score)} border`}>
                {explanations[dimension] || 'No explanation available'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Explanation */}
      {selectedDimension && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title capitalize">
              {selectedDimension.replace(/([A-Z])/g, ' $1').trim()} - Detailed Analysis
            </h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Score: {scores[selectedDimension].toFixed(1)}/10</h4>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(scores[selectedDimension])} ${getScoreColor(scores[selectedDimension])}`}>
                  {scores[selectedDimension] >= 8 ? 'Excellent' : 
                   scores[selectedDimension] >= 6 ? 'Good' : 
                   scores[selectedDimension] >= 4 ? 'Needs Improvement' : 'Poor'}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Explanation</h4>
                <p className="text-gray-700">
                  {explanations[selectedDimension] || 'No detailed explanation available for this dimension.'}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Recommendations</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {scores[selectedDimension] < 6 && (
                    <>
                      <li>Review and improve the content in this area</li>
                      <li>Consider adding more specific examples or data</li>
                      <li>Ensure clarity and conciseness in messaging</li>
                    </>
                  )}
                  {scores[selectedDimension] >= 6 && scores[selectedDimension] < 8 && (
                    <>
                      <li>Good foundation, consider minor improvements</li>
                      <li>Add more compelling evidence or examples</li>
                    </>
                  )}
                  {scores[selectedDimension] >= 8 && (
                    <li>Excellent work in this dimension!</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
