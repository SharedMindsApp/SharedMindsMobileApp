import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CalendarPage } from './calendar/CalendarPage';
import { Loader2 } from 'lucide-react';

export function CalendarPageWrapper() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    loadHouseholdId();
  }, [user]);

  const loadHouseholdId = async () => {
    try {
      const { data, error } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHouseholdId(data.space_id);
      } else {
        setHouseholdId(null);
      }
    } catch (error) {
      console.error('Failed to load household:', error);
      setHouseholdId(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return <CalendarPage householdId={householdId} />;
}
