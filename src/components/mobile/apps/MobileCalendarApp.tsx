import { CalendarMobileView } from '../../calendar/CalendarMobileView';
import type { MobileAppProps } from '../../../lib/mobileAppsRegistry';

export function MobileCalendarApp({ householdId, widgetId, onClose }: MobileAppProps) {
  return (
    <CalendarMobileView
      householdId={householdId}
    />
  );
}
