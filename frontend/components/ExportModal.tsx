'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deckId: string;
  hasAnalysis: boolean;
  hasQASessions: boolean;
  onExport: (options: ExportOptions) => Promise<void>;
}

interface ExportOptions {
  format: 'pdf' | 'pptx' | 'docx';
  type: 'analysis_report' | 'qa_summary' | 'comprehensive_report';
  includeAnalysis: boolean;
  includeQA: boolean;
  qaSessionId?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  deckId,
  hasAnalysis,
  hasQASessions,
  onExport
}: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    type: 'analysis_report',
    includeAnalysis: hasAnalysis,
    includeQA: false
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleExport = async () => {
    if (!isOpen) return;
    
    setIsExporting(true);
    setExportStatus('exporting');
    setExportProgress(0);
    setErrorMessage('');

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onExport(exportOptions);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      setExportStatus('success');
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        setExportStatus('idle');
        setExportProgress(0);
      }, 2000);
      
    } catch (error) {
      setExportStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onClose();
      setExportStatus('idle');
      setExportProgress(0);
      setErrorMessage('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Export Report</h2>
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'pdf', label: 'PDF', icon: FileText },
                { value: 'pptx', label: 'PowerPoint', icon: FileSpreadsheet },
                { value: 'docx', label: 'Word', icon: FileText }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setExportOptions(prev => ({ ...prev, format: value as any }))}
                  className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                    exportOptions.format === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={isExporting}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Report Type
            </label>
            <select
              value={exportOptions.type}
              onChange={(e) => setExportOptions(prev => ({ ...prev, type: e.target.value as any }))}
              disabled={isExporting}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="analysis_report">Analysis Report</option>
              {hasQASessions && <option value="qa_summary">Q&A Summary</option>}
              {hasAnalysis && hasQASessions && (
                <option value="comprehensive_report">Comprehensive Report</option>
              )}
            </select>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Include Content
            </label>
            
            {hasAnalysis && (
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeAnalysis}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeAnalysis: e.target.checked }))}
                  disabled={isExporting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Analysis & Scores</span>
              </label>
            )}
            
            {hasQASessions && (
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions.includeQA}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeQA: e.target.checked }))}
                  disabled={isExporting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Q&A Sessions</span>
              </label>
            )}
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Generating export...</span>
                <span className="text-gray-600">{exportProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Messages */}
          {exportStatus === 'success' && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle size={16} />
              <span className="text-sm">Export completed successfully!</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle size={16} />
              <span className="text-sm">{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
