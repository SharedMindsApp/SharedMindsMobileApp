import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, FileText, LogOut, Shield, Eye, X, MessageCircle, Brain, Users, Target, User, ChevronDown, Zap, Sun, Moon, Check, Calendar, Menu, MoreHorizontal, Home as HomeIcon, Settings } from 'lucide-react';
import { ToastContainer, useToasts } from './Toast';
import { getUserHousehold, Household } from '../lib/household';
import { signOut } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { useViewAs } from '../contexts/ViewAsContext';
import { useUIPreferences } from '../contexts/UIPreferencesContext';
import { getUserUIMode } from '../lib/mobileApps';
import type { UIMode } from '../lib/mobileTypes';
import type { AppTheme, NavigationTabId } from '../lib/uiPreferencesTypes';
import { ALL_NAVIGATION_TABS, DEFAULT_FAVOURITE_NAV_TABS } from '../lib/uiPreferencesTypes';
import { RegulationNotificationBanner } from './guardrails/regulation/RegulationNotificationBanner';
import { FloatingAIChatWidget } from './ai-chat/FloatingAIChatWidget';
import { FEATURE_AI_CHAT_WIDGET } from '../lib/featureFlags';
import { OfflineIndicator } from './OfflineIndicator';
import { AppUpdateBanner } from './system/AppUpdateBanner';
import { NotificationBell } from './notifications/NotificationBell';
import { SharedSpaceSwitcher } from './shared/SharedSpaceSwitcher';
import { SharedSpacesManagementPanel } from './shared/SharedSpacesManagementPanel';
import { CreateSpaceModal } from './shared/CreateSpaceModal';

type LayoutProps = {
  children: React.ReactNode;
};

const ICON_MAP: Record<string, any> = {
  Home,
  Users,
  Calendar,
  Target,
  Zap,
  MessageCircle,
  FileText,
  Shield,
  BookOpen: Calendar,
};

export function Layout({ children }: LayoutProps) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [showSpacesMenu, setShowSpacesMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showManageSpaces, setShowManageSpaces] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [createSpaceType, setCreateSpaceType] = useState<'household' | 'team' | undefined>();
  const [uiMode, setUIMode] = useState<UIMode>('fridge');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, role, isViewingAs, profile, user } = useAuth();
  const { clearViewAs } = useViewAs();
  const { config, updatePreferences } = useUIPreferences();
  const { toasts, dismissToast } = useToasts();

  // Mobile detection for hiding AI chat widget
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadHousehold();
    loadUIMode();
  }, [user]);

  const loadHousehold = async () => {
    try {
      const householdData = await getUserHousehold();
      setHousehold(householdData);
    } catch (err) {
      console.error('Error loading household:', err);
    }
  };

  const loadUIMode = async () => {
    if (!user) return;

    try {
      const mode = await getUserUIMode(user.id);
      setUIMode(mode);

      if (mode === 'mobile' && location.pathname === '/household') {
        navigate('/mobile');
      }
    } catch (err) {
      console.error('Error loading UI mode:', err);
      const savedMode = localStorage.getItem('ui_mode') as UIMode;
      if (savedMode) {
        setUIMode(savedMode);
      }
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/auth/login');
  };

  const handleThemeChange = (theme: AppTheme) => {
    updatePreferences({ appTheme: theme });
    // Settings menu removed - theme changes are handled in left navigation menu
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isSpacesActive = () => {
    return location.pathname === '/household' ||
           location.pathname === '/spaces/personal' ||
           location.pathname === '/spaces/shared' ||
           location.pathname.startsWith('/spaces/');
  };

  const favouriteNavTabs = config.favouriteNavTabs || DEFAULT_FAVOURITE_NAV_TABS;

  const availableTabs = ALL_NAVIGATION_TABS.filter((tab) => {
    if (tab.requiresAdmin && !isAdmin) return false;
    return true;
  });

  const favouriteTabs = availableTabs.filter((tab) =>
    favouriteNavTabs.includes(tab.id)
  );

  const moreTabs = availableTabs.filter((tab) =>
    !favouriteNavTabs.includes(tab.id)
  );

  const isTabActive = (tabPath: string) => {
    if (tabPath === '/spaces') {
      return isSpacesActive();
    }
    if (tabPath === '/planner') {
      return location.pathname.startsWith('/planner');
    }
    if (tabPath === '/regulation') {
      return location.pathname.startsWith('/regulation');
    }
    if (tabPath === '/messages') {
      return location.pathname.startsWith('/messages');
    }
    if (tabPath === '/admin') {
      return location.pathname.startsWith('/admin');
    }
    return isActive(tabPath);
  };

  // Notification bell visibility guard
  const shouldShowNotificationBell = () => {
    const hiddenPaths = [
      '/auth/',
      '/onboarding/',
      '/brain-profile/onboarding',
      '/journey',
      '/guardrails/wizard',
    ];

    // Hide on auth and onboarding pages
    if (hiddenPaths.some((path) => location.pathname.startsWith(path))) {
      return false;
    }

    // Hide on landing and how-it-works
    if (location.pathname === '/' || location.pathname === '/how-it-works') {
      return false;
    }

    return true;
  };

  const renderNavTab = (tab: typeof ALL_NAVIGATION_TABS[0]) => {
    const Icon = ICON_MAP[tab.icon];

    if (tab.id === 'spaces') {
      return (
        <div key={tab.id} className="relative">
          <button
            onClick={() => setShowSpacesMenu(!showSpacesMenu)}
            className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
              isSpacesActive()
                ? 'bg-amber-50 text-amber-700'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icon size={16} className="lg:w-[18px] lg:h-[18px]" />
            <span className="hidden lg:inline">{tab.label}</span>
            <ChevronDown size={14} className={`transition-transform lg:w-4 lg:h-4 ${showSpacesMenu ? 'rotate-180' : ''}`} />
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
                    navigate('/planner');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 font-semibold border-b border-gray-100"
                >
                  <HomeIcon size={16} className="text-amber-600" />
                  Household Hub
                </button>
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
      );
    }

    return (
      <button
        key={tab.id}
        onClick={() => navigate(tab.path)}
        className={`flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
          isTabActive(tab.path)
            ? tab.id === 'admin' ? 'bg-violet-50 text-violet-700 ring-2 ring-violet-200 shadow-sm font-semibold' : 'bg-blue-50 text-blue-700 ring-2 ring-blue-200 shadow-sm font-semibold'
            : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
        }`}
      >
        <Icon size={16} className="lg:w-[18px] lg:h-[18px]" />
        <span className="hidden lg:inline">{tab.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen-safe bg-[#f7f7f9]">
      <nav className={`border-b shadow-sm overflow-x-hidden ${
        config.appTheme === 'dark'
          ? 'bg-gray-900 border-gray-700'
          : config.appTheme === 'neon-dark'
          ? 'bg-gray-950 border-gray-800'
          : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 min-h-[56px]">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-8 flex-1 min-w-0">
              {/* Mobile Menu Button - Always visible and accessible */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`md:hidden p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors z-50 flex-shrink-0 ${
                  config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                }`}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                {/* Logo Icon */}
                <img 
                  src="/icon-192.png" 
                  alt="SharedMinds" 
                  className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0"
                />
                <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                  <SharedSpaceSwitcher
                    onManageSpaces={() => setShowManageSpaces(true)}
                    onCreateHousehold={() => {
                      setCreateSpaceType('household');
                      setShowCreateSpace(true);
                    }}
                    onCreateTeam={() => {
                      setCreateSpaceType('team');
                      setShowCreateSpace(true);
                    }}
                  />
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2">
                {favouriteTabs.map((tab) => renderNavTab(tab))}

                {moreTabs.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="flex items-center gap-1.5 lg:gap-2 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50"
                    >
                      <MoreHorizontal size={16} className="lg:w-[18px] lg:h-[18px]" />
                      <span className="hidden lg:inline">More</span>
                      <ChevronDown size={14} className={`transition-transform lg:w-4 lg:h-4 ${showMoreMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showMoreMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowMoreMenu(false)}
                        ></div>
                        <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                          {moreTabs.map((tab) => {
                            const Icon = ICON_MAP[tab.icon];
                            return (
                              <button
                                key={tab.id}
                                onClick={() => {
                                  setShowMoreMenu(false);
                                  navigate(tab.path);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                  isTabActive(tab.path) ? 'text-blue-700 bg-blue-50' : 'text-gray-700'
                                }`}
                              >
                                <Icon size={16} />
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center flex-shrink-0">
              {shouldShowNotificationBell() && <NotificationBell />}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          ></div>

          {/* Drawer - Theme-aware styling */}
          <div className={`fixed top-0 left-0 bottom-0 w-80 shadow-xl z-50 md:hidden overflow-y-auto ${
            config.appTheme === 'dark' 
              ? 'bg-gray-900 border-r border-gray-700' 
              : config.appTheme === 'neon-dark'
              ? 'bg-gray-950 border-r border-gray-800'
              : 'bg-white border-r border-gray-200'
          }`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-xl font-bold ${
                  config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'text-white'
                    : 'text-gray-900'
                }`}>Menu</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className={`p-3 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/dashboard');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={isActive('/dashboard') ? 'page' : undefined}
                >
                  <Home size={20} />
                  Dashboard
                </button>

                <div className="space-y-1">
                  <button
                    onClick={() => setShowSpacesMenu(!showSpacesMenu)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isSpacesActive()
                        ? 'bg-amber-50 text-amber-700'
                        : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                        ? 'text-gray-200 hover:bg-gray-800'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Users size={20} />
                      Spaces
                    </div>
                    <ChevronDown size={16} className={`transition-transform ${showSpacesMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSpacesMenu && (
                    <div className="ml-4 space-y-1">
                      <button
                        onClick={() => {
                          setShowMobileMenu(false);
                          setShowSpacesMenu(false);
                          navigate('/spaces/personal');
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                          config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                            ? 'text-gray-300 hover:bg-gray-800'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <User size={18} />
                        Personal Space
                      </button>
                      <button
                        onClick={() => {
                          setShowMobileMenu(false);
                          setShowSpacesMenu(false);
                          navigate('/spaces/shared');
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                          config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                            ? 'text-gray-300 hover:bg-gray-800'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Users size={18} />
                        Shared Spaces
                      </button>
                    </div>
                  )}
                </div>

                {/* Phase 2D: On mobile, navigate directly to daily view (most actionable) instead of index */}
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    // Mobile-first: go to daily view directly for faster access
                    if (window.innerWidth < 1024) {
                      navigate('/planner/calendar?view=month');
                    } else {
                      navigate('/planner');
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/planner')
                      ? 'bg-blue-50 text-blue-700'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <Calendar size={20} />
                  Planner
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/guardrails');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/guardrails')
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={isActive('/guardrails') ? 'page' : undefined}
                >
                  <Target size={20} />
                  Guardrails
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/regulation');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/regulation')
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={location.pathname.startsWith('/regulation') ? 'page' : undefined}
                >
                  <Zap size={20} />
                  Regulation
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/messages');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/messages')
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={location.pathname.startsWith('/messages') ? 'page' : undefined}
                >
                  <MessageCircle size={20} />
                  Messages
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/report');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/report')
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={isActive('/report') ? 'page' : undefined}
                >
                  <FileText size={20} />
                  Report
                </button>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/settings');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === '/settings' || location.pathname.startsWith('/settings/')
                      ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800 active:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={location.pathname === '/settings' || location.pathname.startsWith('/settings/') ? 'page' : undefined}
                >
                  <Settings size={20} />
                  Settings
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      navigate('/admin');
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname.startsWith('/admin')
                        ? 'bg-violet-50 text-violet-700'
                        : config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                        ? 'text-gray-200 hover:bg-gray-800'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Shield size={20} />
                    Admin
                  </button>
                )}

                <div className={`border-t my-4 ${
                  config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'border-gray-700'
                    : 'border-gray-200'
                }`}></div>


                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    navigate('/brain-profile/cards');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Brain size={20} />
                  My Brain Profile
                </button>

                <div className={`border-t my-4 ${
                  config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'border-gray-700'
                    : 'border-gray-200'
                }`}></div>

                <div className="px-4 py-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}>Theme</p>
                </div>

                <button
                  onClick={() => {
                    handleThemeChange('light');
                    // Don't close menu - let user see the change
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sun size={20} />
                    Light
                  </div>
                  {config.appTheme === 'light' && <Check size={18} className="text-blue-600" />}
                </button>

                <button
                  onClick={() => {
                    handleThemeChange('dark');
                    // Don't close menu - let user see the change
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Moon size={20} />
                    Dark
                  </div>
                  {config.appTheme === 'dark' && <Check size={18} className="text-blue-600" />}
                </button>

                <button
                  onClick={() => {
                    handleThemeChange('neon-dark');
                    // Don't close menu - let user see the change
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-gray-200 hover:bg-gray-800'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Zap size={20} />
                    Neon Dark
                  </div>
                  {config.appTheme === 'neon-dark' && <Check size={18} className="text-blue-600" />}
                </button>

                <div className={`border-t my-4 ${
                  config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                    ? 'border-gray-700'
                    : 'border-gray-200'
                }`}></div>

                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    config.appTheme === 'dark' || config.appTheme === 'neon-dark'
                      ? 'text-red-400 hover:bg-red-900/20'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut size={20} />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isViewingAs && (
        <div className="bg-amber-500 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye size={20} />
                <div>
                  <p className="text-sm font-semibold">Admin View Mode</p>
                  <p className="text-xs opacity-90">
                    Currently viewing as: {profile?.full_name} ({profile?.role?.toUpperCase()})
                  </p>
                </div>
              </div>
              <button
                onClick={clearViewAs}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
              >
                <X size={16} />
                Exit View Mode
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className={
          location.pathname.startsWith('/planner')
            ? 'w-full min-h-screen-safe'
            : 'w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8'
        }
      >
        {children}
      </main>

      <RegulationNotificationBanner />
      {/* Hide AI chat widget on planner, spaces routes, mobile devices, and when feature flag is disabled */}
      {FEATURE_AI_CHAT_WIDGET && 
       !location.pathname.startsWith('/planner') && 
       !location.pathname.startsWith('/spaces') && 
       !isMobile && 
       <FloatingAIChatWidget />}
      <OfflineIndicator />
      <AppUpdateBanner />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <p className="flex-1 font-medium text-gray-900">Are you sure you want to log out?</p>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors min-h-[44px]"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <SharedSpacesManagementPanel
        isOpen={showManageSpaces}
        onClose={() => setShowManageSpaces(false)}
        onCreateHousehold={() => {
          setShowManageSpaces(false);
          setCreateSpaceType('household');
          setShowCreateSpace(true);
        }}
        onCreateTeam={() => {
          setShowManageSpaces(false);
          setCreateSpaceType('team');
          setShowCreateSpace(true);
        }}
      />

      <CreateSpaceModal
        isOpen={showCreateSpace}
        onClose={() => {
          setShowCreateSpace(false);
          setCreateSpaceType(undefined);
        }}
        defaultType={createSpaceType}
        onSpaceCreated={() => {
          // Space switching is handled in the modal
          // Refresh spaces list if management panel is open
          if (showManageSpaces) {
            // Trigger refresh by closing and reopening
            setShowManageSpaces(false);
            setTimeout(() => setShowManageSpaces(true), 100);
          }
        }}
      />
    </div>
  );
}
