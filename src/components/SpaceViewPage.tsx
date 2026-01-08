/**
 * Phase 1: Critical Load Protection - Added timeout protection
 * Phase 2: Memory Leak Prevention - Using safe hooks for event listeners
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, LayoutGrid, Smartphone, Home, Users, User, ChevronDown, Target, MessageCircle, Settings, ArrowLeft, Menu } from 'lucide-react';
import { FridgeCanvas } from './fridge-canvas/FridgeCanvas';
import { SpacesOSLauncher } from './spaces/SpacesOSLauncher';
import { getSpaceById, Household } from '../lib/household';
import { isStandaloneApp } from '../lib/appContext';
import { loadHouseholdWidgets } from '../lib/fridgeCanvas';
import { WidgetWithLayout } from '../lib/fridgeCanvasTypes';
import { NotificationBell } from './notifications/NotificationBell';
import { useLoadingState } from '../hooks/useLoadingState';
import { TimeoutRecovery } from './common/TimeoutRecovery';
import { useSafeEventListener } from '../hooks/useSafeEventListener';
import { ErrorBoundary } from './common/ErrorBoundary';

export function SpaceViewPage() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams] = useSearchParams();
  const widgetParam = searchParams.get('widget');
  const [household, setHousehold] = useState<Household | null>(null);
  const { loading, timedOut, setLoading } = useLoadingState({
    timeoutMs: 12000, // 12 seconds for space load
  });
  const [error, setError] = useState<string | null>(null);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [widgets, setWidgets] = useState<WidgetWithLayout[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // Phase 9A: Detect mobile/installed app
  // Phase 2: Use safe event listener for resize
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth < 768 || isStandaloneApp();
    setIsMobile(mobile);
  }, []);

  useEffect(() => {
    checkMobile();
  }, [checkMobile]);

  useSafeEventListener('resize', checkMobile, window);

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

  // Phase 1: Show timeout recovery if space load timed out
  if (timedOut) {
    return (
      <TimeoutRecovery
        message="Space is taking longer than expected to load. This may be due to a network issue."
        timeoutSeconds={12}
        onRetry={() => loadSpace()}
        onReload={() => window.location.reload()}
      />
    );
  }

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

  // Phase 9A: Check if user wants canvas view on mobile
  const viewParam = searchParams.get('view');
  const showCanvasOnMobile = viewParam === 'canvas' || widgetParam;

  // Phase 9A: On mobile/installed app, default to OS launcher UNLESS canvas view is requested
  // Phase 3: Enhanced Error Boundaries - Wrap SpacesOSLauncher with error boundary
  if (isMobile && household && !showCanvasOnMobile) {
    return (
      <ErrorBoundary
        context="Shared Space"
        fallbackRoute="/spaces/shared"
        errorMessage="An error occurred while loading the shared space."
        onRetry={loadWidgets}
        resetOnPropsChange={true}
      >
        <SpacesOSLauncher
          widgets={widgets}
          householdId={household.id}
          householdName={household.name}
          onWidgetsChange={loadWidgets}
        />
      </ErrorBoundary>
    );
  }

  // Phase 9A: Desktop - show canvas (mode toggle removed, desktop-only if needed)
  // On mobile with widget param or canvas view, also show canvas but with back button to launcher
  // Phase 3: Enhanced Error Boundaries - Wrap FridgeCanvas with error boundary
  return (
    <ErrorBoundary
      context="Shared Space Canvas"
      fallbackRoute="/spaces/shared"
      errorMessage="An error occurred while loading the canvas view."
      resetOnPropsChange={true}
    >
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Mobile Header */}
      {isMobile && showCanvasOnMobile ? (
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm safe-top relative">
          <div className="px-4 h-14 flex items-center justify-between relative">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('view');
                  newParams.delete('widget');
                  navigate(`/spaces/${household.id}?${newParams.toString()}`, { replace: true });
                }}
                className="p-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
                aria-label="Back to Apps"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold text-gray-900 truncate">{household.name}</h1>
                <p className="text-xs text-gray-500 truncate">Shared Space</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <NotificationBell />
              <button
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('view');
                  navigate(`/spaces/${household.id}?${newParams.toString()}`, { replace: true });
                }}
                className="p-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Switch to App View"
                title="Switch to App View"
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMobileMenu(!showMobileMenu);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMobileMenu(!showMobileMenu);
                }}
                className="p-2 text-gray-700 active:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center relative z-50"
                aria-label="Menu"
                type="button"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {showMobileMenu && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMobileMenu(false);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMobileMenu(false);
                }}
              />
              <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-[60]">
                <div className="py-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate('/dashboard');
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 min-h-[44px]"
                    type="button"
                  >
                    <Home size={18} />
                    Dashboard
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate('/spaces/personal');
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 min-h-[44px]"
                    type="button"
                  >
                    <User size={18} />
                    Personal Space
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate('/spaces');
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 min-h-[44px]"
                    type="button"
                  >
                    <Users size={18} />
                    Shared Spaces
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate('/guardrails');
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 min-h-[44px]"
                    type="button"
                  >
                    <Target size={18} />
                    Guardrails
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate('/messages');
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 min-h-[44px]"
                    type="button"
                  >
                    <MessageCircle size={18} />
                    Messages
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMobileMenu(false);
                      navigate('/settings');
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 flex items-center gap-3 min-h-[44px]"
                    type="button"
                  >
                    <Settings size={18} />
                    Settings
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Desktop Header */
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-6 flex-1">
                <div className="flex-1">
                  {/* Desktop: show back link above title */}
                  <button
                    onClick={() => navigate('/spaces')}
                    className="hidden md:block text-gray-600 hover:text-gray-900 text-xs font-medium mb-1 flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <h1 className="text-lg font-bold text-gray-900">{household.name}</h1>
                  <p className="text-xs text-gray-500">Shared Space</p>
                </div>
              </div>

              {/* Desktop: Show full menu */}
              <div className="hidden md:flex items-center gap-2">
                <NotificationBell />
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <Home size={18} />
                  Dashboard
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowSpacesMenu(!showSpacesMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors min-h-[44px]"
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
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-h-[44px]"
                        >
                          <User size={16} />
                          Personal Space
                        </button>
                        <button
                          onClick={() => {
                            setShowSpacesMenu(false);
                            navigate('/spaces');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 min-h-[44px]"
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
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <Target size={18} />
                  Guardrails
                </button>

                <button
                  onClick={() => navigate('/messages')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <MessageCircle size={18} />
                  Messages
                </button>

                <button
                  onClick={() => navigate('/settings')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <Settings size={18} />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <FridgeCanvas householdId={household.id} />
      {/* AI chat widget disabled for shared spaces */}
      </div>
    </ErrorBoundary>
  );
}
