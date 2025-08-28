'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { SlideBadges } from './SlideBadge'

interface Slide {
  id: string
  slideNumber: number
  title: string
  content?: string
  notes?: string
  imageUrl?: string
  scores?: Record<string, number>
  suggestions?: string[]
  warnings?: string[]
  info?: string[]
}

interface DeckViewerProps {
  slides: Slide[]
  deckName: string
  onBadgeClick?: (type: string, value?: any) => void
}

export default function DeckViewer({ slides, deckName, onBadgeClick }: DeckViewerProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [zoom, setZoom] = useState(1)

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const zoomIn = () => {
    setZoom(Math.min(zoom + 0.1, 2))
  }

  const zoomOut = () => {
    setZoom(Math.max(zoom - 0.1, 0.5))
  }

  const slide = slides[currentSlide]

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{deckName}</h1>
            <p className="text-sm text-gray-500">
              Slide {currentSlide + 1} of {slides.length}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={zoomOut}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Slide Navigation */}
        <div className="w-64 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Slides</h3>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    index === currentSlide
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-6 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">
                      {slide.slideNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {slide.title}
                      </p>
                      {slide.content && (
                        <p className="text-xs text-gray-500 truncate">
                          {slide.content.substring(0, 50)}...
                        </p>
                      )}
                      {/* Slide Badges */}
                      {(slide.scores || slide.suggestions || slide.warnings || slide.info) && (
                        <div className="mt-2">
                          <SlideBadges
                            scores={slide.scores}
                            suggestions={slide.suggestions}
                            warnings={slide.warnings}
                            info={slide.info}
                            onBadgeClick={onBadgeClick}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Slide Display */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative">
            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            {/* Slide Content */}
            <div
              className="bg-white rounded-lg shadow-lg overflow-hidden relative"
              style={{
                width: `${16 * 50 * zoom}px`,
                height: `${9 * 50 * zoom}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'center',
              }}
            >
              {/* Slide Badges Overlay */}
              {(slide.scores || slide.suggestions || slide.warnings || slide.info) && (
                <div className="absolute top-4 right-4 z-10">
                  <SlideBadges
                    scores={slide.scores}
                    suggestions={slide.suggestions}
                    warnings={slide.warnings}
                    info={slide.info}
                    onBadgeClick={onBadgeClick}
                  />
                </div>
              )}
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slide.slideNumber}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full p-8 flex flex-col">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {slide.title}
                  </h2>
                  {slide.content && (
                    <div className="flex-1 text-gray-700 whitespace-pre-wrap">
                      {slide.content}
                    </div>
                  )}
                  {slide.notes && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Notes:</strong> {slide.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            {slide.notes && (
              <span className="mr-4">
                <span className="font-medium">Notes:</span> {slide.notes}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>Slide {slide.slideNumber}</span>
            <span>•</span>
            <span>{slides.length} total slides</span>
          </div>
        </div>
      </div>
    </div>
  )
}
