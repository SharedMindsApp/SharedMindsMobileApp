/**
 * useCalendarGestures Hook
 * 
 * Shared hook for swipe gesture handling in calendar views.
 * Enables swipe left/right to navigate between days/weeks.
 */

import { useState, useCallback, useRef } from 'react';

export function useCalendarGestures(
  onSwipeLeft: () => void,
  onSwipeRight: () => void
) {
  const [swipeStart, setSwipeStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    });
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStart) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStart.x;
    const deltaY = touch.clientY - swipeStart.y;

    // Only handle horizontal swipes (ignore if vertical movement is greater)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      setSwipeOffset(deltaX);
      e.preventDefault();
    }
  }, [swipeStart]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeStart) return;

    const deltaX = swipeOffset;
    const threshold = 50; // Minimum swipe distance
    const timeDelta = Date.now() - swipeStart.time;
    const maxTime = 300; // Maximum swipe time in ms

    if (Math.abs(deltaX) > threshold && timeDelta < maxTime) {
      if (deltaX > 0) {
        // Swipe right - go to previous
        onSwipeRight();
      } else {
        // Swipe left - go to next
        onSwipeLeft();
      }
    }

    setSwipeStart(null);
    setSwipeOffset(0);
  }, [swipeStart, swipeOffset, onSwipeLeft, onSwipeRight]);

  return {
    containerRef,
    swipeOffset,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
