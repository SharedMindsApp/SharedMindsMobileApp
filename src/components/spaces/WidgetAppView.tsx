/**
 * Mobile App View for Widgets
 * 
 * Renders widgets as full-screen mobile apps, separate from the canvas view.
 * This provides a native app-like experience for each widget.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X } from 'lucide-react';
import { loadHouseholdWidgets, getWidgetById } from '../../lib/fridgeCanvas';
import { WidgetWithLayout } from '../../lib/fridgeCanvasTypes';
import { getSpaceById } from '../../lib/household';
import { Loader2 } from 'lucide-react';

// Import widget components
import { NoteWidget } from '../fridge-canvas/widgets/NoteWidget';
import { ReminderWidget } from '../fridge-canvas/widgets/ReminderWidget';
import { CalendarCanvasWidget } from '../fridge-canvas/widgets/CalendarCanvasWidget';
import { GoalCanvasWidget } from '../fridge-canvas/widgets/GoalCanvasWidget';
import { HabitCanvasWidget } from '../fridge-canvas/widgets/HabitCanvasWidget';
import { PhotoCanvasWidget } from '../fridge-canvas/widgets/PhotoCanvasWidget';
import { InsightCanvasWidget } from '../fridge-canvas/widgets/InsightCanvasWidget';
import { HabitTrackerWidget } from '../fridge-canvas/widgets/HabitTrackerWidget';
import { AchievementsWidget } from '../fridge-canvas/widgets/AchievementsWidget';
import { MealPlannerWidget } from '../fridge-canvas/widgets/MealPlannerWidget';
import { GroceryListWidget } from '../fridge-canvas/widgets/GroceryListWidget';
import { TodoCanvasWidget } from '../fridge-canvas/widgets/TodoCanvasWidget';
import { StackCardCanvasWidget } from '../fridge-canvas/widgets/StackCardCanvasWidget';
import { FilesCanvasWidget } from '../fridge-canvas/widgets/FilesCanvasWidget';
import { CollectionsCanvasWidget } from '../fridge-canvas/widgets/CollectionsCanvasWidget';
import { TablesCanvasWidget } from '../fridge-canvas/widgets/TablesCanvasWidget';
import { TrackerAppWidget } from '../fridge-canvas/widgets/TrackerAppWidget';
import { TrackerQuickLinkApp } from '../fridge-canvas/widgets/TrackerQuickLinkApp';
import { useHouseholdPermissions } from '../../lib/useHouseholdPermissions';

export function WidgetAppView() {
  const navigate = useNavigate();
  const { spaceId, widgetId } = useParams<{ spaceId: string; widgetId: string }>();
  const [widget, setWidget] = useState<WidgetWithLayout | null>(null);
  const [householdName, setHouseholdName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { canEdit } = useHouseholdPermissions(spaceId || '');

  useEffect(() => {
    if (spaceId && widgetId) {
      loadWidget();
    }
  }, [spaceId, widgetId]);

  const loadWidget = async () => {
    if (!spaceId || !widgetId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load space to get name
      const space = await getSpaceById(spaceId);
      if (space) {
        setHouseholdName(space.name);
      }

      // Load widget
      const loadedWidget = await getWidgetById(widgetId);
      if (!loadedWidget) {
        setError('Widget not found');
        return;
      }

      // Verify widget belongs to this space
      if (loadedWidget.space_id !== spaceId) {
        setError('Widget does not belong to this space');
        return;
      }

      setWidget(loadedWidget);
    } catch (err) {
      console.error('Error loading widget:', err);
      setError('Failed to load widget');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (spaceId) {
      navigate(`/spaces/${spaceId}`);
    }
  };

  const handleContentChange = async (content: any) => {
    if (!widget || !canEdit) return;
    
    try {
      // Update widget content
      const { updateWidgetContent } = await import('../../lib/fridgeCanvas');
      await updateWidgetContent(widget.id, content);
      
      // Update local state
      setWidget({ ...widget, content });
    } catch (err) {
      console.error('Error updating widget:', err);
    }
  };

  const renderWidget = () => {
    if (!widget) return null;

    // Render widgets in full-screen mobile app mode
    // Use 'large' or 'xlarge' view mode for mobile apps
    const viewMode = 'large';

    switch (widget.widget_type) {
      case 'note':
        return (
          <NoteWidget
            content={widget.content as any}
            viewMode={viewMode}
            onContentChange={canEdit ? handleContentChange : undefined}
          />
        );

      case 'reminder':
        return (
          <ReminderWidget
            content={widget.content as any}
            viewMode={viewMode}
            onContentChange={canEdit ? handleContentChange : undefined}
          />
        );

      case 'calendar':
        return (
          <CalendarCanvasWidget
            householdId={spaceId || ''}
            viewMode={viewMode}
            onViewModeChange={() => {}}
            onNewEvent={() => {
              // Handle new event creation
            }}
            mode="app" // Use app mode for full-screen view (matches PlannerCalendar)
          />
        );

      case 'goal':
        return (
          <GoalCanvasWidget
            content={widget.content as any}
            viewMode={viewMode}
            onContentChange={canEdit ? handleContentChange : undefined}
          />
        );

      case 'habit':
        return (
          <HabitCanvasWidget
            content={widget.content as any}
            viewMode={viewMode}
            onContentChange={canEdit ? handleContentChange : undefined}
          />
        );

      case 'photo':
        return (
          <PhotoCanvasWidget
            content={widget.content as any}
            viewMode={viewMode}
            onContentChange={canEdit ? handleContentChange : undefined}
          />
        );

      case 'insight':
        return (
          <InsightCanvasWidget
            content={widget.content as any}
            viewMode={viewMode}
          />
        );

      case 'habit_tracker':
        return (
          <HabitTrackerWidget
            householdId={spaceId || ''}
          />
        );

      case 'achievements':
        return (
          <AchievementsWidget
            householdId={spaceId || ''}
          />
        );

      case 'meal_planner':
        return (
          <MealPlannerWidget
            householdId={spaceId || ''}
            viewMode={viewMode}
            content={widget.content as any}
            onContentChange={canEdit ? handleContentChange : undefined}
            onViewModeChange={() => {}}
            onFullscreenChange={() => {}}
          />
        );

      case 'grocery_list':
        return (
          <GroceryListWidget
            householdId={spaceId || ''}
            viewMode={viewMode}
            content={widget.content as any}
            onContentChange={canEdit ? handleContentChange : undefined}
          />
        );

      case 'todos':
        return (
          <TodoCanvasWidget
            householdId={spaceId || ''}
            viewMode={viewMode}
          />
        );

      case 'stack_card':
        return (
          <StackCardCanvasWidget
            content={widget.content as any}
            onUpdate={canEdit ? handleContentChange : undefined}
          />
        );

      case 'files':
        return (
          <FilesCanvasWidget
            content={widget.content as any}
            onUpdate={canEdit ? handleContentChange : undefined}
            onAddToCanvas={() => {}}
          />
        );

      case 'collections':
        return (
          <CollectionsCanvasWidget
            spaceId={spaceId || ''}
            spaceType="shared"
            sizeMode={viewMode}
          />
        );

      case 'tables':
        return (
          <TablesCanvasWidget
            widgetId={widget.id}
            content={widget.content as any}
            sizeMode={viewMode}
            spaceId={spaceId || ''}
            spaceType="shared"
            onUpdate={canEdit ? handleContentChange : undefined}
          />
        );

      case 'tracker_app':
        return (
          <TrackerAppWidget
            content={widget.content as any}
          />
        );

      case 'tracker_quicklink':
        return (
          <TrackerQuickLinkApp
            spaceId={spaceId || ''}
            onCreateTrackerApp={async (trackerId) => {
              // Create a tracker app widget when user selects a tracker
              try {
                const { createWidget } = await import('../../lib/fridgeCanvas');
                const { getTracker } = await import('../../lib/trackerStudio/trackerService');
                
                // Fetch tracker to get icon and color
                let widgetIcon = 'Activity';
                let widgetColor = 'indigo';
                let widgetTitle = 'Tracker';
                
                try {
                  const tracker = await getTracker(trackerId);
                  if (tracker) {
                    widgetTitle = tracker.name;
                    widgetIcon = tracker.icon || 'Activity';
                    widgetColor = tracker.color || 'indigo';
                  }
                } catch (err) {
                  console.error('Failed to fetch tracker:', err);
                }
                
                const trackerAppContent = { tracker_id: trackerId };
                await createWidget(spaceId || '', 'tracker_app', trackerAppContent, {
                  icon: widgetIcon,
                  color: widgetColor,
                  title: widgetTitle,
                });
                // Navigate to the new widget
                // Note: We'd need the widget ID, but for now just reload
                window.location.reload();
              } catch (err) {
                console.error('Failed to create tracker app:', err);
              }
            }}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Widget type not supported in app view</p>
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Go Back
              </button>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading app...</p>
        </div>
      </div>
    );
  }

  if (error || !widget) {
    return (
      <div className="min-h-screen-safe bg-white safe-top safe-bottom flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error || 'Widget not found'}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold active:scale-95 transition-transform min-h-[44px]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Get widget display name
  const widgetName = widget.title && widget.title !== 'New Widget' 
    ? widget.title 
    : widget.widget_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="min-h-screen-safe bg-white safe-top safe-bottom flex flex-col">
      {/* Mobile App Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm safe-top">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={handleBack}
              className="p-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">{widgetName}</h1>
              <p className="text-xs text-gray-500 truncate">{householdName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Content - Full Screen App View */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-full">
          {renderWidget()}
        </div>
      </div>
    </div>
  );
}

