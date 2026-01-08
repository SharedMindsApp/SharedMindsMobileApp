import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, LayoutGrid, Smartphone, Home, Users, User, ChevronDown, Target, MessageCircle, Settings, ArrowLeft } from 'lucide-react';
import { FridgeCanvas } from './fridge-canvas/FridgeCanvas';
import { SpacesOSLauncher } from './spaces/SpacesOSLauncher';
import { getSpaceById, Household } from '../lib/household';
import { isStandaloneApp } from '../lib/appContext';
import { loadHouseholdWidgets } from '../lib/fridgeCanvas';
import { WidgetWithLayout } from '../lib/fridgeCanvasTypes';

export function SpaceViewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [widgets, setWidgets] = useState<WidgetWithLayout[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Phase 9A: Detect mobile/installed app
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || isStandaloneApp();
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (spaceId) {
      loadSpace();
    }
  }, [spaceId]);

  useEffect(() => {
    if (household) {
      loadWidgets();
    }
  }, [household]);

  const loadSpace = async () => {
    if (!spaceId) return;

    try {
      setLoading(true);
      const space = await getSpaceById(spaceId);
      if (!space) {
        setError('Space not found');
        return;
      }
      setHousehold(space);
    } catch (err) {
      console.error('Error loading space:', err);
      setError('Failed to load space');
    } finally {
      setLoading(false);
    }
  };

  const loadWidgets = async () => {
    if (!household) return;
    try {
      const loadedWidgets = await loadHouseholdWidgets(household.id);
      setWidgets(loadedWidgets);
    } catch (err) {
      console.error('Error loading widgets:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading space...</p>
        </div>
      </div>
    );
  }

  if (error || !household) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error || 'Space not found'}</p>
          <button
            onClick={() => navigate('/spaces/shared')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Shared Spaces
          </button>
        </div>
      </div>
    );
  }

  // Phase 9A: On mobile/installed app, show OS launcher
  if (isMobile && household) {
    return <SpacesOSLauncher widgets={widgets} householdId={household.id} householdName={household.name} />;
  }

  // Phase 9A: Desktop - show canvas (mode toggle removed, desktop-only if needed)
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <div>
                {/* Desktop: show back link above title */}
                <button
                  onClick={() => navigate('/spaces/shared')}
                  className="hidden md:block text-gray-600 hover:text-gray-900 text-xs font-medium mb-1 flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                <h1 className="text-lg font-bold text-gray-900">{household.name}</h1>
                <p className="text-xs text-gray-500">Shared Space</p>
              </div>

              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Home size={18} />
                  Dashboard
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowSpacesMenu(!showSpacesMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 transition-colors"
                  >
                    <Users size={18} />
                    Spaces
                    <ChevronDown size={16} className={`transition-transform ${showSpacesMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSpacesMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSpacesMenu(false)}
                      ></div>
                      <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                        <button
                          onClick={() => {
                            setShowSpacesMenu(false);
                            navigate('/spaces/personal');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <User size={16} />
                          Personal Space
                        </button>
                        <button
                          onClick={() => {
                            setShowSpacesMenu(false);
                            navigate('/spaces/shared');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Users size={16} />
                          Shared Spaces
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => navigate('/guardrails')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Target size={18} />
                  Guardrails
                </button>

                <button
                  onClick={() => navigate('/messages')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <MessageCircle size={18} />
                  Messages
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={18} />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FridgeCanvas householdId={household.id} />
      {/* AI chat widget disabled for shared spaces */}
    </div>
  );
}
