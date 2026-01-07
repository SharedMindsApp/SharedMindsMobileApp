import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, ZoomIn, ZoomOut, Calendar, ChevronRight, ChevronDown, Sparkles, Eye, EyeOff } from 'lucide-react';
import { getTrackTree, type TrackWithChildren } from '../../../lib/guardrails/trackService';
import {
  getTimelineEligibleItems,
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
  type RoadmapItem,
} from '../../../lib/guardrails/roadmapService';
import {
  generateTimelineColumns,
  dateToPosition,
  positionToDate,
  getColumnWidth,
  formatDateForDB,
  formatDateForDisplay,
  parseDateFromDB,
  getTodayIndicatorPosition,
  isToday,
  type ZoomLevel,
  type TimelineColumn,
} from '../../../lib/guardrails/infiniteTimelineUtils';
import { RoadmapItemModal } from './RoadmapItemModal';

interface InfiniteRoadmapViewProps {
  masterProjectId: string;
}

const ROW_HEIGHT = 48;
const SIDEBAR_WIDTH = 300;

const STATUS_COLORS = {
  not_started: { bg: 'bg-gray-300', border: 'border-gray-400', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-400', border: 'border-blue-600', text: 'text-white' },
  blocked: { bg: 'bg-red-400', border: 'border-red-600', text: 'text-white' },
  completed: { bg: 'bg-green-400', border: 'border-green-600', text: 'text-white' },
  on_hold: { bg: 'bg-yellow-300', border: 'border-yellow-500', text: 'text-gray-900' },
};

interface FlatTrack extends TrackWithChildren {
  depth: number;
  isVisible: boolean;
}

export function InfiniteRoadmapView({ masterProjectId }: InfiniteRoadmapViewProps) {
  const [trackTree, setTrackTree] = useState<TrackWithChildren[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week');
  const [scrollX, setScrollX] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(1200);
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set());
  const [showSideProjects, setShowSideProjects] = useState(true);
  const [addItemModal, setAddItemModal] = useState<{
    open: boolean;
    trackId: string | null;
    trackName: string;
  } | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const hasInitializedScroll = useRef(false);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    loadData();
  }, [masterProjectId]);

  useEffect(() => {
    if (timelineRef.current && !hasInitializedScroll.current) {
      const columnWidth = getColumnWidth(zoomLevel);
      const todayX = getTodayIndicatorPosition(zoomLevel, columnWidth);
      const centerOffset = viewportWidth / 2;
      timelineRef.current.scrollLeft = todayX + (viewportWidth / 2) - centerOffset;
      hasInitializedScroll.current = true;
    }
  }, [loading, zoomLevel, viewportWidth]);

  useEffect(() => {
    const handleResize = () => {
      if (timelineRef.current) {
        setViewportWidth(timelineRef.current.clientWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [tree, items] = await Promise.all([
        getTrackTree(masterProjectId),
        getTimelineEligibleItems(masterProjectId),
      ]);
      setTrackTree(tree);
      setRoadmapItems(items);
    } catch (error) {
      console.error('Failed to load roadmap data:', error);
    } finally {
      setLoading(false);
    }
  }

  const flatTracks = useMemo((): FlatTrack[] => {
    const result: FlatTrack[] = [];

    function flatten(tracks: TrackWithChildren[], depth: number, parentVisible: boolean) {
      tracks.forEach(track => {
        if (!track.includeInRoadmap) return;
        if (!showSideProjects && track.category === 'side_project') return;

        const isVisible = parentVisible && !collapsedTracks.has(track.parentTrackId || '');
        result.push({ ...track, depth, isVisible });

        if (track.children && track.children.length > 0 && !collapsedTracks.has(track.id)) {
          flatten(track.children, depth + 1, isVisible);
        }
      });
    }

    flatten(trackTree, 0, true);
    return result;
  }, [trackTree, collapsedTracks, showSideProjects]);

  const visibleTracks = useMemo(() => {
    return flatTracks.filter(t => t.isVisible);
  }, [flatTracks]);

  const columns = useMemo((): TimelineColumn[] => {
    const columnWidth = getColumnWidth(zoomLevel);
    return generateTimelineColumns({
      zoomLevel,
      columnWidth,
      today,
      scrollX,
      viewportWidth,
    });
  }, [zoomLevel, scrollX, viewportWidth, today]);

  const itemsByTrack = useMemo(() => {
    const map = new Map<string, RoadmapItem[]>();
    roadmapItems.forEach(item => {
      const items = map.get(item.trackId) || [];
      items.push(item);
      map.set(item.trackId, items);
    });
    return map;
  }, [roadmapItems]);

  function toggleCollapse(trackId: string) {
    setCollapsedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    setScrollX(e.currentTarget.scrollLeft);
  }

  function handleZoomIn() {
    setZoomLevel(prev => {
      if (prev === 'month') return 'week';
      if (prev === 'week') return 'day';
      return prev;
    });
  }

  function handleZoomOut() {
    setZoomLevel(prev => {
      if (prev === 'day') return 'week';
      if (prev === 'week') return 'month';
      return prev;
    });
  }

  async function handleAddItem(trackId: string, data: { type: string; title: string; startDate?: string; endDate?: string; status?: string }) {
    try {
      await createRoadmapItem({
        masterProjectId,
        trackId,
        type: data.type as any,
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate || null,
        status: (data.status as any) || 'not_started',
      });
      await loadData();
      setAddItemModal(null);
    } catch (error: any) {
      console.error('Failed to create roadmap item:', error);
      alert(error.message || 'Failed to create roadmap item');
    }
  }

  function renderItem(item: RoadmapItem, track: FlatTrack) {
    if (!item.startDate) return null;

    const columnWidth = getColumnWidth(zoomLevel);
    const startX = dateToPosition(parseDateFromDB(item.startDate), zoomLevel, columnWidth, today);
    const endX = item.endDate
      ? dateToPosition(parseDateFromDB(item.endDate), zoomLevel, columnWidth, today)
      : startX + columnWidth * 0.8;

    const width = Math.max(endX - startX, 40);
    const statusColors = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.not_started;

    const isOverdue = item.endDate && new Date(item.endDate) < today && item.status !== 'completed';

    return (
      <div
        key={item.id}
        className={`absolute top-2 h-10 ${statusColors.bg} ${statusColors.border} border-2 rounded px-2 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity ${isOverdue ? 'ring-2 ring-red-600' : ''}`}
        style={{
          left: `${startX}px`,
          width: `${width}px`,
        }}
        title={`${item.title}\n${formatDateForDisplay(parseDateFromDB(item.startDate))} - ${item.endDate ? formatDateForDisplay(parseDateFromDB(item.endDate)) : 'No end date'}\nStatus: ${item.status}`}
      >
        <span className={`text-sm font-medium truncate ${statusColors.text}`}>
          {item.title}
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  const columnWidth = getColumnWidth(zoomLevel);
  const todayX = getTodayIndicatorPosition(zoomLevel, columnWidth);
  const timelineWidth = Math.max(viewportWidth * 3, columns.length * columnWidth);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Roadmap</h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm">
            <Calendar size={16} className="text-gray-600" />
            <span className="text-gray-700 font-medium">
              {zoomLevel === 'day' && 'Daily View'}
              {zoomLevel === 'week' && 'Weekly View'}
              {zoomLevel === 'month' && 'Monthly View'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSideProjects(!showSideProjects)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              showSideProjects
                ? 'bg-purple-50 border-purple-300 text-purple-700'
                : 'bg-gray-100 border-gray-300 text-gray-600'
            }`}
          >
            {showSideProjects ? <Eye size={16} /> : <EyeOff size={16} />}
            <span className="text-sm font-medium">Side Projects</span>
          </button>

          <div className="h-6 w-px bg-gray-300"></div>

          <button
            onClick={handleZoomOut}
            disabled={zoomLevel === 'month'}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel === 'day'}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 overflow-x-auto overflow-y-auto"
          ref={timelineRef}
          onScroll={handleScroll}
        >
          <div className="relative" style={{ height: `${visibleTracks.length * ROW_HEIGHT}px` }}>
            <div
              className="absolute left-0 top-0 bottom-0 w-px bg-blue-600 z-20"
              style={{ left: `${SIDEBAR_WIDTH + todayX}px` }}
            >
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded whitespace-nowrap">
                Today
              </div>
            </div>

            <div className="sticky top-0 left-0 z-30 bg-white border-b border-gray-300 h-12 flex">
              <div
                className="sticky left-0 z-40 bg-white border-r border-gray-300 flex items-center px-4 font-semibold text-gray-700"
                style={{ width: `${SIDEBAR_WIDTH}px` }}
              >
                Tracks
              </div>
              <div className="relative" style={{ width: `${timelineWidth}px` }}>
                {columns.map((col, idx) => {
                  const isTodayColumn = isToday(col.date, today);
                  return (
                    <div
                      key={idx}
                      className={`absolute top-0 h-full border-r ${
                        isTodayColumn ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                      } flex items-center justify-center`}
                      style={{
                        left: `${col.x}px`,
                        width: `${col.width}px`,
                      }}
                    >
                      <span className={`text-xs ${isTodayColumn ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
                        {col.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {visibleTracks.map((track, rowIdx) => {
              const trackItems = itemsByTrack.get(track.id) || [];
              const hasChildren = track.children && track.children.length > 0;
              const isCollapsed = collapsedTracks.has(track.id);
              const isSideProject = track.category === 'side_project';

              return (
                <div
                  key={track.id}
                  className="absolute left-0 right-0 flex hover:bg-gray-50 transition-colors"
                  style={{
                    top: `${rowIdx * ROW_HEIGHT}px`,
                    height: `${ROW_HEIGHT}px`,
                  }}
                >
                  <div
                    className="sticky left-0 z-10 bg-white border-r border-b border-gray-200 flex items-center gap-2 px-4"
                    style={{
                      width: `${SIDEBAR_WIDTH}px`,
                      paddingLeft: `${16 + track.depth * 20}px`,
                    }}
                  >
                    {hasChildren && (
                      <button
                        onClick={() => toggleCollapse(track.id)}
                        className="p-0.5 hover:bg-gray-200 rounded"
                      >
                        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>
                    )}

                    {isSideProject && (
                      <Sparkles size={14} className="text-purple-500 flex-shrink-0" />
                    )}

                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: track.color || '#3B82F6' }}
                    ></div>

                    <span className="text-sm font-medium text-gray-900 truncate flex-1">
                      {track.name}
                    </span>

                    <button
                      onClick={() => setAddItemModal({ open: true, trackId: track.id, trackName: track.name })}
                      className="p-1 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Add roadmap item"
                    >
                      <Plus size={14} className="text-blue-600" />
                    </button>
                  </div>

                  <div className="relative flex-1 border-b border-gray-200" style={{ width: `${timelineWidth}px` }}>
                    {columns.map((col, idx) => (
                      <div
                        key={idx}
                        className="absolute top-0 bottom-0 border-r border-gray-100"
                        style={{
                          left: `${col.x}px`,
                          width: `${col.width}px`,
                        }}
                      ></div>
                    ))}

                    {trackItems.map(item => renderItem(item, track))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {addItemModal && (
        <RoadmapItemModal
          open={addItemModal.open}
          trackId={addItemModal.trackId!}
          trackName={addItemModal.trackName}
          onClose={() => setAddItemModal(null)}
          onSubmit={handleAddItem}
        />
      )}
    </div>
  );
}
