/**
 * Planner Guide - Mobile View
 * 
 * Phase 9: Mobile-first Planner feature guide using full screen.
 * Shows feature index first, then allows navigation between features.
 */

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { PlannerGuideCard } from './PlannerGuideCard';
import { PlannerFeaturesIndex } from './PlannerFeaturesIndex';
import { getPlannerGuideItem, getAllPlannerGuideItems, type PlannerGuideItem } from './plannerGuideContent';

interface PlannerGuideMobileProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  featureId?: string;
}

export function PlannerGuideMobile({
  isOpen,
  onClose,
  onBack,
  featureId: initialFeatureId,
}: PlannerGuideMobileProps) {
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(initialFeatureId || null);
  const features = getAllPlannerGuideItems();
  const currentFeature = selectedFeatureId ? getPlannerGuideItem(selectedFeatureId) : null;
  const currentIndex = selectedFeatureId ? features.findIndex(f => f.id === selectedFeatureId) : -1;

  if (!isOpen) return null;

  const handleSelectFeature = (featureId: string) => {
    setSelectedFeatureId(featureId);
  };

  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < features.length - 1) {
      setSelectedFeatureId(features[currentIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSelectedFeatureId(features[currentIndex - 1].id);
    }
  };

  const handleBackToIndex = () => {
    setSelectedFeatureId(null);
  };

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
            {selectedFeatureId ? (
              <button
                onClick={handleBackToIndex}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to features"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
            ) : onBack ? (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>
            ) : null}
            <h2 className="text-xl font-semibold text-gray-900">
              {currentFeature ? currentFeature.title : 'Planner Features'}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto">
            {currentFeature ? (
              <>
                <PlannerGuideCard feature={currentFeature} variant="mobile" />
                
                {/* Quick Navigation to Other Features */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Other Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {features
                      .filter(f => f.id !== selectedFeatureId)
                      .slice(0, 6)
                      .map(feature => (
                        <button
                          key={feature.id}
                          onClick={() => handleSelectFeature(feature.id)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                          <span>{feature.icon}</span>
                          <span>{feature.title}</span>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <PlannerFeaturesIndex
                features={features}
                onSelectFeature={handleSelectFeature}
                variant="mobile"
              />
            )}
          </div>
        </div>

        {/* Navigation Arrows (only when viewing a feature) */}
        {currentFeature && (
          <div className="sticky bottom-0 flex items-center justify-between px-4 py-4 border-t border-gray-200 bg-gray-50 safe-bottom">
            <button
              onClick={handlePrevious}
              disabled={currentIndex <= 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
                currentIndex <= 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft size={20} />
              <span className="text-sm font-medium">Previous</span>
            </button>

            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {features.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex >= features.length - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors min-h-[44px] ${
                currentIndex >= features.length - 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="text-sm font-medium">Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
