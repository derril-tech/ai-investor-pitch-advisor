'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Download, Trash2, Edit3, CheckCircle, AlertCircle } from 'lucide-react'

interface QAPair {
  id: string
  question: string
  category: string
  confidence: number
  slideRefs: number[]
  needsExtraInfo: boolean
  answer?: string
  answeredAt?: string
  createdAt: string
  updatedAt: string
}

interface QASession {
  id: string
  name: string
  deckId: string
  sector: string
  stage: string
  status: string
  questionCount: number
  createdAt: string
  updatedAt: string
  completedAt?: string
  questions: QAPair[]
}

interface QASessionProps {
  session: QASession
  onAnswerSubmit?: (questionId: string, answer: string) => void
  onDelete?: (sessionId: string) => void
  onExport?: (sessionId: string) => void
}

export default function QASession({ session, onAnswerSubmit, onDelete, onExport }: QASessionProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [editingAnswer, setEditingAnswer] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  const startEditing = (questionId: string, currentAnswer?: string) => {
    setEditingAnswer(questionId)
    setAnswerText(currentAnswer || '')
  }

  const submitAnswer = () => {
    if (editingAnswer && answerText.trim()) {
      onAnswerSubmit?.(editingAnswer, answerText.trim())
      setEditingAnswer(null)
      setAnswerText('')
    }
  }

  const cancelEditing = () => {
    setEditingAnswer(null)
    setAnswerText('')
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      market: 'bg-blue-100 text-blue-800',
      competition: 'bg-purple-100 text-purple-800',
      business_model: 'bg-green-100 text-green-800',
      financials: 'bg-yellow-100 text-yellow-800',
      team: 'bg-pink-100 text-pink-800',
      technology: 'bg-indigo-100 text-indigo-800',
      go_to_market: 'bg-orange-100 text-orange-800',
      risks: 'bg-red-100 text-red-800',
      exit_strategy: 'bg-gray-100 text-gray-800',
      funding_use: 'bg-teal-100 text-teal-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = () => {
    switch (session.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'processing':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="card-title">{session.name}</h3>
              <p className="card-description">
                {session.sector} • {session.stage} • {session.questionCount} questions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm text-gray-600 capitalize">{session.status}</span>
            {onExport && (
              <button
                onClick={() => onExport(session.id)}
                className="btn btn-outline btn-sm"
                title="Export Q&A"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(session.id)}
                className="btn btn-outline btn-sm text-red-600 hover:text-red-700"
                title="Delete session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card-content">
        {session.questions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No questions generated yet. Please wait for the session to complete.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {session.questions.map((question) => (
              <div key={question.id} className="border border-gray-200 rounded-lg">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleQuestion(question.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(question.category)}`}>
                          {question.category.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-sm font-medium ${getConfidenceColor(question.confidence)}`}>
                          {Math.round(question.confidence * 100)}% confidence
                        </span>
                        {question.needsExtraInfo && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Needs extra info
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900 font-medium">{question.question}</p>
                      {question.slideRefs.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1">
                          Relevant slides: {question.slideRefs.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {question.answer && (
                        <CheckCircle className="h-4 w-4 text-green-600" title="Answered" />
                      )}
                      <Plus className={`h-4 w-4 text-gray-400 transition-transform ${
                        expandedQuestions.has(question.id) ? 'rotate-45' : ''
                      }`} />
                    </div>
                  </div>
                </div>

                {expandedQuestions.has(question.id) && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {question.answer ? (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Answer:</h4>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-gray-800">{question.answer}</p>
                          {question.answeredAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              Answered on {new Date(question.answeredAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => startEditing(question.id, question.answer)}
                          className="btn btn-outline btn-sm mt-2"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit Answer
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Add Answer:</h4>
                        {editingAnswer === question.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="Enter your answer..."
                              className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                              rows={3}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={submitAnswer}
                                className="btn btn-primary btn-sm"
                              >
                                Save Answer
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="btn btn-outline btn-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(question.id)}
                            className="btn btn-outline btn-sm"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Answer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
