/**
 * Mobile-optimized Add Widget Modal
 * 
 * Full-screen modal for adding widgets in mobile SpacesOSLauncher view.
 * Optimized for touch interactions and mobile screens.
 */

import { useState, useMemo } from 'react';
import {
  X,
  Search,
  StickyNote,
  Bell,
  Calendar,
  Target,
  Zap,
  Image,
  Sparkles,
  CheckCircle2,
  Trophy,
  UtensilsCrossed,
  ShoppingCart,
  Layers,
  FileText,
  Folder,
  ImagePlus,
  Table,
  Activity,
} from 'lucide-react';
import { WidgetType, TrackerAppContent } from '../../lib/fridgeCanvasTypes';
import { createWidget, getDefaultWidgetContent } from '../../lib/fridgeCanvas';
import { showToast } from '../Toast';
import { SelectTrackerModal } from '../fridge-canvas/widgets/SelectTrackerModal';
import { getTracker } from '../../lib/trackerStudio/trackerService';

interface MobileAddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  onWidgetAdded: () => void;
}

interface WidgetOption {
  type: WidgetType | 'graphics';
  icon: any;
  label: string;
  color: string;
  iconColor: string;
  category: string;
  description: string;
}

const widgetOptions: WidgetOption[] = [
  {
    type: 'note',
    icon: StickyNote,
    label: 'Note',
    color: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    category: 'Content',
    description: 'Quick notes and memos',
  },
  {
    type: 'reminder',
    icon: Bell,
    label: 'Reminder',
    color: 'bg-rose-50',
    iconColor: 'text-rose-600',
    category: 'Planning',
    description: 'Set reminders and alerts',
  },
  {
    type: 'calendar',
    icon: Calendar,
    label: 'Calendar',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    category: 'Planning',
    description: 'View upcoming events',
  },
  {
    type: 'goal',
    icon: Target,
    label: 'Goal',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    category: 'Tracking',
    description: 'Track your goals',
  },
  {
    type: 'habit',
    icon: Zap,
    label: 'Habit',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Tracking',
    description: 'Build daily habits',
  },
  {
    type: 'habit_tracker',
    icon: CheckCircle2,
    label: 'Habit Tracker',
    color: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    category: 'Tracking',
    description: 'Visualize habit streaks',
  },
  {
    type: 'achievements',
    icon: Trophy,
    label: 'Achievements',
    color: 'bg-amber-50',
    iconColor: 'text-amber-600',
    category: 'Tracking',
    description: 'View milestones and wins',
  },
  {
    type: 'photo',
    icon: Image,
    label: 'Photo',
    color: 'bg-gray-50',
    iconColor: 'text-gray-600',
    category: 'Media',
    description: 'Add photos and images',
  },
  {
    type: 'insight',
    icon: Sparkles,
    label: 'Insight',
    color: 'bg-violet-50',
    iconColor: 'text-violet-600',
    category: 'Content',
    description: 'Important insights',
  },
  {
    type: 'meal_planner',
    icon: UtensilsCrossed,
    label: 'Meal Planner',
    color: 'bg-orange-50',
    iconColor: 'text-orange-600',
    category: 'Planning',
    description: 'Plan weekly meals',
  },
  {
    type: 'grocery_list',
    icon: ShoppingCart,
    label: 'Grocery List',
    color: 'bg-teal-50',
    iconColor: 'text-teal-600',
    category: 'Planning',
    description: 'Shopping list',
  },
  {
    type: 'todos',
    icon: CheckCircle2,
    label: 'To-Do List',
    color: 'bg-green-50',
    iconColor: 'text-green-600',
    category: 'Planning',
    description: 'Task management',
  },
  {
    type: 'stack_card',
    icon: Layers,
    label: 'Stack Cards',
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    category: 'Organization',
    description: 'Organize with cards',
  },
  {
    type: 'files',
    icon: FileText,
    label: 'Files',
    color: 'bg-slate-50',
    iconColor: 'text-slate-600',
    category: 'Organization',
    description: 'Manage your files',
  },
  {
    type: 'collections',
    icon: Folder,
    label: 'Collections',
    color: 'bg-blue-50',
    iconColor: 'text-blue-600',
    category: 'Organization',
    description: 'Curate and organize references',
  },
  {
    type: 'tables',
    icon: Table,
    label: 'Tables',
    color: 'bg-sky-50',
    iconColor: 'text-sky-600',
    category: 'Organization',
    description: 'Spreadsheet-style data tables',
  },
  {
    type: 'tracker',
    icon: Activity,
    label: 'Tracker',
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    category: 'Tracking',
    description: 'View tracker data from Tracker Studio',
  },
  {
    type: 'tracker_app',
    icon: Activity,
    label: 'Tracker App',
    color: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    category: 'Tracking',
    description: 'Add a tracker as a standalone app with its own icon',
  },
  {
    type: 'graphics',
    icon: ImagePlus,
    label: 'Graphics',
    color: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    category: 'Media',
    description: 'Upload and place SVG graphics',
  },
];

const categories = ['All', 'Content', 'Planning', 'Tracking', 'Media', 'Organization'];

export function MobileAddWidgetModal({ isOpen, onClose, householdId, onWidgetAdded }: MobileAddWidgetModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreating, setIsCreating] = useState(false);
  const [showTrackerSelect, setShowTrackerSelect] = useState(false);
  const [pendingWidgetType, setPendingWidgetType] = useState<WidgetType | null>(null);

  const filteredWidgets = useMemo(() => {
    let widgets = widgetOptions;

    if (selectedCategory !== 'All') {
      widgets = widgets.filter((w) => w.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      widgets = widgets.filter(
        (w) =>
          w.label.toLowerCase().includes(term) ||
          w.description.toLowerCase().includes(term) ||
          w.category.toLowerCase().includes(term)
      );
    }

    return widgets;
  }, [searchTerm, selectedCategory]);

  const handleAddWidget = async (option: WidgetOption) => {
    if (isCreating) return;

    // Graphics is not a widget - show message
    if (option.type === 'graphics') {
      showToast('info', 'Graphics can be added from the canvas view');
      return;
    }

    // Tracker widgets require selection
    if (option.type === 'tracker' || option.type === 'tracker_app') {
      setPendingWidgetType(option.type);
      setShowTrackerSelect(true);
      return;
    }

    try {
      setIsCreating(true);
      const content = getDefaultWidgetContent(option.type as WidgetType);
      await createWidget(householdId, option.type as WidgetType, content);
      showToast('success', `${option.label} added successfully`);
      onWidgetAdded();
      onClose();
    } catch (error) {
      console.error('Failed to create widget:', error);
      showToast('error', `Failed to add ${option.label}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTrackerSelected = async (trackerId: string) => {
    if (!pendingWidgetType || isCreating) return;

    try {
      setIsCreating(true);
      
      // For tracker_app, fetch tracker to get icon and color
      let widgetIcon = 'Activity';
      let widgetColor = 'indigo';
      let widgetTitle = 'Tracker';

      if (pendingWidgetType === 'tracker_app') {
        try {
          const tracker = await getTracker(trackerId);
          if (tracker) {
            widgetTitle = tracker.name;
            widgetIcon = tracker.icon || 'Activity';
            widgetColor = tracker.color || 'indigo';
          }
        } catch (err) {
          console.error('Failed to fetch tracker:', err);
        }
      }

      const content: TrackerAppContent = { tracker_id: trackerId };
      
      await createWidget(householdId, pendingWidgetType, content, {
        icon: widgetIcon,
        color: widgetColor,
        title: widgetTitle,
      });

      showToast('success', `${widgetTitle} added successfully`);
      onWidgetAdded();
      setShowTrackerSelect(false);
      setPendingWidgetType(null);
      onClose();
    } catch (error) {
      console.error('Failed to create tracker widget:', error);
      showToast('error', 'Failed to add tracker widget');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  // Show tracker select modal instead of main modal when selecting a tracker
  if (showTrackerSelect) {
    return (
      <SelectTrackerModal
        isOpen={showTrackerSelect}
        onClose={() => {
          setShowTrackerSelect(false);
          setPendingWidgetType(null);
        }}
        onSelect={handleTrackerSelected}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-white z-50 flex flex-col safe-top safe-bottom"
      style={{ overscrollBehavior: 'contain' }} // Prevent pull-to-refresh
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900">Add Widget</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose an app to add to your space</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center ml-2"
          aria-label="Close"
        >
          <X size={24} className="text-gray-600" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 active:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Widget Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredWidgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-center">No widgets found</p>
            <p className="text-sm text-gray-400 mt-2">Try a different search term or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredWidgets.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.type}
                  onClick={() => handleAddWidget(option)}
                  disabled={isCreating}
                  className={`${option.color} rounded-2xl p-4 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform min-h-[120px] ${
                    isCreating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className={`p-3 rounded-xl bg-white ${option.iconColor}`}>
                    <Icon size={32} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 text-sm">{option.label}</p>
                    <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isCreating && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Adding widget...</p>
          </div>
        </div>
      )}
    </div>
  );
}
