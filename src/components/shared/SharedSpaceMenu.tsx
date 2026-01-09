/**
 * SharedSpaceMenu Component
 * 
 * Dropdown/bottom sheet menu for switching between spaces.
 * Desktop: Popover anchored to trigger
 * Mobile: Bottom sheet
 */

import { useState, useEffect, useRef } from 'react';
import { Home, Users, User, Check, Settings, Plus } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import type { SharedSpace } from './SharedSpaceSwitcher';

interface SharedSpaceMenuProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: SharedSpace[];
  currentSpace: SharedSpace | null;
  onSelect: (space: SharedSpace) => void;
  onManageSpaces?: () => void;
  onCreateHousehold?: () => void;
  onCreateTeam?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement>;
}

export function SharedSpaceMenu({
  isOpen,
  onClose,
  spaces,
  currentSpace,
  onSelect,
  onManageSpaces,
  onCreateHousehold,
  onCreateTeam,
  triggerRef,
}: SharedSpaceMenuProps) {
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on outside click (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef?.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, onClose]);

  // Position popover (desktop only)
  useEffect(() => {
    if (!isOpen || isMobile || !triggerRef?.current || !popoverRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const rect = trigger.getBoundingClientRect();
      popover.style.top = `${rect.bottom + 8}px`;
      popover.style.left = `${rect.left}px`;
      popover.style.minWidth = `${Math.max(rect.width, 240)}px`;
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, isMobile]);

  // Group spaces by type
  const personalSpaces = spaces.filter(s => s.type === 'personal');
  const householdSpaces = spaces.filter(s => s.type === 'household');
  const teamSpaces = spaces.filter(s => s.type === 'team');

  const renderSpaceItem = (space: SharedSpace) => {
    const Icon = space.icon;
    const isSelected = currentSpace?.id === space.id;

    return (
      <button
        key={space.id}
        onClick={() => onSelect(space)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] ${
          isSelected
            ? 'bg-blue-50 text-blue-700'
            : 'hover:bg-gray-50 text-gray-700'
        }`}
        aria-selected={isSelected}
        role="option"
      >
        <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
        <span className="flex-1 font-medium">{space.name}</span>
        {isSelected && <Check size={18} className="text-blue-600" />}
      </button>
    );
  };

  // Mobile: Use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Switch Space"
        maxHeight="80vh"
      >
        <div className="space-y-6">
          {/* Personal */}
          {personalSpaces.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Personal
              </h3>
              <div className="space-y-1">
                {personalSpaces.map(renderSpaceItem)}
              </div>
            </div>
          )}

          {/* Households */}
          {householdSpaces.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Households
              </h3>
              <div className="space-y-1">
                {householdSpaces.map(renderSpaceItem)}
              </div>
            </div>
          )}

          {/* Teams */}
          {teamSpaces.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                Teams
              </h3>
              <div className="space-y-1">
                {teamSpaces.map(renderSpaceItem)}
              </div>
            </div>
          )}

          {spaces.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">No spaces available</p>
            </div>
          )}

          {/* Create options */}
          {(onCreateHousehold || onCreateTeam) && (
            <div className="pt-4 border-t border-gray-200 mt-4 space-y-1">
              {onCreateHousehold && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateHousehold();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] hover:bg-gray-50 text-gray-700"
                >
                  <Plus size={20} className="text-blue-600" />
                  <Home size={20} className="text-blue-600" />
                  <span className="flex-1 font-medium">Create Household</span>
                </button>
              )}
              {onCreateTeam && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateTeam();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] hover:bg-gray-50 text-gray-700"
                >
                  <Plus size={20} className="text-purple-600" />
                  <Users size={20} className="text-purple-600" />
                  <span className="flex-1 font-medium">Create Team</span>
                </button>
              )}
            </div>
          )}

          {/* Manage Shared Spaces option */}
          {onManageSpaces && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <button
                onClick={() => {
                  onClose();
                  onManageSpaces();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors min-h-[44px] hover:bg-gray-50 text-gray-700"
              >
                <Settings size={20} className="text-gray-500" />
                <span className="flex-1 font-medium">Manage Shared Spaces</span>
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    );
  }

  // Desktop: Use Popover
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[45]"
        onClick={onClose}
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-[50] bg-white rounded-lg shadow-lg border border-gray-200 py-2 max-h-[400px] overflow-y-auto min-w-[240px]"
        role="listbox"
        aria-label="Switch shared space"
      >
        <div className="px-2">
          {/* Personal */}
          {personalSpaces.length > 0 && (
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-3 py-1">
                Personal
              </h3>
              <div className="space-y-0.5">
                {personalSpaces.map(renderSpaceItem)}
              </div>
            </div>
          )}

          {/* Households */}
          {householdSpaces.length > 0 && (
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-3 py-1">
                Households
              </h3>
              <div className="space-y-0.5">
                {householdSpaces.map(renderSpaceItem)}
              </div>
            </div>
          )}

          {/* Teams */}
          {teamSpaces.length > 0 && (
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 px-3 py-1">
                Teams
              </h3>
              <div className="space-y-0.5">
                {teamSpaces.map(renderSpaceItem)}
              </div>
            </div>
          )}

          {spaces.length === 0 && (
            <div className="text-center text-gray-500 py-6 px-4">
              <p className="text-sm">No spaces available</p>
            </div>
          )}

          {/* Create options */}
          {(onCreateHousehold || onCreateTeam) && (
            <div className="pt-2 border-t border-gray-200 mt-2 space-y-0.5">
              {onCreateHousehold && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateHousehold();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors min-h-[44px] hover:bg-gray-50 text-gray-700"
                >
                  <Plus size={16} className="text-blue-600" />
                  <Home size={16} className="text-blue-600" />
                  <span className="flex-1 font-medium text-sm">Create Household</span>
                </button>
              )}
              {onCreateTeam && (
                <button
                  onClick={() => {
                    onClose();
                    onCreateTeam();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors min-h-[44px] hover:bg-gray-50 text-gray-700"
                >
                  <Plus size={16} className="text-purple-600" />
                  <Users size={16} className="text-purple-600" />
                  <span className="flex-1 font-medium text-sm">Create Team</span>
                </button>
              )}
            </div>
          )}

          {/* Manage Shared Spaces option */}
          {onManageSpaces && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <button
                onClick={() => {
                  onClose();
                  onManageSpaces();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors min-h-[44px] hover:bg-gray-50 text-gray-700"
              >
                <Settings size={18} className="text-gray-500" />
                <span className="flex-1 font-medium text-sm">Manage Shared Spaces</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
