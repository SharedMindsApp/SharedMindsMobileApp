/**
 * Shared Calendar Entry Card
 * 
 * Direct entry point for Shared/Household Calendar on Dashboard.
 * Routes to Spaces calendar widget (household calendar).
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isStandaloneApp } from '../../lib/appContext';
import { getUserHousehold } from '../../lib/household';
import { loadHouseholdWidgets } from '../../lib/fridgeCanvas';

export function SharedCalendarCard() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || isStandaloneApp());
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = async () => {
    try {
      setLoading(true);
      const household = await getUserHousehold();
      
      if (!household) {
        // No household, navigate to spaces index
        navigate('/spaces');
        return;
      }

      if (isMobile) {
        // On mobile, navigate to Spaces calendar widget
        const widgets = await loadHouseholdWidgets(household.id);
        const calendarWidget = widgets.find(w => w.widget_type === 'calendar');

        if (calendarWidget) {
          // Navigate to calendar widget in Spaces
          navigate(`/spaces/${household.id}/app/${calendarWidget.id}`);
        } else {
          // No calendar widget found, navigate to space view
          navigate(`/spaces/${household.id}`);
        }
      } else {
        // On web, navigate to Planner household calendar
        navigate('/planner/household/calendar');
      }
    } catch (error) {
      console.error('[SharedCalendarCard] Error loading calendar widget:', error);
      // Fallback to spaces index on error
      navigate('/spaces');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left p-4 md:p-6 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0 group-hover:bg-purple-200 transition-colors">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Shared Calendar</h3>
            <p className="text-sm text-gray-600">
              Household and shared events
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
            <ArrowRight className="w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}
