'use client'

import { useState, useEffect } from 'react'
import { Upload, BarChart3, MessageSquare, Download, Plus, Settings, User } from 'lucide-react'
import DeckViewer from '@/components/DeckViewer'
import ScoreDashboard from '@/components/ScoreDashboard'
import QASession from '@/components/QASession'

interface Deck {
  id: string
  name: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  slideCount: number
}

interface Analysis {
  id: string
  deckId: string
  status: string
  scores: {
    clarity: number
    design: number
    storytelling: number
    investorFit: number
  }
  explanations: {
    clarity: string
    design: string
    storytelling: string
    investorFit: string
  }
  createdAt: string
}

interface QASessionData {
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
  questions: any[]
}

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [qaSessions, setQaSessions] = useState<QASessionData[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'qa' | 'export'>('overview')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCreatingQA, setIsCreatingQA] = useState(false)

  // Mock data for demonstration
  useEffect(() => {
    // Simulate loading decks
    const mockDecks: Deck[] = [
      {
        id: '1',
        name: 'Tech Startup Pitch Deck',
        description: 'Series A funding pitch for AI-powered SaaS platform',
        status: 'completed',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:35:00Z',
        slideCount: 12
      },
      {
        id: '2',
        name: 'Healthcare Innovation Deck',
        description: 'Seed round pitch for telemedicine platform',
        status: 'completed',
        createdAt: '2024-01-14T14:20:00Z',
        updatedAt: '2024-01-14T14:25:00Z',
        slideCount: 15
      }
    ]
    setDecks(mockDecks)

    // Mock analysis data
    const mockAnalysis: Analysis = {
      id: '1',
      deckId: '1',
      status: 'completed',
      scores: {
        clarity: 8.5,
        design: 7.8,
        storytelling: 9.2,
        investorFit: 8.7
      },
      explanations: {
        clarity: 'The deck clearly communicates the problem, solution, and market opportunity. Key metrics are well-presented.',
        design: 'Good visual hierarchy and consistent branding. Some slides could benefit from more whitespace.',
        storytelling: 'Excellent narrative flow from problem to solution to market opportunity. Strong emotional appeal.',
        investorFit: 'Well-positioned for Series A investors with clear growth metrics and competitive advantages.'
      },
      createdAt: '2024-01-15T10:40:00Z'
    }
    setAnalysis(mockAnalysis)

    // Mock Q&A sessions
    const mockQASessions: QASessionData[] = [
      {
        id: '1',
        name: 'Investor Q&A Session',
        deckId: '1',
        sector: 'Technology',
        stage: 'Series A',
        status: 'completed',
        questionCount: 20,
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:05:00Z',
        completedAt: '2024-01-15T11:05:00Z',
        questions: [
          {
            id: '1',
            question: 'What is your total addressable market (TAM) and how did you calculate it?',
            category: 'market',
            confidence: 0.85,
            slideRefs: [3, 4],
            needsExtraInfo: false,
            answer: 'Our TAM is $50B based on the global SaaS market for SMBs. We calculated this using industry reports and our target customer segments.',
            answeredAt: '2024-01-15T11:10:00Z',
            createdAt: '2024-01-15T11:05:00Z',
            updatedAt: '2024-01-15T11:10:00Z'
          }
        ]
      }
    ]
    setQaSessions(mockQASessions)
  }, [])

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploading(false)
          return 100
        }
        return prev + 10
      })
    }, 200)

    // Simulate API call
    setTimeout(() => {
      const newDeck: Deck = {
        id: Date.now().toString(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        description: 'Newly uploaded deck',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slideCount: Math.floor(Math.random() * 20) + 5
      }
      setDecks(prev => [newDeck, ...prev])
      setSelectedDeck(newDeck)
      setIsUploading(false)
    }, 2000)
  }

  const handleRunAnalysis = async () => {
    if (!selectedDeck) return

    setIsAnalyzing(true)

    // Simulate analysis
    setTimeout(() => {
      const newAnalysis: Analysis = {
        id: Date.now().toString(),
        deckId: selectedDeck.id,
        status: 'completed',
        scores: {
          clarity: Math.random() * 3 + 7,
          design: Math.random() * 3 + 7,
          storytelling: Math.random() * 3 + 7,
          investorFit: Math.random() * 3 + 7
        },
        explanations: {
          clarity: 'Analysis completed for clarity dimension.',
          design: 'Analysis completed for design dimension.',
          storytelling: 'Analysis completed for storytelling dimension.',
          investorFit: 'Analysis completed for investor fit dimension.'
        },
        createdAt: new Date().toISOString()
      }
      setAnalysis(newAnalysis)
      setIsAnalyzing(false)
      setActiveTab('analysis')
    }, 3000)
  }

  const handleCreateQASession = async () => {
    if (!selectedDeck) return

    setIsCreatingQA(true)

    // Simulate Q&A session creation
    setTimeout(() => {
      const newQASession: QASessionData = {
        id: Date.now().toString(),
        name: 'Investor Q&A Session',
        deckId: selectedDeck.id,
        sector: 'Technology',
        stage: 'Series A',
        status: 'completed',
        questionCount: 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        questions: [
          {
            id: '1',
            question: 'What is your competitive advantage?',
            category: 'competition',
            confidence: 0.8,
            slideRefs: [5, 6],
            needsExtraInfo: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      }
      setQaSessions(prev => [newQASession, ...prev])
      setIsCreatingQA(false)
      setActiveTab('qa')
    }, 2000)
  }

  const handleAnswerSubmit = async (questionId: string, answer: string) => {
    // Simulate API call to save answer
    console.log('Saving answer:', { questionId, answer })
  }

  const handleExport = async (sessionId: string) => {
    // Simulate export generation
    console.log('Exporting Q&A session:', sessionId)
  }

  const handleDeleteQASession = async (sessionId: string) => {
    setQaSessions(prev => prev.filter(session => session.id !== sessionId))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Pitch Advisor Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Settings className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Decks</h2>
              
              {/* Upload Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Deck
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept=".pptx,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      {isUploading ? 'Uploading...' : 'Click to upload'}
                    </p>
                  </label>
                </div>
                {isUploading && (
                  <div className="mt-2">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                  </div>
                )}
              </div>

              {/* Deck List */}
              <div className="space-y-2">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    onClick={() => setSelectedDeck(deck)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedDeck?.id === deck.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 truncate">{deck.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{deck.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">
                        {new Date(deck.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-gray-400">{deck.slideCount} slides</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedDeck ? (
              <div className="space-y-6">
                {/* Deck Header */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedDeck.name}</h2>
                      <p className="text-gray-600">{selectedDeck.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className="btn btn-primary"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                      </button>
                      <button
                        onClick={handleCreateQASession}
                        disabled={isCreatingQA}
                        className="btn btn-outline"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {isCreatingQA ? 'Creating...' : 'Create Q&A'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                      {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'analysis', label: 'Analysis', icon: BarChart3 },
                        { id: 'qa', label: 'Q&A Sessions', icon: MessageSquare },
                        { id: 'export', label: 'Export', icon: Download }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <tab.icon className="h-4 w-4 mr-2" />
                          {tab.label}
                        </button>
                      ))}
                    </nav>
                  </div>

                  <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                      <div className="space-y-6">
                        {analysis && <ScoreDashboard scores={analysis.scores} explanations={analysis.explanations} />}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Recent Activity</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              <p>• Analysis completed on {new Date(analysis?.createdAt || '').toLocaleDateString()}</p>
                              <p>• Q&A session created</p>
                              <p>• Deck uploaded</p>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
                            <div className="space-y-2">
                              <button className="btn btn-outline btn-sm w-full justify-start">
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Q&A Session
                              </button>
                              <button className="btn btn-outline btn-sm w-full justify-start">
                                <Download className="h-4 w-4 mr-2" />
                                Export Analysis Report
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analysis Tab */}
                    {activeTab === 'analysis' && analysis && (
                      <ScoreDashboard scores={analysis.scores} explanations={analysis.explanations} />
                    )}

                    {/* Q&A Tab */}
                    {activeTab === 'qa' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">Q&A Sessions</h3>
                          <button
                            onClick={handleCreateQASession}
                            disabled={isCreatingQA}
                            className="btn btn-primary btn-sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {isCreatingQA ? 'Creating...' : 'New Session'}
                          </button>
                        </div>
                        {qaSessions.length === 0 ? (
                          <div className="text-center py-12">
                            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No Q&A sessions yet</h3>
                            <p className="text-gray-600 mb-4">Create your first Q&A session to prepare for investor meetings.</p>
                            <button
                              onClick={handleCreateQASession}
                              disabled={isCreatingQA}
                              className="btn btn-primary"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {isCreatingQA ? 'Creating...' : 'Create Q&A Session'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {qaSessions.map((session) => (
                              <QASession
                                key={session.id}
                                session={session}
                                onAnswerSubmit={handleAnswerSubmit}
                                onDelete={handleDeleteQASession}
                                onExport={handleExport}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Export Tab */}
                    {activeTab === 'export' && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border border-gray-200 rounded-lg p-6">
                            <h4 className="font-medium text-gray-900 mb-2">Analysis Report</h4>
                            <p className="text-sm text-gray-600 mb-4">Export detailed analysis with scores and explanations.</p>
                            <div className="space-y-2">
                              <button className="btn btn-outline btn-sm w-full justify-start">
                                <Download className="h-4 w-4 mr-2" />
                                Export as PDF
                              </button>
                              <button className="btn btn-outline btn-sm w-full justify-start">
                                <Download className="h-4 w-4 mr-2" />
                                Export as PPTX
                              </button>
                            </div>
                          </div>
                          <div className="border border-gray-200 rounded-lg p-6">
                            <h4 className="font-medium text-gray-900 mb-2">Q&A Summary</h4>
                            <p className="text-sm text-gray-600 mb-4">Export Q&A sessions with questions and answers.</p>
                            <div className="space-y-2">
                              <button className="btn btn-outline btn-sm w-full justify-start">
                                <Download className="h-4 w-4 mr-2" />
                                Export as PDF
                              </button>
                              <button className="btn btn-outline btn-sm w-full justify-start">
                                <Download className="h-4 w-4 mr-2" />
                                Export as Word
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No deck selected</h3>
                <p className="text-gray-600 mb-6">Upload a pitch deck to get started with analysis and Q&A preparation.</p>
                <label className="btn btn-primary cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Deck
                  <input
                    type="file"
                    accept=".pptx,.pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
