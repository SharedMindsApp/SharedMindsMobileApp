/**
 * Notification Panel
 * 
 * Main notification inbox UI.
 * Renders as bottom sheet on mobile, popover on web.
 */

import { X, CheckCheck, Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationCard } from './NotificationCard';
import { isStandaloneApp } from '../../lib/appContext';
import { useEffect, useState } from 'react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
}

export function NotificationPanel({ isOpen, onClose, anchorRef }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAllAsRead, handleNotificationClick } = useNotifications();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768 || isStandaloneApp());
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render if not open
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotificationCardClick = async (notification: any) => {
    await handleNotificationClick(notification);
    onClose();
  };

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
        
        {/* Bottom Sheet */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <CheckCheck className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-gray-500">Loading...</p>
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">You're all caught up</h3>
                  <p className="text-sm text-gray-500">No new notifications</p>
                </div>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationCardClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // Web: Popover
  return (
    <>
      {/* Backdrop (for closing) */}
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
      />
      
      {/* Popover */}
      <div
        className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 max-h-[600px] flex flex-col"
        style={{
          transformOrigin: 'top right',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center px-4">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">You're all caught up</h3>
                <p className="text-sm text-gray-500">No new notifications</p>
              </div>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationCardClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
