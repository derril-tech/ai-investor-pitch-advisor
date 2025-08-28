'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Eye,
  EyeOff,
  Filter,
  BookOpen,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  MessageSquare
} from 'lucide-react';

interface QAPair {
  id: string;
  question: string;
  category: string;
  confidence: number;
  slideRefs: number[];
  needsExtraInfo: boolean;
  draftAnswer?: string;
  answerConfidence?: number;
  followUpQuestions?: string[];
  answer?: string;
  answeredAt?: string;
}

interface QAFlashcardsProps {
  qaPairs: QAPair[];
  slides: Array<{ id: string; title: string; content: string }>;
  onAnswer: (questionId: string, answer: string) => Promise<void>;
  onRevealAnswer: (questionId: string) => void;
}

export default function QAFlashcards({
  qaPairs,
  slides,
  onAnswer,
  onRevealAnswer
}: QAFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [revealedCards, setRevealedCards] = useState<Set<string>>(new Set());
  const [answeredCards, setAnsweredCards] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered' | 'high_confidence' | 'needs_info'>('all');
  const [showSlidePopover, setShowSlidePopover] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter QA pairs based on current filter
  const filteredPairs = qaPairs.filter(pair => {
    switch (filter) {
      case 'unanswered':
        return !answeredCards.has(pair.id);
      case 'answered':
        return answeredCards.has(pair.id);
      case 'high_confidence':
        return pair.confidence >= 0.8;
      case 'needs_info':
        return pair.needsExtraInfo;
      default:
        return true;
    }
  });

  const currentPair = filteredPairs[currentIndex];
  const progress = filteredPairs.length > 0 ? ((currentIndex + 1) / filteredPairs.length) * 100 : 0;

  useEffect(() => {
    // Reset state when filter changes
    setCurrentIndex(0);
    setShowAnswer(false);
    setUserAnswer('');
  }, [filter]);

  const nextCard = () => {
    if (currentIndex < filteredPairs.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setUserAnswer('');
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
      setUserAnswer('');
    }
  };

  const revealAnswer = () => {
    if (currentPair) {
      setShowAnswer(true);
      setRevealedCards(prev => new Set([...prev, currentPair.id]));
      onRevealAnswer(currentPair.id);
    }
  };

  const submitAnswer = async () => {
    if (!currentPair || !userAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAnswer(currentPair.id, userAnswer.trim());
      setAnsweredCards(prev => new Set([...prev, currentPair.id]));
      setUserAnswer('');
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCard = () => {
    setShowAnswer(false);
    setUserAnswer('');
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'market':
        return <Target size={16} className="text-blue-600" />;
      case 'competition':
        return <AlertTriangle size={16} className="text-orange-600" />;
      case 'financials':
        return <BookOpen size={16} className="text-green-600" />;
      case 'team':
        return <MessageSquare size={16} className="text-purple-600" />;
      default:
        return <MessageSquare size={16} className="text-gray-600" />;
    }
  };

  const getReferencedSlides = (slideRefs: number[]) => {
    return slideRefs.map(ref => {
      const slideIndex = ref - 1; // Convert to 0-based index
      if (slideIndex >= 0 && slideIndex < slides.length) {
        return slides[slideIndex];
      }
      return null;
    }).filter(Boolean);
  };

  if (filteredPairs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <BookOpen size={48} className="text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Q&A cards available</h3>
        <p className="text-gray-600">
          {filter === 'unanswered' ? 'All questions have been answered!' :
           filter === 'answered' ? 'No answered questions yet.' :
           filter === 'high_confidence' ? 'No high-confidence questions available.' :
           filter === 'needs_info' ? 'No questions need additional information.' :
           'Generate some Q&A sessions first.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header with filters and progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Q&A Flashcards</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter size={16} className="text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Questions</option>
                <option value="unanswered">Unanswered</option>
                <option value="answered">Answered</option>
                <option value="high_confidence">High Confidence</option>
                <option value="needs_info">Needs Info</option>
              </select>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{currentIndex + 1} of {filteredPairs.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>

      {/* Main flashcard */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
        {currentPair && (
          <>
            {/* Question side */}
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(currentPair.category)}
                  <div>
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                      {currentPair.category}
                    </span>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-sm font-medium ${getConfidenceColor(currentPair.confidence)}`}>
                        {Math.round(currentPair.confidence * 100)}% confidence
                      </span>
                      {currentPair.needsExtraInfo && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                          <AlertTriangle size={12} className="mr-1" />
                          Needs Info
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Slide references */}
                {currentPair.slideRefs.length > 0 && (
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowSlidePopover(currentPair.id)}
                      onMouseLeave={() => setShowSlidePopover(null)}
                      className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <BookOpen size={14} />
                      <span>{currentPair.slideRefs.length} slide{currentPair.slideRefs.length !== 1 ? 's' : ''}</span>
                    </button>

                    {/* Slide popover */}
                    {showSlidePopover === currentPair.id && (
                      <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Referenced Slides</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {getReferencedSlides(currentPair.slideRefs).map((slide, idx) => (
                            <div key={idx} className="border-l-4 border-blue-500 pl-3 py-2">
                              <div className="font-medium text-sm text-gray-900">
                                Slide {currentPair.slideRefs[idx]}: {slide.title}
                              </div>
                              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                {slide.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Question</h3>
                <p className="text-lg text-gray-700 leading-relaxed">{currentPair.question}</p>
              </div>

              {/* User answer input */}
              {!showAnswer && !answeredCards.has(currentPair.id) && (
                <div className="space-y-4">
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    disabled={isSubmitting}
                  />

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={submitAnswer}
                      disabled={!userAnswer.trim() || isSubmitting}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle size={16} />
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Answer'}</span>
                    </button>

                    <button
                      onClick={revealAnswer}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      <Eye size={16} />
                      <span>Reveal Answer</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {showAnswer || answeredCards.has(currentPair.id) ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={revealAnswer}
                    disabled={showAnswer}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Eye size={16} />
                    <span>{showAnswer ? 'Answer Revealed' : 'Reveal Answer'}</span>
                  </button>

                  <button
                    onClick={resetCard}
                    className="flex items-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                  >
                    <RotateCcw size={16} />
                    <span>Try Again</span>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Answer side */}
            {showAnswer && (
              <div className="border-t border-gray-200 bg-gray-50 p-8">
                <div className="space-y-6">
                  {/* Draft answer */}
                  {currentPair.draftAnswer && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Target size={16} className="mr-2 text-blue-600" />
                        Suggested Answer
                        {currentPair.answerConfidence && (
                          <span className={`ml-2 text-sm ${getConfidenceColor(currentPair.answerConfidence)}`}>
                            ({Math.round(currentPair.answerConfidence * 100)}% confidence)
                          </span>
                        )}
                      </h4>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">{currentPair.draftAnswer}</p>
                      </div>
                    </div>
                  )}

                  {/* User's previous answer */}
                  {answeredCards.has(currentPair.id) && currentPair.answer && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <CheckCircle size={16} className="mr-2 text-green-600" />
                        Your Answer
                      </h4>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-gray-700 leading-relaxed">{currentPair.answer}</p>
                        {currentPair.answeredAt && (
                          <p className="text-sm text-gray-500 mt-2 flex items-center">
                            <Clock size={12} className="mr-1" />
                            Answered {new Date(currentPair.answeredAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Follow-up questions */}
                  {currentPair.followUpQuestions && currentPair.followUpQuestions.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Follow-up Questions</h4>
                      <div className="space-y-2">
                        {currentPair.followUpQuestions.map((followUp, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                            <p className="text-gray-700">{followUp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={prevCard}
          disabled={currentIndex === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Card {currentIndex + 1} of {filteredPairs.length}</span>
          <span>•</span>
          <span>
            {answeredCards.size} answered, {revealedCards.size} revealed
          </span>
        </div>

        <button
          onClick={nextCard}
          disabled={currentIndex === filteredPairs.length - 1}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
