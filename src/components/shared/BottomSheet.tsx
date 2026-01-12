/**
 * BottomSheet Component
 * 
 * Mobile-first bottom sheet that slides up from bottom.
 * On desktop, falls back to centered modal behavior.
 * 
 * Features:
 * - Slides up from bottom on mobile
 * - Swipe-down to dismiss
 * - Keyboard-aware (input never covered)
 * - Three regions: Header (optional), Scrollable content, Sticky footer
 * - Only activates on mobile (window.innerWidth < 768)
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: string; // e.g., "90vh" or "600px"
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  preventClose?: boolean; // Prevents closing via swipe/backdrop
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  header,
  children,
  footer,
  maxHeight = '90vh',
  showCloseButton = true,
  closeOnBackdrop = true,
  preventClose = false,
}: BottomSheetProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragCurrentY, setDragCurrentY] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [scrollState, setScrollState] = useState({ isScrolled: false, isScrollable: false, scrollTop: 0 });
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef({ isDragging: false, startY: 0, currentY: 0 });

  // Detect mobile vs desktop
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard avoidance: detect virtual keyboard
  useEffect(() => {
    if (!isMobile || !isOpen) {
      setKeyboardHeight(0);
      return;
    }

    const handleResize = () => {
      // Calculate keyboard height by comparing viewport height to window height
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const keyboard = Math.max(0, windowHeight - viewportHeight);
      setKeyboardHeight(keyboard);
    };

    // Use visualViewport API if available (better for mobile keyboards)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    handleResize(); // Initial check

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [isMobile, isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Track scroll state
  useEffect(() => {
    if (!isOpen || !contentRef.current) {
      setScrollState({ isScrolled: false, isScrollable: false, scrollTop: 0 });
      return;
    }

    const contentEl = contentRef.current;
    
    const handleScroll = () => {
      const scrollTop = contentEl.scrollTop;
      const scrollHeight = contentEl.scrollHeight;
      const clientHeight = contentEl.clientHeight;
      const isScrollable = scrollHeight > clientHeight;
      const isScrolled = scrollTop > 0;

      setScrollState({
        isScrolled,
        isScrollable,
        scrollTop,
      });
    };

    // Initial check
    handleScroll();

    contentEl.addEventListener('scroll', handleScroll);
    
    // Also check on resize (content might change)
    const resizeObserver = new ResizeObserver(handleScroll);
    resizeObserver.observe(contentEl);

    return () => {
      contentEl.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [isOpen, children]);

  // Touch handlers for swipe-down to dismiss (using native listeners to allow preventDefault)
  useEffect(() => {
    if (!isMobile || !isOpen || preventClose || !sheetRef.current) return;

    const sheetEl = sheetRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const startY = touch.clientY;
      dragStateRef.current = { isDragging: true, startY, currentY: startY };
      setDragStartY(startY);
      setDragCurrentY(startY);
      setIsDragging(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragStateRef.current.isDragging) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragStateRef.current.startY;

      // Only allow downward swipes and prevent scrolling while dragging
      // Also check if content is scrollable and if we're at the top
      const contentEl = contentRef.current;
      const isContentScrollable = contentEl && contentEl.scrollHeight > contentEl.clientHeight;
      const isAtTop = !contentEl || contentEl.scrollTop === 0;

      // Only prevent default if:
      // 1. Dragging down (deltaY > 0)
      // 2. Either content is not scrollable, or we're at the top of the content
      if (deltaY > 0 && (!isContentScrollable || isAtTop)) {
        dragStateRef.current.currentY = touch.clientY;
        setDragCurrentY(touch.clientY);
        e.preventDefault(); // Prevent scrolling while dragging
      } else if (deltaY > 0) {
        // If content is scrollable and not at top, stop dragging
        dragStateRef.current = { isDragging: false, startY: 0, currentY: 0 };
        setIsDragging(false);
        setDragStartY(0);
        setDragCurrentY(0);
      }
    };

    const handleTouchEnd = () => {
      if (!dragStateRef.current.isDragging) return;

      const deltaY = dragStateRef.current.currentY - dragStateRef.current.startY;
      const threshold = 100; // Minimum swipe distance to dismiss

      if (deltaY > threshold) {
        onClose();
      }

      dragStateRef.current = { isDragging: false, startY: 0, currentY: 0 };
      setIsDragging(false);
      setDragStartY(0);
      setDragCurrentY(0);
    };

    // Attach native event listeners with passive: false on touchmove to allow preventDefault
    sheetEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    sheetEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheetEl.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      sheetEl.removeEventListener('touchstart', handleTouchStart);
      sheetEl.removeEventListener('touchmove', handleTouchMove);
      sheetEl.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isOpen, preventClose, onClose]);

  // Calculate transform for drag animation
  const dragOffset = isDragging ? Math.max(0, dragCurrentY - dragStartY) : 0;
  const dragOpacity = isDragging ? Math.max(0.3, 1 - dragOffset / 300) : 1;

  if (!isOpen) return null;

  // Desktop: Render as centered modal
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center safe-top safe-bottom">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeOnBackdrop && !preventClose ? onClose : undefined}
        />

        {/* Modal */}
        <div
          ref={sheetRef}
          className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with scroll shadow */}
          {(title || header || showCloseButton) && (
            <div 
              className={`flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 transition-shadow ${
                scrollState.isScrolled ? 'shadow-sm' : ''
              }`}
            >
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              {header && <div className="flex-1">{header}</div>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
                  aria-label="Close"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 p-4 flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mobile: Render as bottom sheet
  return (
    <div className="fixed inset-0 z-50 safe-top safe-bottom">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        style={{ opacity: dragOpacity }}
        onClick={closeOnBackdrop && !preventClose ? onClose : undefined}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: `calc(${maxHeight} - ${keyboardHeight}px)`,
          transform: `translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        {!preventClose && (
          <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* Header with scroll shadow */}
        {(title || header || showCloseButton) && (
          <div 
            className={`flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0 transition-shadow ${
              scrollState.isScrolled ? 'shadow-sm' : ''
            }`}
          >
            {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
            {header && <div className="flex-1">{header}</div>}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close"
              >
                <X size={20} className="text-gray-500" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{
            // Ensure content area accounts for keyboard
            maxHeight: `calc(${maxHeight} - ${keyboardHeight}px - ${title || header || showCloseButton ? '120px' : '60px'} - ${footer ? '80px' : '0px'})`,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 px-4 py-3 flex-shrink-0 safe-bottom">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

