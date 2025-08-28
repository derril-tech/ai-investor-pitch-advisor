'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, BarChart3, MessageSquare } from 'lucide-react'

export default function Home() {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/pdf': ['.pdf'],
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        await handleFileUpload(acceptedFiles[0])
      }
    },
  })

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // TODO: Implement actual file upload to API
      await new Promise(resolve => setTimeout(resolve, 2000))

      clearInterval(interval)
      setUploadProgress(100)

      // TODO: Navigate to deck analysis page
      console.log('File uploaded:', file.name)

    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                AI Investor Pitch Advisor
              </h1>
            </div>
            <nav className="flex space-x-8">
              <a href="#" className="text-gray-500 hover:text-gray-900">Dashboard</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Projects</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">Help</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Upload Your Pitch Deck
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant AI-driven feedback on clarity, design, investor focus—plus tailored Q&A prep for meetings.
          </p>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 mb-2">
              {isDragActive
                ? 'Drop your pitch deck here...'
                : 'Drag & drop your pitch deck, or click to select'}
            </p>
            <p className="text-sm text-gray-500">
              Supports PPTX and PDF files up to 50MB
            </p>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Uploading...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Smart Analysis
            </h3>
            <p className="text-gray-600">
              AI-powered analysis of your pitch deck's clarity, design, and investor appeal.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Detailed Insights
            </h3>
            <p className="text-gray-600">
              Get actionable suggestions for improving your pitch deck's effectiveness.
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Q&A Preparation
            </h3>
            <p className="text-gray-600">
              Prepare for investor meetings with AI-generated questions and suggested answers.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
