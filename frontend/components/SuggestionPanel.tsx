'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Edit3,
  Eye,
  EyeOff,
  Lightbulb,
  TrendingUp,
  Palette,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Target
} from 'lucide-react';

interface Suggestion {
  id: string;
  suggestionType: 'headline_rewrite' | 'structure_fix' | 'design_tip' | 'content_enhancement';
  title: string;
  description: string;
  rationale: string;
  beforeText?: string;
  afterText?: string;
  confidence: number;
  category: string;
  status: 'pending' | 'applied' | 'accepted' | 'rejected' | 'dismissed';
  slideId?: string;
  createdAt: string;
}

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  slideId?: string;
  onAccept: (suggestionId: string, feedback?: string) => Promise<void>;
  onReject: (suggestionId: string, feedback?: string) => Promise<void>;
  onApply: (suggestionId: string) => Promise<void>;
  onEdit: (suggestionId: string, newText: string) => Promise<void>;
}

export default function SuggestionPanel({
  suggestions,
  slideId,
  onAccept,
  onReject,
  onApply,
  onEdit
}: SuggestionPanelProps) {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const [editingSuggestion, setEditingSuggestion] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [processingSuggestion, setProcessingSuggestion] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'applied'>('pending');

  // Filter suggestions based on slide and status
  const filteredSuggestions = suggestions.filter(suggestion => {
    if (slideId && suggestion.slideId !== slideId) return false;
    if (filter === 'pending') return suggestion.status === 'pending';
    if (filter === 'applied') return ['applied', 'accepted'].includes(suggestion.status);
    return true;
  });

  const toggleExpanded = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const startEditing = (suggestion: Suggestion) => {
    setEditingSuggestion(suggestion.id);
    setEditText(suggestion.afterText || '');
  };

  const cancelEditing = () => {
    setEditingSuggestion(null);
    setEditText('');
  };

  const saveEdit = async (suggestionId: string) => {
    if (editText.trim()) {
      await onEdit(suggestionId, editText.trim());
      setEditingSuggestion(null);
      setEditText('');
    }
  };

  const handleAccept = async (suggestionId: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      await onAccept(suggestionId);
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const handleReject = async (suggestionId: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      await onReject(suggestionId);
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const handleApply = async (suggestionId: string) => {
    setProcessingSuggestion(suggestionId);
    try {
      await onApply(suggestionId);
    } finally {
      setProcessingSuggestion(null);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'headline_rewrite':
        return <Edit3 size={16} className="text-blue-600" />;
      case 'structure_fix':
        return <Target size={16} className="text-green-600" />;
      case 'design_tip':
        return <Palette size={16} className="text-purple-600" />;
      case 'content_enhancement':
        return <TrendingUp size={16} className="text-orange-600" />;
      default:
        return <Lightbulb size={16} className="text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
      case 'accepted':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
      case 'dismissed':
        return <XCircle size={16} className="text-red-600" />;
      default:
        return null;
    }
  };

  if (filteredSuggestions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Lightbulb size={24} className="mx-auto mb-2 opacity-50" />
        <p>No suggestions available</p>
        {slideId && <p className="text-sm">for this slide</p>}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Suggestions {slideId ? 'for Slide' : ''}
          </h3>
          <div className="flex items-center space-x-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="applied">Applied</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suggestions list */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredSuggestions.map((suggestion) => (
          <div key={suggestion.id} className="p-4">
            {/* Suggestion header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                {getSuggestionIcon(suggestion.suggestionType)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                    {getStatusIcon(suggestion.status)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-gray-500 capitalize">
                      {suggestion.suggestionType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => toggleExpanded(suggestion.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title={expandedSuggestions.has(suggestion.id) ? "Collapse" : "Expand"}
                >
                  {expandedSuggestions.has(suggestion.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expandedSuggestions.has(suggestion.id) && (
              <div className="mt-4 space-y-4">
                {/* Rationale */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-900 mb-1">Why this suggestion?</h5>
                  <p className="text-sm text-blue-800">{suggestion.rationale}</p>
                </div>

                {/* Before/After comparison */}
                {(suggestion.beforeText || suggestion.afterText) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestion.beforeText && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h5 className="text-sm font-medium text-red-900 mb-1 flex items-center">
                          <ArrowDown size={14} className="mr-1" />
                          Before
                        </h5>
                        <p className="text-sm text-red-800">{suggestion.beforeText}</p>
                      </div>
                    )}

                    {editingSuggestion === suggestion.id ? (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h5 className="text-sm font-medium text-green-900 mb-1 flex items-center">
                          <Edit3 size={14} className="mr-1" />
                          Edit Suggestion
                        </h5>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full text-sm text-green-800 border border-green-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          rows={3}
                        />
                        <div className="flex items-center space-x-2 mt-2">
                          <button
                            onClick={() => saveEdit(suggestion.id)}
                            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            disabled={processingSuggestion === suggestion.id}
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      suggestion.afterText && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <h5 className="text-sm font-medium text-green-900 mb-1 flex items-center">
                            <ArrowUp size={14} className="mr-1" />
                            After
                          </h5>
                          <p className="text-sm text-green-800">{suggestion.afterText}</p>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {suggestion.status === 'pending' && (
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => handleAccept(suggestion.id)}
                      disabled={processingSuggestion === suggestion.id}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      <span>Accept</span>
                    </button>

                    <button
                      onClick={() => startEditing(suggestion)}
                      disabled={processingSuggestion === suggestion.id}
                      className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleReject(suggestion.id)}
                      disabled={processingSuggestion === suggestion.id}
                      className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}

                {suggestion.status === 'accepted' && suggestion.afterText && (
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={() => handleApply(suggestion.id)}
                      disabled={processingSuggestion === suggestion.id}
                      className="flex items-center space-x-1 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      <Target size={14} />
                      <span>Apply to Slide</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
