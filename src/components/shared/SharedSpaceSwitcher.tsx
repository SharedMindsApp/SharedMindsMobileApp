/**
 * SharedSpaceSwitcher Component
 * 
 * Header component that allows users to switch between:
 * - Personal space
 * - Household spaces
 * - Team spaces
 */

import { useState, useEffect, useRef } from 'react';
import { Home, Users, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveData } from '../../contexts/ActiveDataContext';
import { SharedSpaceMenu } from './SharedSpaceMenu';
import type { SpaceContextType } from '../../lib/spaceTypes';
import { supabase } from '../../lib/supabase';

export interface SharedSpace {
  id: string;
  name: string;
  type: SpaceContextType;
  icon: typeof Home | typeof Users | typeof User;
}

interface SharedSpaceSwitcherProps {
  onManageSpaces?: () => void;
  onCreateHousehold?: () => void;
  onCreateTeam?: () => void;
}

export function SharedSpaceSwitcher({ onManageSpaces, onCreateHousehold, onCreateTeam }: SharedSpaceSwitcherProps = {}) {
  const { user, profile } = useAuth();
  const { state: adcState, setSpaceContext } = useActiveData();
  const [isOpen, setIsOpen] = useState(false);
  const [spaces, setSpaces] = useState<SharedSpace[]>([]);
  const [currentSpace, setCurrentSpace] = useState<SharedSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Load spaces on mount and when profile changes
  useEffect(() => {
    if (user) {
      loadSpaces();
    }
  }, [user, profile?.id]);

  // Update current space when ADC state changes
  useEffect(() => {
    updateCurrentSpace();
  }, [adcState.activeSpaceType, adcState.activeSpaceId, spaces]);

  const loadSpaces = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get profile ID (use from context if available, otherwise fetch)
      let profileId: string | null = null;
      if (profile) {
        profileId = profile.id;
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        profileId = profileData?.id || null;
      }

      if (!profileId) {
        setLoading(false);
        return;
      }

      // Get personal space (spaces with context_type = 'personal')
      // Use user's full name for personal space display
      let personalSpaces: Array<{ id: string; name: string; type: 'personal' }> = [];
      const { data: personalMemberships } = await supabase
        .from('space_members')
        .select('space_id, spaces!inner(id, name, context_type)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .eq('spaces.context_type', 'personal')
        .limit(1);

      if (personalMemberships && personalMemberships.length > 0) {
        // Get user's full name for personal space - fetch if not in context
        let displayName = profile?.full_name;
        if (!displayName) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', profileId)
            .maybeSingle();
          displayName = profileData?.full_name || user?.email?.split('@')[0] || 'Personal Space';
        }
        
        personalSpaces = personalMemberships
          .filter(m => m.spaces && (m.spaces as any).context_type === 'personal')
          .map(m => ({
            id: (m.spaces as any).id,
            name: displayName || 'Personal Space',
            type: 'personal' as const,
          }));
      }

      // Get household spaces (spaces with context_type = 'household')
      let householdSpaces: Array<{ id: string; name: string; type: 'household' }> = [];
      const { data: householdMemberships } = await supabase
        .from('space_members')
        .select('space_id, spaces!inner(id, name, context_type, context_id)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .eq('spaces.context_type', 'household');

      if (householdMemberships) {
        householdSpaces = householdMemberships
          .filter(m => m.spaces && (m.spaces as any).context_type === 'household')
          .map(m => ({
            id: (m.spaces as any).id,
            name: (m.spaces as any).name || 'Unnamed Household',
            type: 'household' as const,
          }));
      }

      // Get team spaces (spaces with context_type = 'team')
      let teamSpaces: Array<{ id: string; name: string; type: 'team' }> = [];
      const { data: teamMemberships } = await supabase
        .from('space_members')
        .select('space_id, spaces!inner(id, name, context_type, context_id)')
        .eq('user_id', profileId)
        .eq('status', 'active')
        .eq('spaces.context_type', 'team');

      if (teamMemberships) {
        teamSpaces = teamMemberships
          .filter(m => m.spaces && (m.spaces as any).context_type === 'team')
          .map(m => ({
            id: (m.spaces as any).id,
            name: (m.spaces as any).name || 'Unnamed Team',
            type: 'team' as const,
          }));
      }

      const allSpaces: SharedSpace[] = [
        ...personalSpaces.map(s => ({ ...s, icon: User })),
        ...householdSpaces.map(s => ({ ...s, icon: Home })),
        ...teamSpaces.map(s => ({ ...s, icon: Users })),
      ];

      setSpaces(allSpaces);
    } catch (error) {
      console.error('Error loading spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentSpace = () => {
    if (spaces.length === 0) {
      setCurrentSpace(null);
      return;
    }

    // If ADC has an active space, use it
    if (adcState.activeSpaceId) {
      const space = spaces.find(s => s.id === adcState.activeSpaceId);
      if (space) {
        setCurrentSpace(space);
        return;
      }
    }

    // Otherwise, default to first household or personal space
    const firstHousehold = spaces.find(s => s.type === 'household');
    const firstPersonal = spaces.find(s => s.type === 'personal');
    const defaultSpace = firstHousehold || firstPersonal || spaces[0];
    setCurrentSpace(defaultSpace);
    
    // Also update ADC if it's not set
    if (defaultSpace && !adcState.activeSpaceId) {
      const spaceType = defaultSpace.type === 'personal' ? 'personal' : 'shared';
      setSpaceContext(spaceType, defaultSpace.id);
    }
  };

  const handleSpaceSelect = (space: SharedSpace) => {
    // Update ActiveDataContext
    const spaceType = space.type === 'personal' ? 'personal' : 'shared';
    setSpaceContext(spaceType, space.id);
    
    setCurrentSpace(space);
    setIsOpen(false);
    
    // Trigger reload by emitting space change event
    // (existing context providers will handle the reload)
  };

  if (loading || !currentSpace) {
    // Show loading or fallback - make it clickable too
    return (
      <>
        <button
          ref={triggerRef}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] cursor-pointer relative z-10"
          aria-label="Switch shared space"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          type="button"
        >
          <User size={18} className="text-gray-600 flex-shrink-0" />
          <span className="truncate max-w-[200px] sm:max-w-none">{profile?.full_name || 'Loading...'}</span>
          <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <SharedSpaceMenu
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          spaces={spaces}
          currentSpace={null}
          onSelect={handleSpaceSelect}
          onManageSpaces={onManageSpaces}
          onCreateHousehold={onCreateHousehold}
          onCreateTeam={onCreateTeam}
          triggerRef={triggerRef}
        />
      </>
    );
  }

  const Icon = currentSpace.icon;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[44px] cursor-pointer relative z-[41]"
        aria-label={`Switch shared space: ${currentSpace.name}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        type="button"
      >
        <Icon size={18} className="text-gray-600 flex-shrink-0" />
        <span className="truncate max-w-[200px] sm:max-w-none">{currentSpace.name}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <SharedSpaceMenu
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        spaces={spaces}
        currentSpace={currentSpace}
        onSelect={handleSpaceSelect}
        onManageSpaces={onManageSpaces}
        onCreateHousehold={onCreateHousehold}
        onCreateTeam={onCreateTeam}
        triggerRef={triggerRef}
      />
    </div>
  );
}
