/**
 * Personal Calendar Entry Card
 * 
 * Direct entry point for Personal Calendar on Dashboard.
 * Routes to Personal Space calendar widget (mobile calendar application).
 */

import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isStandaloneApp } from '../../lib/appContext';
import { getPersonalSpace } from '../../lib/household';
import { loadHouseholdWidgets } from '../../lib/fridgeCanvas';

export function PersonalCalendarCard() {
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
    if (isMobile) {
      // On mobile, navigate to Personal Space calendar widget
      try {
        setLoading(true);
        const personalSpace = await getPersonalSpace();
        
        if (!personalSpace) {
          // No personal space, navigate to personal space page
          navigate('/spaces/personal');
          return;
        }

        // Load widgets and find calendar widget
        const widgets = await loadHouseholdWidgets(personalSpace.id);
        const calendarWidget = widgets.find(w => w.widget_type === 'calendar');

        if (calendarWidget) {
          // Navigate to calendar widget in Personal Space
          navigate(`/spaces/${personalSpace.id}/app/${calendarWidget.id}`);
        } else {
          // No calendar widget found, navigate to personal space view
          navigate(`/spaces/personal`);
        }
      } catch (error) {
        console.error('[PersonalCalendarCard] Error loading calendar widget:', error);
        // Fallback to personal space page on error
        navigate('/spaces/personal');
      } finally {
        setLoading(false);
      }
    } else {
      // On web, navigate to Planner calendar (personal)
      navigate('/planner/monthly');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left p-4 md:p-6 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0 group-hover:bg-blue-200 transition-colors">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Personal Calendar</h3>
            <p className="text-sm text-gray-600">
              Your personal schedule and events
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <ArrowRight className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </button>
  );
}
