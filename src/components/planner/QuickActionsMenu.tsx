/**
 * Quick Actions Menu - Context-Aware Action Menu
 * 
 * Provides quick access to common actions based on current route context.
 * Fully customizable via planner settings.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Target,
  FileText,
  Clock,
  CheckSquare,
  MessageSquare,
  DollarSign,
  Home,
  BookOpen,
  Plane,
  Heart,
  Users,
  Briefcase,
  GraduationCap,
  PiggyBank,
  Eye,
  Lightbulb,
  UtensilsCrossed,
  Sparkles,
  X,
} from 'lucide-react';
import type { QuickActionConfig } from '../../lib/plannerTypes';

type QuickActionsMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  actions: QuickActionConfig[];
  position: { x: number; y: number };
};

export function QuickActionsMenu({ isOpen, onClose, actions, position }: QuickActionsMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Icon mapping
  const iconMap: Record<string, any> = {
    Calendar,
    Plus,
    Target,
    FileText,
    Clock,
    CheckSquare,
    MessageSquare,
    DollarSign,
    Home,
    BookOpen,
    Plane,
    Heart,
    Users,
    Briefcase,
    GraduationCap,
    PiggyBank,
    Eye,
    Lightbulb,
    UtensilsCrossed,
    Sparkles,
  };

  if (!isOpen) return null;

  // Filter actions based on context (if route matches)
  const visibleActions = actions.filter((action) => {
    if (!action.contextRoutes || action.contextRoutes.length === 0) return true;
    return action.contextRoutes.some((route) => location.pathname.startsWith(route));
  });

  if (visibleActions.length === 0) return null;

  // Calculate menu position (above the button, aligned to left)
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: `${window.innerHeight - position.y + 80}px`, // Position above the button
    left: `${position.x}px`,
    transform: 'translateX(0)',
    zIndex: 50,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        style={menuStyle}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[200px] max-w-[280px] z-50"
      >
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Quick Actions</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-1 max-h-[400px] overflow-y-auto">
          {visibleActions.map((action) => {
            const Icon = iconMap[action.icon] || Plus;
            return (
              <button
                key={action.id}
                onClick={() => {
                  if (action.type === 'navigate') {
                    navigate(action.path || '#');
                  } else if (action.type === 'callback' && action.callback) {
                    action.callback();
                  }
                  onClose();
                }}
                className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors group"
              >
                <div className={`p-2 rounded-lg ${action.color || 'bg-blue-100'} group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 ${action.iconColor || 'text-blue-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{action.label}</div>
                  {action.description && (
                    <div className="text-xs text-gray-500 mt-0.5">{action.description}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

