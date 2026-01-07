import { CalendarWidgetCore } from '../../shared/CalendarWidgetCore';
import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';

export function MobileCalendarApp({ householdId, widgetId, onClose }: MobileAppProps) {
  return (
    <CalendarWidgetCore
      mode="mobile"
      householdId={householdId}
    />
  );
}
