/**
 * Phase 9A: Spaces OS-Style Launcher
 * 
 * Mobile-first launcher that displays widgets as app icons in a grid.
 * True OS-style home screen - no fake phone frames or mock devices.
 * Edge-to-edge layout with safe-area awareness.
 * 
 * Features:
 * - Drag and drop to reorder widgets
 * - Pagination with swipe support for multiple pages
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, GripVertical, LayoutGrid, Grid3x3, ChevronLeft, ChevronRight, Trash2, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { WidgetWithLayout } from '../../lib/fridgeCanvasTypes';
import { showToast } from '../Toast';
import { updateWidgetLayout, deleteWidget } from '../../lib/fridgeCanvas';
import { MobileAddWidgetModal } from './MobileAddWidgetModal';
import { MobileNavigationPanel } from './MobileNavigationPanel';
import { NotificationBell } from '../notifications/NotificationBell';
import { executeWithRollback, checkStateConsistency, createStateSnapshot } from '../../lib/stateManagement';
import { SharedSpaceSwitcher } from '../shared/SharedSpaceSwitcher';
import { SharedSpacesManagementPanel } from '../shared/SharedSpacesManagementPanel';
import { CreateSpaceModal } from '../shared/CreateSpaceModal';
import { useActiveData } from '../../contexts/ActiveDataContext';

interface SpacesOSLauncherProps {
  widgets: WidgetWithLayout[];
  householdId: string;
  householdName: string;
  onWidgetsChange?: () => void; // Callback to refresh widgets
}

// Constants
const WIDGETS_PER_PAGE = 16; // 4x4 grid
const GRID_COLS = 4;
const GRID_ROWS = 4;

// Phase 9A: Widget type to icon mapping
const WIDGET_ICON_MAP: Record<string, keyof typeof Icons> = {
  note: 'StickyNote',
  task: 'CheckSquare',
  reminder: 'Bell',
  calendar: 'Calendar',
  goal: 'Target',
  habit: 'Zap',
  habit_tracker: 'CheckCircle2',
  achievements: 'Trophy',
  photo: 'Image',
  insight: 'Sparkles',
  agreement: 'FileCheck',
  meal_planner: 'UtensilsCrossed',
  grocery_list: 'ShoppingCart',
  pantry: 'Package',
  todos: 'CheckSquare',
  stack_card: 'Layers',
  files: 'FileText',
  collections: 'Folder',
  tables: 'Table',
  graphics: 'ImagePlus',
  workspace: 'Layers', // Layered Desk Canvas
  journal: 'BookOpen', // Open book icon
  custom: 'Square',
};

// Phase 9A: Widget type to color mapping
const WIDGET_COLOR_MAP: Record<string, string> = {
  note: 'bg-yellow-500',
  task: 'bg-green-500',
  reminder: 'bg-rose-500',
  calendar: 'bg-blue-500',
  goal: 'bg-emerald-500',
  habit: 'bg-amber-500',
  habit_tracker: 'bg-cyan-500',
  achievements: 'bg-amber-500',
  photo: 'bg-pink-500',
  insight: 'bg-violet-500',
  agreement: 'bg-blue-500',
  meal_planner: 'bg-orange-500',
  grocery_list: 'bg-teal-500',
  pantry: 'bg-stone-500',
  todos: 'bg-green-500',
  stack_card: 'bg-sky-500',
  files: 'bg-slate-500',
  collections: 'bg-indigo-500',
  tables: 'bg-purple-500',
  graphics: 'bg-fuchsia-500',
  workspace: 'bg-stone-500', // Neutral stone tone for desk canvas
  journal: 'bg-amber-500', // Warm amber for journal
  custom: 'bg-gray-500',
};

export function SpacesOSLauncher({ widgets, householdId, householdName, onWidgetsChange }: SpacesOSLauncherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state: adcState } = useActiveData();
  
  // Explicit launcher modes - single source of truth
  type LauncherMode = 'normal' | 'editing' | 'dragging';
  const [launcherMode, setLauncherMode] = useState<LauncherMode>('normal');
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());
  
  // Long-press state (only for entering edit mode)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartRef = useRef<{ widgetId: string; startX: number; startY: number } | null>(null);
  
  // Drag state (only active in editing mode)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Animation state (visual only, not used in logic)
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [showNavigationPanel, setShowNavigationPanel] = useState(false);
  const [showManageSpaces, setShowManageSpaces] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [createSpaceType, setCreateSpaceType] = useState<'household' | 'team' | undefined>();

  // Track add widget modal state in sessionStorage to prevent pull-to-refresh
  useEffect(() => {
    if (showAddWidgetModal) {
      sessionStorage.setItem('add_widget_modal_open', 'true');
    } else {
      sessionStorage.removeItem('add_widget_modal_open');
    }
  }, [showAddWidgetModal]);
  const touchStartRef = useRef<{ widgetId: string; startTime: number; startX: number; startY: number } | null>(null);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggedWidgetRef = useRef<HTMLButtonElement | null>(null);
  const [orderedWidgets, setOrderedWidgets] = useState<WidgetWithLayout[]>([]);
  const [widgetsInitialized, setWidgetsInitialized] = useState(false);
  const hasCheckedAutoOpenRef = useRef(false);
  const widgetsRef = useRef(widgets);
  const orderedWidgetsRef = useRef(orderedWidgets);
  const [tappedWidget, setTappedWidget] = useState<{ widget: WidgetWithLayout; rect: DOMRect } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageTransitionDirection, setPageTransitionDirection] = useState<'left' | 'right' | null>(null);
  const [gridCols, setGridCols] = useState(4); // Responsive grid columns
  const [cellWidth, setCellWidth] = useState(112); // Dynamic cell width for drag calculations
  const [cellHeight, setCellHeight] = useState(116); // Dynamic cell height for drag calculations
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Keep refs in sync with state
  useEffect(() => {
    widgetsRef.current = widgets;
    orderedWidgetsRef.current = orderedWidgets;
  }, [widgets, orderedWidgets]);

  // Calculate responsive grid dimensions based on screen size
  useEffect(() => {
    const updateGridDimensions = () => {
      // Determine number of columns based on screen width
      const screenWidth = window.innerWidth;
      const cols = screenWidth < 480 ? 3 : 4;
      setGridCols(cols);
      
      // Calculate cell dimensions based on screen width and responsive sizing
      // Account for padding (px-3 on mobile = 12px, px-4 on sm+ = 16px)
      const horizontalPadding = screenWidth < 640 ? 24 : 32; // 12px * 2 or 16px * 2
      const availableWidth = screenWidth - horizontalPadding;
      
      // Gap sizes: gap-4 (16px) on mobile, gap-6 (24px) on sm, gap-8 (32px) on md+
      const gapSize = screenWidth < 640 ? 16 : screenWidth < 768 ? 24 : 32;
      
      // Calculate cell width: (available width - (gaps * (cols - 1))) / cols
      const cellW = (availableWidth - (gapSize * (cols - 1))) / cols;
      
      // Cell height: icon height (64px on mobile, 72px on sm, 80px on md+) + label (18-20px) + gap
      const iconHeight = screenWidth < 640 ? 64 : screenWidth < 768 ? 72 : 80;
      const labelHeight = screenWidth < 640 ? 18 : 20;
      const verticalGap = gapSize;
      const cellH = iconHeight + labelHeight + verticalGap;
      
      setCellWidth(cellW);
      setCellHeight(cellH);
    };

    // Update on mount and resize
    updateGridDimensions();
    window.addEventListener('resize', updateGridDimensions);
    
    // Also update after a short delay to ensure DOM is ready
    const timeout = setTimeout(updateGridDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateGridDimensions);
      clearTimeout(timeout);
    };
  }, []);
  
  // Reset modal state on mount to ensure clean state on navigation
  useEffect(() => {
    // Close modal on mount if widgets exist
    if (widgets.length > 0) {
      setShowAddWidgetModal(false);
    }
  }, []); // Only run on mount

  // Phase 9A: Process widgets - ensure all widget types are included
  // Only deduplicate calendar widgets (keep first one), all other widgets are included
  const deduplicatedWidgets = React.useMemo(() => {
    const seen = new Map<string, WidgetWithLayout>();
    const result: WidgetWithLayout[] = [];
    
    // Ensure all widget types are supported
    const supportedTypes = [
      'note', 'task', 'reminder', 'calendar', 'goal', 'habit', 'habit_tracker',
      'achievements', 'photo', 'insight', 'agreement', 'meal_planner',
      'grocery_list', 'todos', 'stack_card', 'files', 'collections',
      'tables', 'graphics', 'custom'
    ];
    
    for (const widget of widgets) {
      const key = widget.widget_type;
      
      // For calendar widgets, only keep the first one
      if (key === 'calendar') {
        if (!seen.has(key)) {
          seen.set(key, widget);
          result.push(widget);
        }
      } else {
        // For all other widgets (reminder, habit, habit_tracker, achievements, photo, 
        // insight, todos, files, collections, tables, graphics, etc.), include them all
        result.push(widget);
      }
    }
    
    return result;
  }, [widgets]);

  // Initialize ordered widgets based on layout position_x (used as display order)
  useEffect(() => {
    if (deduplicatedWidgets.length > 0) {
      const sorted = [...deduplicatedWidgets].sort((a, b) => {
        const orderA = a.layout.position_x ?? 0;
        const orderB = b.layout.position_x ?? 0;
        return orderA - orderB;
      });
      setOrderedWidgets(sorted);
    } else {
      setOrderedWidgets([]);
    }
    
    // Mark widgets as initialized after first processing
    if (!widgetsInitialized) {
      setWidgetsInitialized(true);
    }
  }, [deduplicatedWidgets, widgetsInitialized]);

  // Calculate total pages
  // Calculate widgets per page based on responsive grid columns
  const widgetsPerPage = gridCols * GRID_ROWS;
  const totalPages = Math.ceil(orderedWidgets.length / widgetsPerPage);

  // Adjust current page if grid columns change (e.g., screen resize)
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [gridCols, totalPages, currentPage]);

  // Get widgets for current page (using responsive widgetsPerPage)
  const currentPageWidgets = orderedWidgets.slice(
    currentPage * widgetsPerPage,
    (currentPage + 1) * widgetsPerPage
  );

  // Phase 9A: Handle app icon tap - navigate to full-screen app view with smooth animation
  const handleAppTap = (widget: WidgetWithLayout, event?: React.MouseEvent | React.TouchEvent) => {
    // Only allow navigation in normal mode
    if (launcherMode !== 'normal') {
      return;
    }

    // Store tapped widget position for smooth transition
    if (event) {
      const target = event.currentTarget as HTMLElement;
      // Check if target still exists (might be null if called from setTimeout after DOM changes)
      if (target && target.getBoundingClientRect) {
        try {
          const rect = target.getBoundingClientRect();
          setTappedWidget({ widget, rect });
          setIsTransitioning(true);
          
          // Small delay for visual feedback before navigation
          setTimeout(() => {
            navigate(`/spaces/${householdId}/app/${widget.id}`, { replace: false });
            // Reset after navigation starts
            setTimeout(() => {
              setTappedWidget(null);
              setIsTransitioning(false);
            }, 300);
          }, 100);
          return;
        } catch (error) {
          // If getBoundingClientRect fails, fall through to direct navigation
          console.warn('Failed to get bounding rect for transition:', error);
        }
      }
    }
    
    // Fallback: direct navigation without transition
    navigate(`/spaces/${householdId}/app/${widget.id}`, { replace: false });
  };

  // Toggle widget selection in edit mode
  const toggleWidgetSelection = (widgetId: string) => {
    setSelectedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  // Handle widget deletion with confirmation
  const handleDeleteWidgets = async () => {
    if (selectedWidgets.size === 0) return;

    const widgetIdsToDelete = Array.from(selectedWidgets);
    const count = widgetIdsToDelete.length;
    
    // Confirm deletion
    const confirmed = window.confirm(
      `Delete ${count} widget${count > 1 ? 's' : ''}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      setIsSaving(true);
      
      // Delete all selected widgets
      await Promise.all(widgetIdsToDelete.map(id => deleteWidget(id)));
      
      // Remove from local state
      setOrderedWidgets(prev => prev.filter(w => !selectedWidgets.has(w.id)));
      setSelectedWidgets(new Set());
      
      // Exit edit mode if no widgets remain
      if (orderedWidgets.length - count === 0) {
        setLauncherMode('normal');
      }
      
      showToast('success', `Deleted ${count} widget${count > 1 ? 's' : ''}`);
      
      // Refresh widgets
      if (onWidgetsChange) {
        setTimeout(() => {
          onWidgetsChange();
        }, 500);
      }
    } catch (error) {
      console.error('Error deleting widgets:', error);
      showToast('error', 'Failed to delete widgets');
    } finally {
      setIsSaving(false);
    }
  };

  // Long-press handler - ONLY enters edit mode, never starts dragging
  const handlePointerDown = (clientX: number, clientY: number, widget: WidgetWithLayout) => {
    // Clear any existing timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Only handle long-press in normal mode
    if (launcherMode === 'normal') {
      longPressStartRef.current = {
        widgetId: widget.id,
        startX: clientX,
        startY: clientY,
      };

      // Start long-press timer (350ms)
      longPressTimerRef.current = setTimeout(() => {
        setLauncherMode('editing');
        toggleWidgetSelection(widget.id);
        showToast('info', 'Edit mode enabled. Tap to select, drag to reorder.');
        longPressTimerRef.current = null;
        longPressStartRef.current = null;
      }, 350);
    }
  };

  // Handle pointer down (touch or mouse)
  const handlePointerDownEvent = (e: React.PointerEvent, widget: WidgetWithLayout) => {
    // Don't handle if started in gesture-blocked zone
    if (isGestureBlockedTarget(e.target)) {
      return;
    }

    // Only handle primary pointer (left mouse button or touch)
    if (e.button !== 0 && e.pointerType !== 'touch') return;

    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY, widget);
  };

  // Handle pointer move - cancel long-press if moved too much, or handle drag in edit mode
  const handlePointerMove = (clientX: number, clientY: number) => {
    // Cancel long-press if user moves more than 8px
    if (launcherMode === 'normal' && longPressStartRef.current) {
      const deltaX = Math.abs(clientX - longPressStartRef.current.startX);
      const deltaY = Math.abs(clientY - longPressStartRef.current.startY);
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      if (totalMovement > 8) {
        // Cancel long-press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        longPressStartRef.current = null;
        return;
      }
    }

    // Handle dragging ONLY in editing mode
    if (launcherMode === 'editing' && longPressStartRef.current) {
      const deltaX = Math.abs(clientX - longPressStartRef.current.startX);
      const deltaY = Math.abs(clientY - longPressStartRef.current.startY);
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Start dragging if moved more than 6px
      if (totalMovement > 6 && !draggedWidgetId) {
        setLauncherMode('dragging');
        setDraggedWidgetId(longPressStartRef.current.widgetId);
        setDragPosition({ x: clientX, y: clientY });
      }
    }

    // Continue dragging if already dragging
    if (launcherMode === 'dragging' && draggedWidgetId) {
      setDragPosition({ x: clientX, y: clientY });

      // Calculate which grid position we're over
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const relativeX = clientX - containerRect.left;
        const relativeY = clientY - containerRect.top;

        const gridX = Math.floor(relativeX / cellWidth);
        const gridY = Math.floor(relativeY / cellHeight);

        if (gridX >= 0 && gridX < gridCols && gridY >= 0 && gridY < GRID_ROWS) {
          const widgetsPerPage = gridCols * GRID_ROWS;
          const targetIndex = gridY * gridCols + gridX + (currentPage * widgetsPerPage);
          if (targetIndex >= 0 && targetIndex < orderedWidgets.length) {
            if (targetIndex !== draggedOverIndex) {
              setDraggedOverIndex(targetIndex);
            }
          }
        }
      }
    }
  };

  // Handle pointer move event
  const handlePointerMoveEvent = (e: React.PointerEvent) => {
    if (isGestureBlockedTarget(e.target)) {
      return;
    }

    handlePointerMove(e.clientX, e.clientY);

    // Prevent default scrolling while dragging
    if (launcherMode === 'dragging') {
      e.preventDefault();
    }
  };

  // Handle pointer up - commit drag or toggle selection
  const handlePointerUp = (e: React.PointerEvent, widget: WidgetWithLayout) => {
    // Clear long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Handle drag end
    if (launcherMode === 'dragging' && draggedWidgetId) {
      if (draggedOverIndex !== null) {
        const draggedItem = orderedWidgets.find(w => w.id === draggedWidgetId);
        if (draggedItem) {
          const oldIndex = orderedWidgets.indexOf(draggedItem);
          if (oldIndex !== draggedOverIndex) {
            const newOrder = [...orderedWidgets];
            newOrder.splice(oldIndex, 1);
            newOrder.splice(draggedOverIndex, 0, draggedItem);
            setOrderedWidgets(newOrder);
            saveWidgetOrder(newOrder);
          }
        }
      }

      // Return to editing mode after drag
      setLauncherMode('editing');
      setDraggedWidgetId(null);
      setDraggedOverIndex(null);
      setDragPosition(null);
      longPressStartRef.current = null;
      return;
    }

    // Handle selection in edit mode (if not dragging)
    if (launcherMode === 'editing' && longPressStartRef.current) {
      const deltaX = Math.abs(e.clientX - longPressStartRef.current.startX);
      const deltaY = Math.abs(e.clientY - longPressStartRef.current.startY);
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Toggle selection if minimal movement
      if (totalMovement < 10) {
        toggleWidgetSelection(widget.id);
      }
      longPressStartRef.current = null;
      return;
    }

    // Handle normal tap (only in normal mode)
    if (launcherMode === 'normal' && longPressStartRef.current) {
      const deltaX = Math.abs(e.clientX - longPressStartRef.current.startX);
      const deltaY = Math.abs(e.clientY - longPressStartRef.current.startY);
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Quick tap to open app
      if (totalMovement < 10) {
        const buttonElement = e.currentTarget as HTMLElement;
        // Check if element still exists before accessing getBoundingClientRect
        if (buttonElement && buttonElement.getBoundingClientRect) {
          try {
            const rect = buttonElement.getBoundingClientRect();
            setTappedWidget({ widget, rect });
            setIsTransitioning(true);

            setTimeout(() => {
              handleAppTap(widget, e);
              setTimeout(() => {
                setTappedWidget(null);
                setIsTransitioning(false);
              }, 300);
            }, 100);
          } catch (error) {
            // If getBoundingClientRect fails, just navigate directly
            console.warn('Failed to get bounding rect, navigating directly:', error);
            handleAppTap(widget, e);
          }
        } else {
          // Element no longer exists, navigate directly
          handleAppTap(widget, e);
        }
      }
      longPressStartRef.current = null;
    }
  };

  // Phase 5: State Management Resilience - Save widget order with rollback protection
  const saveWidgetOrder = async (newOrder: WidgetWithLayout[]) => {
    setIsSaving(true);
    const originalOrder = [...orderedWidgets]; // Snapshot for rollback
    
    // Phase 5: Validate state before saving
    checkStateConsistency('widgets', newOrder, [
      (w) => w.length > 0 ? null : 'Widget order cannot be empty',
      (w) => w.every(widget => widget.id && widget.layout?.id) ? null : 'All widgets must have valid IDs',
      (w) => {
        const ids = w.map(widget => widget.id);
        const uniqueIds = new Set(ids);
        return ids.length === uniqueIds.size ? null : 'Widget IDs must be unique';
      },
    ], { component: 'SpacesOSLauncher', action: 'saveWidgetOrder' });
    
    // Ensure all widgets have valid layouts (they should, but double-check)
    // Layouts are per-user (member_id), so each user in a shared space has their own arrangement
    const widgetsWithoutLayouts = newOrder.filter(w => !w.layout || !w.layout.id);
    if (widgetsWithoutLayouts.length > 0) {
      console.error('Some widgets are missing layouts:', widgetsWithoutLayouts);
      showToast('error', 'Some widgets are missing layouts. Please refresh and try again.');
      setIsSaving(false);
      return;
    }
    
    // Phase 5: Execute with rollback protection
    const result = await executeWithRollback(
      `widget-reorder-${Date.now()}`,
      originalOrder,
      async () => {
        // Update position_x for each widget to reflect its new order
        // position_x acts as the display order in launcher view (0, 1, 2, ...)
        // Each user has their own layout records (member_id), so this only affects the current user's arrangement
        const updatePromises = newOrder.map((widget, index) => {
          if (!widget.layout || !widget.layout.id) {
            throw new Error(`Widget ${widget.id} is missing a layout`);
          }
          
          return updateWidgetLayout(widget.layout.id, {
            position_x: index,
            position_y: 0, // Keep y at 0 for launcher view
          });
        });
        
        // Wait for all updates to complete
        await Promise.all(updatePromises);
        
        // Update state after successful operation
        // Note: This only updates the current user's view - other users' arrangements are unaffected
        setOrderedWidgets(newOrder);
      },
      setOrderedWidgets,
      { component: 'SpacesOSLauncher', action: 'saveWidgetOrder' }
    );
    
    if (result.success) {
      showToast('success', 'Widget order saved');
      // Trigger parent refresh to ensure data is in sync
      if (onWidgetsChange) {
        // Small delay to allow database to update
        setTimeout(() => {
          onWidgetsChange();
        }, 500);
      }
    } else {
      console.error('Failed to save widget order:', result.error);
      showToast('error', 'Failed to save order');
      if (result.error) {
        // State will be rolled back by executeWithRollback
        showToast('error', 'Changes have been reverted');
      }
    }
    
    setIsSaving(false);
  };

  // Shared helper: Check if a target is in a gesture-blocked zone (global system UI)
  // This must be used in ALL gesture handlers to prevent interference with system controls
  function isGestureBlockedTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement &&
      target.closest('[data-gesture-exempt="true"]') !== null;
  }

  // Handle swipe start for page navigation
  const handleSwipeStart = (e: React.TouchEvent) => {
    // Don't handle swipe if touch started in gesture-blocked zone
    if (isGestureBlockedTarget(e.target)) {
      return;
    }
    
    // Don't handle swipe if we're not in normal mode
    if (launcherMode !== 'normal') {
      return;
    }
    
    // Don't handle if touch started on a widget button (let button handle it)
    const target = e.target as HTMLElement;
    if (target.closest('button[data-widget-button]')) {
      return;
    }
    
    const touch = e.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  // Exit edit mode
  const handleDone = () => {
    setLauncherMode('normal');
    setSelectedWidgets(new Set());
    setDraggedWidgetId(null);
    setDraggedOverIndex(null);
    setDragPosition(null);
    longPressStartRef.current = null;
  };

  // Phase 9A: Handle back button - open navigation panel instead of navigating
  const handleBackClick = () => {
    setShowNavigationPanel(true);
  };

  // Phase 9A: Toggle to canvas view
  const toggleView = () => {
    // Switch to canvas view
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', 'canvas');
    setSearchParams(newParams, { replace: true });
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    // Only allow page changes in normal mode
    if (launcherMode !== 'normal') return;
    setCurrentPage(newPage);
  };

  // Phase 9A: Get icon component for widget
  const getIconComponent = (widget: WidgetWithLayout) => {
    // For tracker_app widgets, use the widget's stored icon if available
    if (widget.widget_type === 'tracker_app' && widget.icon) {
      const iconName = widget.icon as keyof typeof Icons;
      if (Icons[iconName]) {
        return Icons[iconName] as any;
      }
    }
    // Fall back to default mapping
    const iconName = WIDGET_ICON_MAP[widget.widget_type] || 'Square';
    return Icons[iconName] as any;
  };

  // Phase 9A: Get color for widget
  const getWidgetColor = (widget: WidgetWithLayout) => {
    // For tracker_app widgets, use the widget's stored color if available
    if (widget.widget_type === 'tracker_app' && widget.color) {
      // Map tracker color to background color class
      const colorMap: Record<string, string> = {
        'blue': 'bg-blue-500',
        'indigo': 'bg-indigo-500',
        'purple': 'bg-purple-500',
        'pink': 'bg-pink-500',
        'red': 'bg-red-500',
        'orange': 'bg-orange-500',
        'yellow': 'bg-yellow-500',
        'green': 'bg-green-500',
        'teal': 'bg-teal-500',
        'cyan': 'bg-cyan-500',
        'emerald': 'bg-emerald-500',
        'amber': 'bg-amber-500',
        'violet': 'bg-violet-500',
        'slate': 'bg-slate-500',
        'gray': 'bg-gray-500',
      };
      return colorMap[widget.color] || `bg-${widget.color}-500`;
    }
    // Fall back to default mapping
    return WIDGET_COLOR_MAP[widget.widget_type] || 'bg-gray-500';
  };

  // Phase 9A: Widget type to display name mapping
  const widgetTypeNames: Record<string, string> = {
    note: 'Note',
    task: 'Task',
    reminder: 'Reminder',
    calendar: 'Calendar',
    goal: 'Goal',
    habit: 'Habit',
    habit_tracker: 'Habit Tracker',
    achievements: 'Achievements',
    photo: 'Photo',
    insight: 'Insight',
    agreement: 'Agreement',
    meal_planner: 'Meal Planner',
    grocery_list: 'Grocery List',
    stack_card: 'Stack Cards',
    files: 'Files',
    collections: 'Collections',
    tables: 'Tables',
    todos: 'To-Do List',
    graphics: 'Graphics',
    custom: 'Custom Widget',
  };


  // Phase 9A: Get display name for widget
  const getWidgetName = (widget: WidgetWithLayout) => {
    // If title exists and is not "New Widget", use it
    if (widget.title && widget.title !== 'New Widget') {
      return widget.title;
    }
    // Otherwise, use the proper widget type name
    return widgetTypeNames[widget.widget_type] || widget.widget_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Calculate grid position for a widget index
  const getGridPosition = (index: number) => {
    const widgetsPerPage = gridCols * GRID_ROWS;
    const pageIndex = index % widgetsPerPage;
    const row = Math.floor(pageIndex / gridCols);
    const col = pageIndex % gridCols;
    return { row, col };
  };

  // Close modal immediately on mount if widgets exist (prevents auto-open on navigation back)
  useEffect(() => {
    if (widgets.length > 0 || orderedWidgets.length > 0) {
      setShowAddWidgetModal(false);
      hasCheckedAutoOpenRef.current = true;
    }
  }, []); // Only run on mount
  
  // Auto-open Add Widget modal only once when truly no widgets exist (with delay to ensure widgets have loaded)
  useEffect(() => {
    // Skip if already checked or widgets exist
    if (hasCheckedAutoOpenRef.current || widgets.length > 0 || orderedWidgets.length > 0) {
      hasCheckedAutoOpenRef.current = true;
      return;
    }

    // Only auto-open if:
    // 1. Widgets have been initialized (ensure widgets have loaded)
    // 2. Both input widgets and ordered widgets are empty
    // 3. Modal is not already open
    // 4. Not currently saving
    if (
      widgetsInitialized &&
      widgets.length === 0 &&
      orderedWidgets.length === 0 &&
      !showAddWidgetModal &&
      !isSaving
    ) {
      // Add a delay to ensure widgets aren't still loading from parent
      // Use a longer delay to give parent time to load widgets
      const timeoutId = setTimeout(() => {
        // Check CURRENT state using refs (not captured closure values)
        // Only open if widgets are still empty and we haven't checked yet
        if (
          !hasCheckedAutoOpenRef.current &&
          widgetsRef.current.length === 0 &&
          orderedWidgetsRef.current.length === 0
        ) {
          setShowAddWidgetModal(true);
          hasCheckedAutoOpenRef.current = true;
        }
      }, 1500); // 1.5 second delay to allow widgets to load from parent

      return () => clearTimeout(timeoutId);
    }
  }, [widgetsInitialized, widgets.length, orderedWidgets.length, showAddWidgetModal, isSaving]);

  // Handle widget added - refresh widgets
  const handleWidgetAdded = () => {
    // Call the refresh callback if provided, otherwise reload page
    if (onWidgetsChange) {
      onWidgetsChange();
    } else {
      // Fallback to page reload if no callback provided
      window.location.reload();
    }
  };

  // CRITICAL: Reset all gesture state when space mode changes
  // This prevents phantom drag states, invisible gesture locks, and dead taps after navigation
  useEffect(() => {
    // Reset all gesture state on space switch
    swipeStartRef.current = null;
    touchStartRef.current = null;
    setLauncherMode('normal');
    setSelectedWidgets(new Set());
    setDraggedWidgetId(null);
    setDraggedOverIndex(null);
    setDragPosition(null);
    longPressStartRef.current = null;
    
    // Clear any pending long-press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, [adcState.activeSpaceType, adcState.activeSpaceId, location.pathname, householdId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);


  // Show Add Widget modal if no widgets (auto-opens)
  if (orderedWidgets.length === 0) {
    return (
      <div 
        className="min-h-screen-safe bg-white safe-top safe-bottom" 
        data-no-glitch="true"
        style={{ overscrollBehavior: 'contain' }} // Prevent pull-to-refresh
      >
        {/* Header with notification bell even in empty state */}
        {/* Hard pointer island: Header is NOT part of the gesture surface */}
        <div 
          className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top"
          data-gesture-exempt="true"
          style={{
            pointerEvents: 'auto',
            touchAction: 'manipulation',
          }}
          onPointerDownCapture={(e) => {
            // Hard stop all pointer events from reaching the launcher container
            e.stopPropagation();
          }}
        >
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={handleBackClick}
                className="p-2 text-gray-600 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Navigation"
              >
                <ArrowLeft size={20} />
              </button>
              <SharedSpaceSwitcher
                onManageSpaces={() => setShowManageSpaces(true)}
                onCreateHousehold={() => {
                  setCreateSpaceType('household');
                  setShowCreateSpace(true);
                }}
                onCreateTeam={() => {
                  setCreateSpaceType('team');
                  setShowCreateSpace(true);
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Notification Bell - always visible in Spaces, full-screen modal on mobile */}
              <NotificationBell alwaysVisible={true} fullScreenOnMobile={true} />
            </div>
          </div>
        </div>

        {/* Empty state content - responsive */}
        <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Icons.LayoutGrid size={32} className="text-gray-400 sm:w-10 sm:h-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Apps Yet</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Add apps to your {householdName} space to get started.
            </p>
            <button
              onClick={() => setShowAddWidgetModal(true)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-semibold active:scale-95 transition-transform min-h-[44px] text-sm sm:text-base"
            >
              Add Apps
            </button>
          </div>
        </div>

        <MobileAddWidgetModal
          isOpen={showAddWidgetModal}
          onClose={() => setShowAddWidgetModal(false)}
          householdId={householdId}
          onWidgetAdded={handleWidgetAdded}
        />
        <MobileNavigationPanel
          isOpen={showNavigationPanel}
          onClose={() => setShowNavigationPanel(false)}
          currentSpaceName={householdName}
        />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen-safe bg-white safe-top safe-bottom" 
      data-no-glitch="true"
      style={{ overscrollBehavior: 'contain' }} // Prevent pull-to-refresh
    >
      {/* Phase 9A: Minimal header - edge-to-edge, no fake frames, OS-native */}
      {/* Hard pointer island: Header is NOT part of the gesture surface */}
      <div 
        className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 safe-top"
        data-gesture-exempt="true"
        style={{
          pointerEvents: 'auto',
          touchAction: 'manipulation',
        }}
        onPointerDownCapture={(e) => {
          // Hard stop all pointer events from reaching the launcher container
          // This ensures header interactions never compete with launcher gestures
          e.stopPropagation();
        }}
      >
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={handleBackClick}
              className="p-2 text-gray-600 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
              aria-label="Navigation"
            >
              <ArrowLeft size={20} />
            </button>
            <SharedSpaceSwitcher
              onManageSpaces={() => setShowManageSpaces(true)}
              onCreateHousehold={() => {
                setCreateSpaceType('household');
                setShowCreateSpace(true);
              }}
              onCreateTeam={() => {
                setCreateSpaceType('team');
                setShowCreateSpace(true);
              }}
            />
            {totalPages > 1 && (
              <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:inline">
                {currentPage + 1} / {totalPages}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Notification Bell - always visible in Spaces, full-screen modal on mobile */}
            <NotificationBell alwaysVisible={true} fullScreenOnMobile={true} />
            {/* Add Widget button */}
            <button
              onClick={() => setShowAddWidgetModal(true)}
              className="p-2 text-gray-600 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Add Widget"
              title="Add Widget"
            >
              <Plus size={20} />
            </button>
            {/* View toggle button */}
            <button
              onClick={toggleView}
              className="p-2 text-gray-600 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Switch to Widget View"
              title="Switch to Widget View"
            >
              <Grid3x3 size={20} />
            </button>
            {launcherMode !== 'normal' && (
              <>
                {selectedWidgets.size > 0 && (
                  <button
                    onClick={handleDeleteWidgets}
                    disabled={isSaving}
                    className="p-2 text-red-600 active:bg-red-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50"
                    aria-label="Delete selected widgets"
                    title={`Delete ${selectedWidgets.size} widget${selectedWidgets.size > 1 ? 's' : ''}`}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  onClick={handleDone}
                  disabled={isSaving}
                  className="px-3 sm:px-4 py-2 text-blue-600 font-semibold text-xs sm:text-sm active:scale-95 transition-transform min-h-[44px] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Done'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Page navigation arrows (desktop) */}
      {totalPages > 1 && (
        <div className="hidden md:flex items-center justify-between px-4 py-2">
          <button
            onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform duration-150"
            aria-label="Previous page"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i)}
                className={`h-2 rounded-full transition-all duration-300 ease-out ${
                  i === currentPage ? 'bg-blue-600 w-6 scale-110' : 'bg-gray-300 w-2'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform duration-150"
            aria-label="Next page"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Phase 9A: App icon grid - true OS home screen, edge-to-edge, no shadows/borders */}
      {/* Gesture surface: ONLY this area receives gesture handlers (not the entire container) */}
      <div
        ref={containerRef}
        className="px-3 py-6 sm:px-4 sm:py-8 safe-bottom relative overflow-hidden"
        style={{
          overscrollBehavior: 'contain', // Prevent pull-to-refresh
        }}
      >
        <div
          data-launcher-gesture-surface="true"
          className="relative"
          style={{
            touchAction: launcherMode === 'dragging' ? 'none' : 'pan-x pan-y',
          }}
          onTouchStart={(e) => {
            if (isGestureBlockedTarget(e.target)) {
              return;
            }
            // Only handle swipe start in normal mode
            if (launcherMode === 'normal') {
              handleSwipeStart(e);
            }
          }}
        >
        <div className="relative w-full overflow-hidden" style={{ 
          height: 'calc(100vh - 140px)', 
          minHeight: '350px',
          maxHeight: 'calc(100vh - 140px)'
        }}>
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const isActive = pageIndex === currentPage;
            const offset = pageIndex - currentPage;
            const shouldAnimate = pageTransitionDirection !== null;
            
            // Calculate transform based on direction
            let translateX = offset * 100;
            if (shouldAnimate) {
              if (pageTransitionDirection === 'left' && offset === 1) {
                translateX = 0; // Next page coming in from right
              } else if (pageTransitionDirection === 'left' && offset === 0) {
                translateX = -100; // Current page going left
              } else if (pageTransitionDirection === 'right' && offset === -1) {
                translateX = 0; // Previous page coming in from left
              } else if (pageTransitionDirection === 'right' && offset === 0) {
                translateX = 100; // Current page going right
              }
            }
            
            return (
              <div
                key={pageIndex}
                className="absolute inset-0"
                style={{
                  transform: `translate3d(${translateX}%, 0, 0)`,
                  opacity: isActive ? 1 : 0,
                  zIndex: isActive ? 10 : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                  transition: shouldAnimate
                    ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out'
                    : 'opacity 0.3s ease-out',
                  willChange: shouldAnimate ? 'transform, opacity' : 'auto',
                }}
              >
              {/* Responsive grid: 3 columns on very small screens (< 480px), 4 columns on larger screens */}
              <div 
                ref={pageIndex === currentPage ? gridRef : undefined}
                className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-6 md:gap-8 content-start justify-items-center pb-4"
              >
                {orderedWidgets
                  .slice(pageIndex * widgetsPerPage, (pageIndex + 1) * widgetsPerPage)
                  .map((widget, localIndex) => {
                    const globalIndex = pageIndex * widgetsPerPage + localIndex;
                    const IconComponent = getIconComponent(widget);
                    const color = getWidgetColor(widget);
                    const name = getWidgetName(widget);
                    const isDragging = draggedWidgetId === widget.id;
                    const isDraggedOver = draggedOverIndex === globalIndex && draggedWidgetId !== widget.id && pageIndex === currentPage;
                    const isSelected = selectedWidgets.has(widget.id);
                    
                    // Calculate visual offset during drag animation
                    let translateX = 0;
                    let translateY = 0;
                    
                    if (launcherMode === 'dragging' && draggedWidgetId && !isDragging && draggedOverIndex !== null && pageIndex === currentPage) {
                      const draggedItemIndex = orderedWidgets.findIndex(w => w.id === draggedWidgetId);
                      if (draggedItemIndex !== -1 && draggedItemIndex !== globalIndex) {
                        // Only calculate offset for widgets on the same page
                        const draggedItemPage = Math.floor(draggedItemIndex / widgetsPerPage);
                        if (draggedItemPage === pageIndex) {
                          // Calculate offset based on whether widget should shift - using dynamic cell dimensions
                          if (globalIndex > draggedItemIndex && globalIndex <= draggedOverIndex) {
                            // Widget should shift left (toward the dragged item's old position)
                            translateX = -cellWidth; // Negative: move left
                          } else if (globalIndex < draggedItemIndex && globalIndex >= draggedOverIndex) {
                            // Widget should shift right (toward the dragged item's new position)
                            translateX = cellWidth; // Positive: move right
                          }
                          
                          // Handle vertical shifts for wrapping
                          if (translateX !== 0) {
                            const currentCol = localIndex % gridCols;
                            const wouldWrapLeft = translateX < 0 && currentCol === 0;
                            const wouldWrapRight = translateX > 0 && currentCol === gridCols - 1;
                            
                            if (wouldWrapLeft || wouldWrapRight) {
                              // Widget wraps to next/previous row
                              translateX = wouldWrapLeft ? (gridCols - 1) * cellWidth : -(gridCols - 1) * cellWidth;
                              translateY = wouldWrapLeft ? cellHeight : -cellHeight;
                            }
                          }
                        }
                      }
                    }

                    // Calculate animation delay for staggered appearance (native OS feel)
                    const animationDelay = localIndex * 0.02; // 20ms delay per item
                    
                    return (
                      <div
                        key={widget.id}
                        className="flex flex-col items-center gap-2 sm:gap-2.5 w-full max-w-[100px] sm:max-w-none"
                        style={{
                          transition: isAnimating && !isDragging
                            ? `transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out`
                            : 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
                          transform: (translateX !== 0 || translateY !== 0) && !isDragging
                            ? `translate3d(${translateX}px, ${translateY}px, 0)`
                            : 'translate3d(0, 0, 0)',
                          opacity: pageIndex === currentPage && !isDragging ? 1 : (isDragging ? 0.95 : 0),
                          animation: pageIndex === currentPage && !isAnimating && !isDragging && pageTransitionDirection === null && launcherMode === 'normal'
                            ? `fadeInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) ${animationDelay}s both`
                            : 'none',
                          willChange: isAnimating || pageTransitionDirection !== null ? 'transform, opacity' : 'auto',
                        }}
                      >
                        <button
                          ref={isDragging ? draggedWidgetRef : null}
                          data-widget-button="true"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            handlePointerDownEvent(e, widget);
                          }}
                          onPointerMove={(e) => {
                            e.stopPropagation();
                            handlePointerMoveEvent(e);
                          }}
                          onPointerUp={(e) => {
                            e.stopPropagation();
                            handlePointerUp(e, widget);
                          }}
                          onClick={(e) => {
                            // Only handle click in normal mode
                            if (launcherMode === 'normal') {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAppTap(widget, e);
                            }
                          }}
                          className={`relative flex items-center justify-center ${
                            launcherMode !== 'normal'
                              ? 'cursor-move select-none'
                              : ''
                          } ${isDragging ? 'z-50' : 'z-auto'} ${isDraggedOver ? 'ring-2 ring-blue-400 rounded-2xl' : ''} ${isSelected ? 'ring-2 ring-blue-600 rounded-2xl' : ''}`}
                          style={{
                            touchAction: launcherMode !== 'normal' ? 'none' : 'manipulation',
                            WebkitTapHighlightColor: 'transparent',
                            userSelect: launcherMode !== 'normal' ? 'none' : 'auto',
                            position: isDragging ? 'fixed' : 'relative',
                            transform: isDragging && dragPosition
                              ? `translate3d(calc(${dragPosition.x}px - 50%), calc(${dragPosition.y}px - 50%), 0) scale(1.15)`
                              : tappedWidget?.widget.id === widget.id && isTransitioning
                                ? `translate3d(0, 0, 0) scale(0.85)`
                                : 'translate3d(0, 0, 0) scale(1)',
                            transition: isDragging
                              ? 'none'
                              : tappedWidget?.widget.id === widget.id && isTransitioning
                                ? 'transform 0.15s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.15s ease-out'
                                : isAnimating
                                  ? 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)'
                                  : 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            opacity: isDragging ? 0.95 : tappedWidget?.widget.id === widget.id && isTransitioning ? 0.7 : 1,
                            zIndex: isDragging ? 1000 : tappedWidget?.widget.id === widget.id && isTransitioning ? 999 : 'auto',
                            boxShadow: isDragging
                              ? '0 20px 40px rgba(0, 0, 0, 0.35), 0 8px 16px rgba(0, 0, 0, 0.25)'
                              : isDraggedOver
                                ? '0 4px 12px rgba(59, 130, 246, 0.4)'
                                : 'none',
                            willChange: isDragging || isTransitioning ? 'transform, opacity' : 'auto',
                          }}
                        >
                          {/* Phase 9A: App icon - OS-native style, flat, no shadows, confident design - Responsive sizing */}
                          <div
                            className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] md:w-20 md:h-20 rounded-2xl sm:rounded-3xl ${color} flex items-center justify-center ${
                              isSelected ? 'ring-2 ring-blue-600' : launcherMode !== 'normal' ? 'ring-2 ring-blue-500' : ''
                            } ${isDragging ? 'ring-4 ring-blue-400 ring-opacity-50' : ''}`}
                            style={{
                              transition: isDragging || (tappedWidget?.widget.id === widget.id && isTransitioning)
                                ? 'none'
                                : 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1), filter 0.2s ease-out',
                              transform: isDragging
                                ? 'scale(1.1)'
                                : tappedWidget?.widget.id === widget.id && isTransitioning
                                  ? 'scale(0.9)'
                                  : 'scale(1)',
                              filter: tappedWidget?.widget.id === widget.id && isTransitioning
                                ? 'brightness(0.9)'
                                : 'brightness(1)',
                              willChange: isDragging || isTransitioning ? 'transform, filter' : 'auto',
                            }}
                          >
                            {IconComponent && (
                              <IconComponent size={28} className="text-white sm:w-8 sm:h-8 md:w-9 md:h-9" />
                            )}
                            
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                            
                            {/* Phase 9A: Edit mode indicator - subtle, OS-style (only show if not selected) */}
                            {launcherMode !== 'normal' && !isSelected && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                <GripVertical size={10} className="text-white" />
                              </div>
                            )}
                          </div>
                        </button>

                        {/* Phase 9A: App label - always visible, OS-style typography - Responsive sizing */}
                        <span
                          className="text-[10px] sm:text-xs text-gray-900 font-medium text-center max-w-[100%] px-0.5 truncate leading-tight"
                          style={{
                            opacity: isDragging || (tappedWidget?.widget.id === widget.id && isTransitioning) ? 0 : 1,
                            transition: 'opacity 0.15s cubic-bezier(0.4, 0.0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            transform: tappedWidget?.widget.id === widget.id && isTransitioning ? 'scale(0.9)' : 'scale(1)',
                          }}
                        >
                          {name}
                        </span>
                      </div>
                    );
                  })}
              </div>
              </div>
            );
          })}
        </div>
        </div>
        {/* End gesture surface - only grid area receives gesture handlers */}
      </div>

      {/* Page indicators (mobile) */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 pb-4 md:hidden">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
                  i === currentPage ? 'bg-blue-600 w-6 scale-110' : 'bg-gray-300 w-1.5'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
        </div>
      )}

      {/* Phase 9A: Edit mode hint - dismissible, OS-style */}
      {launcherMode === 'normal' && orderedWidgets.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gray-900/90 text-white text-xs rounded-full backdrop-blur-md shadow-lg opacity-0 animate-[fadeIn_0.3s_ease-out_1s_forwards]">
          Long-press an app to edit
        </div>
      )}

      {/* Add Widget Modal */}
      <MobileAddWidgetModal
        isOpen={showAddWidgetModal}
        onClose={() => setShowAddWidgetModal(false)}
        householdId={householdId}
        onWidgetAdded={handleWidgetAdded}
      />

      {/* Navigation Panel */}
      <MobileNavigationPanel
        isOpen={showNavigationPanel}
        onClose={() => setShowNavigationPanel(false)}
        currentSpaceName={householdName}
      />

      {/* Shared Spaces Management Panel */}
      <SharedSpacesManagementPanel
        isOpen={showManageSpaces}
        onClose={() => setShowManageSpaces(false)}
        onCreateHousehold={() => {
          setShowManageSpaces(false);
          setCreateSpaceType('household');
          setShowCreateSpace(true);
        }}
        onCreateTeam={() => {
          setShowManageSpaces(false);
          setCreateSpaceType('team');
          setShowCreateSpace(true);
        }}
      />

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateSpace}
        onClose={() => {
          setShowCreateSpace(false);
          setCreateSpaceType(undefined);
        }}
        defaultType={createSpaceType}
        onSpaceCreated={(spaceId, spaceName, type) => {
          // Refresh the page or navigate to the new space
          if (onWidgetsChange) {
            onWidgetsChange();
          }
          // Navigate to the new space
          navigate(`/spaces/${spaceId}`);
        }}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
