/**
 * Phase 9A: Spaces OS-Style Launcher
 * 
 * Mobile-first launcher that displays widgets as app icons in a grid.
 * True OS-style home screen - no fake phone frames or mock devices.
 * Edge-to-edge layout with safe-area awareness.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, X, GripVertical } from 'lucide-react';
import * as Icons from 'lucide-react';
import { WidgetWithLayout } from '../../lib/fridgeCanvasTypes';
import { showToast } from '../Toast';

interface SpacesOSLauncherProps {
  widgets: WidgetWithLayout[];
  householdId: string;
  householdName: string;
}

// Phase 9A: Widget type to icon mapping
const WIDGET_ICON_MAP: Record<string, keyof typeof Icons> = {
  note: 'StickyNote',
  reminder: 'Bell',
  calendar: 'Calendar',
  goal: 'Target',
  habit: 'Zap',
  habit_tracker: 'CheckCircle2',
  achievements: 'Trophy',
  photo: 'Image',
  insight: 'Sparkles',
  meal_planner: 'UtensilsCrossed',
  grocery_list: 'ShoppingCart',
  todos: 'CheckSquare',
  stack_card: 'Layers',
  files: 'FileText',
  collections: 'Folder',
  tables: 'Table',
  graphics: 'ImagePlus',
  custom: 'Square',
};

// Phase 9A: Widget type to color mapping
const WIDGET_COLOR_MAP: Record<string, string> = {
  note: 'bg-yellow-500',
  reminder: 'bg-rose-500',
  calendar: 'bg-blue-500',
  goal: 'bg-emerald-500',
  habit: 'bg-amber-500',
  habit_tracker: 'bg-cyan-500',
  achievements: 'bg-amber-500',
  photo: 'bg-pink-500',
  insight: 'bg-violet-500',
  meal_planner: 'bg-orange-500',
  grocery_list: 'bg-teal-500',
  todos: 'bg-green-500',
  stack_card: 'bg-sky-500',
  files: 'bg-slate-500',
  collections: 'bg-indigo-500',
  tables: 'bg-purple-500',
  graphics: 'bg-fuchsia-500',
  custom: 'bg-gray-500',
};

export function SpacesOSLauncher({ widgets, householdId, householdName }: SpacesOSLauncherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const touchStartRef = useRef<{ widgetId: string; startTime: number } | null>(null);

  // Phase 9A: Handle app icon tap - navigate to canvas view
  const handleAppTap = (widget: WidgetWithLayout) => {
    if (isEditMode) {
      // In edit mode, tap does nothing (or could show widget options)
      return;
    }
    navigate(`/spaces/${householdId}?widget=${widget.id}`);
  };

  // Phase 9A: Handle long-press to enter edit mode
  const handleTouchStart = (e: React.TouchEvent, widget: WidgetWithLayout) => {
    if (isEditMode) return;

    touchStartRef.current = {
      widgetId: widget.id,
      startTime: Date.now(),
    };

    const timer = setTimeout(() => {
      setIsEditMode(true);
      showToast('info', 'Edit mode enabled. Tap Done when finished.');
      touchStartRef.current = null;
    }, 500); // 500ms for long-press

    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    touchStartRef.current = null;
  };

  const handleTouchMove = () => {
    // Cancel long-press if user moves finger
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // Phase 9A: Exit edit mode
  const handleDone = () => {
    setIsEditMode(false);
    setDraggedWidget(null);
  };

  // Phase 9A: Get back path based on space type
  const getBackPath = () => {
    if (location.pathname.includes('/spaces/personal')) {
      return '/spaces/personal';
    }
    return '/spaces/shared';
  };

  // Phase 9A: Get icon component for widget
  const getIconComponent = (widgetType: string) => {
    const iconName = WIDGET_ICON_MAP[widgetType] || 'Square';
    return Icons[iconName] as any;
  };

  // Phase 9A: Get color for widget
  const getWidgetColor = (widgetType: string) => {
    return WIDGET_COLOR_MAP[widgetType] || 'bg-gray-500';
  };

  // Phase 9A: Get display name for widget
  const getWidgetName = (widget: WidgetWithLayout) => {
    return widget.title || widget.widget_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  if (widgets.length === 0) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-white p-4 safe-top safe-bottom">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Icons.LayoutGrid size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Apps Yet</h2>
          <p className="text-gray-600 mb-6">
            Add apps to your {householdName} space to get started.
          </p>
          <button
            onClick={() => navigate(`/spaces/${householdId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold active:scale-95 transition-transform min-h-[44px]"
          >
            Add Apps
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe bg-white safe-top safe-bottom">
      {/* Phase 9A: Minimal header - edge-to-edge, no fake frames, OS-native */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => navigate(getBackPath())}
              className="p-2 text-gray-600 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{householdName}</h1>
          </div>
          {isEditMode && (
            <button
              onClick={handleDone}
              className="px-4 py-2 text-blue-600 font-semibold text-sm active:scale-95 transition-transform min-h-[44px]"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Phase 9A: App icon grid - true OS home screen, edge-to-edge, no shadows/borders */}
      <div className="px-4 py-8 safe-bottom">
        <div className="grid grid-cols-4 gap-8">
          {widgets.map((widget) => {
            const IconComponent = getIconComponent(widget.widget_type);
            const color = getWidgetColor(widget.widget_type);
            const name = getWidgetName(widget);
            const isDragging = draggedWidget === widget.id;

            return (
              <div
                key={widget.id}
                className="flex flex-col items-center gap-2.5"
              >
                <button
                  onTouchStart={(e) => handleTouchStart(e, widget)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  onClick={() => handleAppTap(widget)}
                  className={`relative flex items-center justify-center transition-all ${
                    isEditMode
                      ? 'scale-95'
                      : 'active:scale-90'
                  } ${isDragging ? 'opacity-50' : ''}`}
                  style={{
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Phase 9A: App icon - OS-native style, flat, no shadows, confident design */}
                  <div
                    className={`relative w-20 h-20 rounded-3xl ${color} flex items-center justify-center ${
                      isEditMode ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {IconComponent && (
                      <IconComponent size={36} className="text-white" />
                    )}
                    
                    {/* Phase 9A: Edit mode indicator - subtle, OS-style */}
                    {isEditMode && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                        <GripVertical size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Phase 9A: App label - always visible, OS-style typography */}
                <span className="text-xs text-gray-900 font-medium text-center max-w-[80px] truncate leading-tight">
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 9A: Edit mode hint - dismissible, OS-style */}
      {!isEditMode && widgets.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gray-900/90 text-white text-xs rounded-full backdrop-blur-md shadow-lg opacity-0 animate-[fadeIn_0.3s_ease-out_1s_forwards]">
          Long-press an app to edit
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

