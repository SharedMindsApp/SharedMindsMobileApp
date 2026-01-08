/**
 * Shared Spaces Guide - Mobile View
 * 
 * Phase 9: Mobile-first Shared Spaces guide using full screen with swipeable sections.
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { SharedSpacesGuideCard } from './SharedSpacesGuideCard';
import { getAllSharedSpacesGuideSections, type SharedSpacesGuideSection } from './sharedSpacesGuideContent';

interface SharedSpacesGuideMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

export function SharedSpacesGuideMobile({
  isOpen,
  onClose,
  onBack,
}: SharedSpacesGuideMobileProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sections = getAllSharedSpacesGuideSections();

  const currentSection = sections[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === sections.length - 1;

  function handleNext() {
    if (!isLast) {
      setCurrentIndex(prev => prev + 1);
    }
  }

  function handlePrevious() {
    if (!isFirst) {
      setCurrentIndex(prev => prev - 1);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Full Screen Modal */}
      <div className="fixed inset-0 z-50 flex flex-col bg-white safe-top safe-bottom">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10 safe-top">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              About Shared Spaces
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
          {sections.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-8 bg-blue-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Card Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            <SharedSpacesGuideCard section={currentSection} variant="mobile" />
          </div>
        </div>

        {/* Navigation */}
        <div className="sticky bottom-0 flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50 safe-bottom">
          <button
            onClick={handlePrevious}
            disabled={isFirst}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
              isFirst
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-medium">Previous</span>
          </button>

          <span className="text-sm text-gray-500">
            {currentIndex + 1} of {sections.length}
          </span>

          <button
            onClick={handleNext}
            disabled={isLast}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
              isLast
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-sm font-medium">Next</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </>
  );
}
