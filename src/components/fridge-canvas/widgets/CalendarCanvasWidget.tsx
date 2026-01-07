import { CalendarWidgetCore } from '../../shared/CalendarWidgetCore';
import type { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';

interface CalendarCanvasWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
  onViewModeChange?: (mode: WidgetViewMode) => void;
  onNewEvent?: () => void;
}

export function CalendarCanvasWidget({ householdId, viewMode, onViewModeChange, onNewEvent }: CalendarCanvasWidgetProps) {
  return (
    <CalendarWidgetCore
      mode="fridge"
      householdId={householdId}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onNewEvent={onNewEvent}
    />
  );
}
