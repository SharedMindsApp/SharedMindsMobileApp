import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, LayoutGrid, Smartphone, Home, Users, User, ChevronDown, Target, MessageCircle, Settings, ArrowLeft } from 'lucide-react';
import { FridgeCanvas } from './fridge-canvas/FridgeCanvas';
import { MobileModeContainer } from './mobile/MobileModeContainer';
import { FloatingAIChatWidget } from './ai-chat/FloatingAIChatWidget';
import { getSpaceById, Household } from '../lib/household';

type UIMode = 'fridge' | 'mobile';

export function SpaceViewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [uiMode, setUIMode] = useState<UIMode>(() => {
    const saved = localStorage.getItem('ui_mode');
    return (saved === 'mobile' || saved === 'fridge') ? saved : 'fridge';
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (spaceId) {
      loadSpace();
    }
  }, [spaceId]);

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

  const handleModeToggle = (mode: UIMode) => {
    setUIMode(mode);
    localStorage.setItem('ui_mode', mode);
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

  if (uiMode === 'mobile') {
    return <MobileModeContainer />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              {/* Phase 6A: Mobile navigation safety - always show back button on mobile */}
              <button
                onClick={() => navigate('/spaces/shared')}
                className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back to Shared Spaces"
              >
                <ArrowLeft size={20} />
              </button>
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

            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleModeToggle('fridge')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  uiMode === 'fridge'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={18} />
                Canvas
              </button>
              <button
                onClick={() => handleModeToggle('mobile')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  uiMode === 'mobile'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone size={18} />
                Mobile
              </button>
            </div>
          </div>
        </div>
      </div>

      <FridgeCanvas householdId={household.id} />
      <FloatingAIChatWidget />
    </div>
  );
}
