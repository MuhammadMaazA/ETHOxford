'use client';

import { useState } from 'react';
import { Loader2, Info, X, Bot, ShieldCheck, AlertTriangle } from 'lucide-react';

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  aiProbability: number;
  deepfakeProbability: number;
  qualityScore: number;
  detectedType?: string;
  processingTime: number;
  error?: string;
}

interface AIDetectionBadgeProps {
  result: AIDetectionResult | null;
  isLoading?: boolean;
  showDetails?: boolean;
  compact?: boolean;
}

export function AIDetectionBadge({ 
  result, 
  isLoading = false,
  showDetails = true,
  compact = false,
}: AIDetectionBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Analyzing for AI content...</span>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if (result.error && result.confidence === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <Info className="w-4 h-4" />
        <span>AI detection unavailable</span>
      </div>
    );
  }

  const getBadgeStyles = () => {
    if (result.confidence < 30) {
      return {
        container: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
        text: 'text-green-700 dark:text-green-400',
        icon: <ShieldCheck className="w-4 h-4" />,
        label: 'Likely Authentic',
      };
    }
    if (result.confidence < 70) {
      return {
        container: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: <AlertTriangle className="w-4 h-4" />,
        label: 'Uncertain',
      };
    }
    return {
      container: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-400',
      icon: <Bot className="w-4 h-4" />,
      label: 'AI-Generated',
    };
  };

  const styles = getBadgeStyles();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border ${styles.container}`}>
        {styles.icon}
        <span className={`text-xs font-medium ${styles.text}`}>
          {result.confidence}% AI
        </span>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-xl p-4 border ${styles.container}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              result.confidence < 30 ? 'bg-green-100 dark:bg-green-500/20' :
              result.confidence < 70 ? 'bg-yellow-100 dark:bg-yellow-500/20' :
              'bg-red-100 dark:bg-red-500/20'
            }`}>
              {styles.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${styles.text}`}>
                  AI Detection: {result.confidence}%
                </span>
                <span className={`text-sm ${styles.text} opacity-75`}>
                  ({styles.label})
                </span>
              </div>
              {result.detectedType && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {result.detectedType}
                </p>
              )}
            </div>
          </div>
          {showDetails && (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
            >
              Details
            </button>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                AI Detection Analysis
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Main Score */}
              <div className="text-center py-4">
                <div className={`text-4xl font-bold ${styles.text}`}>
                  {result.confidence}%
                </div>
                <div className="text-sm text-neutral-500 mt-1">
                  AI Generation Probability
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    result.confidence < 30 ? 'bg-green-500' :
                    result.confidence < 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${result.confidence}%` }}
                />
              </div>

              {/* Breakdown */}
              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">AI Probability</span>
                  <span className="text-neutral-900 dark:text-white font-medium">
                    {Math.round(result.aiProbability * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Deepfake Score</span>
                  <span className="text-neutral-900 dark:text-white font-medium">
                    {Math.round(result.deepfakeProbability * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Quality Score</span>
                  <span className="text-neutral-900 dark:text-white font-medium">
                    {Math.round(result.qualityScore * 100)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Processing Time</span>
                  <span className="text-neutral-900 dark:text-white font-medium">
                    {Math.round(result.processingTime)}ms
                  </span>
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mt-4">
                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  What this means
                </h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {result.confidence < 30 ? (
                    'This image appears to be authentic content, likely captured by a camera or created through traditional means.'
                  ) : result.confidence < 70 ? (
                    'The analysis is inconclusive. This image may contain some AI-assisted elements or processing artifacts that make determination difficult.'
                  ) : (
                    'This image shows strong indicators of being generated by AI tools like Midjourney, DALL-E, Stable Diffusion, or similar systems.'
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-6 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
