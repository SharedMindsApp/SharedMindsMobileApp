/**
 * WidgetHeader Component
 * 
 * Standardized header layout for context-aware widgets.
 * Provides consistent placement of title, metadata, and space context switcher.
 */

import { ReactNode } from 'react';
import { SpaceContextSwitcher } from './SpaceContextSwitcher';

import { SpaceOption } from '../../hooks/useSpaceContext';

interface WidgetHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
  currentSpaceId?: string;
  onSpaceChange?: (spaceId: string) => void;
  availableSpaces?: SpaceOption[];
  showSpaceSwitcher?: boolean;
  className?: string;
}

export function WidgetHeader({
  icon,
  title,
  subtitle,
  actions,
  currentSpaceId,
  onSpaceChange,
  availableSpaces,
  showSpaceSwitcher = false,
  className = '',
}: WidgetHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-700 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showSpaceSwitcher && currentSpaceId && onSpaceChange && availableSpaces && (
          <SpaceContextSwitcher
            currentSpaceId={currentSpaceId}
            onSpaceChange={onSpaceChange}
            availableSpaces={availableSpaces}
            className="hidden sm:block"
          />
        )}
        {actions}
      </div>
    </div>
  );
}
