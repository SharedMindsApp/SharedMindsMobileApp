// components/fridge-canvas/FridgeCanvas.tsx

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, ShieldCheck, Eye, X } from "lucide-react";
import { showToast } from "../Toast";

import { InfiniteCanvas } from "./InfiniteCanvas";
import { CanvasWidget as CanvasWidgetWrapper } from "./CanvasWidget";
import { WidgetToolboxWithColorPicker as WidgetToolbox } from "./WidgetToolboxWithColorPicker";
import { CanvasHeader } from "./CanvasHeader";
import { GroupFrame } from "./GroupFrame";
import { MicroWidgetIcon } from "./MicroWidgetIcon";
import { FullscreenGroupView } from "./FullscreenGroupView";
import { ConfirmDialog } from "../ConfirmDialog";
import { UploadSVGModal } from "./UploadSVGModal";

// Individual widget components
import { NoteWidget } from "./widgets/NoteWidget";
import { ReminderWidget } from "./widgets/ReminderWidget";
import { CalendarCanvasWidget } from "./widgets/CalendarCanvasWidget";
import { GoalCanvasWidget } from "./widgets/GoalCanvasWidget";
import { HabitCanvasWidget } from "./widgets/HabitCanvasWidget";
import { HabitTrackerWidget } from "./widgets/HabitTrackerWidget";
import { AchievementsWidget } from "./widgets/AchievementsWidget";
import { PhotoCanvasWidget } from "./widgets/PhotoCanvasWidget";
import { InsightCanvasWidget } from "./widgets/InsightCanvasWidget";
import { MealPlannerWidget } from "./widgets/MealPlannerWidget";
import { GroceryListWidget } from "./widgets/GroceryListWidget";
import { StackCardCanvasWidget } from "./widgets/StackCardCanvasWidget";
import { FilesCanvasWidget } from "./widgets/FilesCanvasWidget";
import { CollectionsCanvasWidget } from "./widgets/CollectionsCanvasWidget";
import { TablesCanvasWidget } from "./widgets/TablesCanvasWidget";
import { TodoCanvasWidget } from "./widgets/TodoCanvasWidget";
import { CanvasSVGObject } from "./CanvasSVGObject";

import {
  loadHouseholdWidgets,
  createWidget,
  updateWidgetContent,
  updateWidgetLayout,
  deleteWidget,
  getDefaultWidgetContent,
  loadGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  assignWidgetToGroup,
} from "../../lib/fridgeCanvas";

import {
  getCanvasSVGsForSpace,
  createCanvasSVG,
  updateCanvasSVG,
  deleteCanvasSVG,
  bringCanvasSVGForward,
  sendCanvasSVGBackward,
} from "../../lib/canvasSVGService";
import type { CanvasSVGWithFile } from "../../lib/canvasSVGTypes";
import { uploadFile } from "../../lib/filesService";

import {
  WidgetWithLayout,
  WidgetType,
  WidgetLayout,
  WidgetContent,
  NoteContent,
  ReminderContent,
  CalendarContent,
  GoalContent,
  HabitContent,
  PhotoContent,
  InsightContent,
  MealPlannerContent,
  GroceryListContent,
  StackCardContent,
  FilesContent,
  TablesContent,
  GraphicsContent,
  FridgeGroup,
} from "../../lib/fridgeCanvasTypes";

import { useUIPreferences } from "../../contexts/UIPreferencesContext";
import { useHouseholdPermissions } from "../../lib/useHouseholdPermissions";
import { supabase } from "../../lib/supabase";

interface FridgeCanvasProps {
  householdId: string;
}

export function FridgeCanvas({ householdId }: FridgeCanvasProps) {
  const [widgets, setWidgets] = useState<WidgetWithLayout[]>([]);
  const [groups, setGroups] = useState<FridgeGroup[]>([]);
  const [canvasSVGs, setCanvasSVGs] = useState<CanvasSVGWithFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [householdName, setHouseholdName] = useState("");

  // Group-related state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [fullscreenGroupId, setFullscreenGroupId] = useState<string | null>(null);
  const [isMealPlannerFullscreen, setIsMealPlannerFullscreen] = useState(false);

  // Confirmation dialog state
  const [deleteWidgetDialog, setDeleteWidgetDialog] = useState<{ isOpen: boolean; widgetId: string | null }>({
    isOpen: false,
    widgetId: null
  });
  const [deleteGroupDialog, setDeleteGroupDialog] = useState<{ isOpen: boolean; groupId: string | null }>({
    isOpen: false,
    groupId: null
  });

  // SVG upload modal state
  const [showSVGUpload, setShowSVGUpload] = useState(false);

  const { preferences } = useUIPreferences();
  const reducedMotion = preferences?.reduce_motion || false;

  // Centralised permissions hook
  const { role, canEdit, loading: permLoading } =
    useHouseholdPermissions(householdId);

  // ----------------------------
  // MOBILE DETECTION
  // ----------------------------
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ----------------------------
  // LOAD HOUSEHOLD NAME (by ID)
  // ----------------------------
  useEffect(() => {
    const loadName = async () => {
      try {
        const { data, error } = await supabase
          .from("spaces")
          .select("name")
          .eq("id", householdId)
          .single();

        if (!error && data) {
          setHouseholdName(data.name);
        }
      } catch (err) {
        console.error("Error loading household name:", err);
      }
    };

    loadName();
  }, [householdId]);

  // ----------------------------
  // LOAD WIDGETS + LAYOUTS
  // ----------------------------
  const loadWidgets = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        const data = await loadHouseholdWidgets(householdId);
        setWidgets(data);
      } catch (err) {
        console.error("Error loading widgets:", err);
        setError("Failed to load widgets");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [householdId]
  );

  // ----------------------------
  // LOAD GROUPS
  // ----------------------------
  const loadGroupsData = useCallback(
    async (silent = false) => {
      try {
        const data = await loadGroups(householdId);
        setGroups(data);
      } catch (err) {
        console.error("Error loading groups:", err);
        if (!silent) {
          setError("Failed to load groups");
        }
      }
    },
    [householdId]
  );

  // ----------------------------
  // LOAD CANVAS SVGs
  // ----------------------------
  const loadCanvasSVGs = useCallback(
    async (silent = false) => {
      try {
        const data = await getCanvasSVGsForSpace(householdId);
        setCanvasSVGs(data);
      } catch (err) {
        console.error("Error loading canvas SVGs:", err);
        if (!silent) {
          setError("Failed to load canvas SVGs");
        }
      }
    },
    [householdId]
  );

  useEffect(() => {
    loadWidgets();
    loadGroupsData();
    loadCanvasSVGs();
  }, [loadWidgets, loadGroupsData, loadCanvasSVGs]);

  // ----------------------------
  // CREATE WIDGET (only if canEdit)
  // ----------------------------
const handleAddWidget = async (type: WidgetType) => {
  console.log("──────────────────────────────");
  console.log("▶️ handleAddWidget triggered");
  console.log("• householdId:", householdId);
  console.log("• canEdit:", canEdit);
  console.log("• widget type:", type);

  // --------------------------------------
  // Permission Check
  // --------------------------------------
  if (!canEdit) {
    console.warn("⛔ User does NOT have edit permissions.");
    // Phase 6A: Replace silent failure with toast feedback
    showToast('warning', 'You don\'t have permission to edit this space');
    return;
  }

  // --------------------------------------
  // Household ID Check
  // --------------------------------------
  if (!householdId) {
    console.error("❌ Missing householdId — cannot proceed.");
    setError("Household ID is missing — widget cannot be created.");
    return;
  }

  try {
    // --------------------------------------
    // Generate initial content
    // --------------------------------------
    const content = getDefaultWidgetContent(type);
    console.log("• Default widget content:", content);

    // --------------------------------------
    // Build the creation payload explicitly
    // (This lets us see exactly what Supabase will receive)
    // --------------------------------------
    const payloadPreview = {
      household_id: householdId,
      widget_type: type,
      content,
    };

    console.log("📦 Widget INSERT PAYLOAD:", payloadPreview);

    // --------------------------------------
    // Perform create
    // --------------------------------------
    const widget = await createWidget(householdId, type, content);

    console.log("✅ Widget created successfully:", widget);

    // --------------------------------------
    // Update state
    // --------------------------------------
    setWidgets((prev) => [...prev, widget]);
  } catch (err: any) {
    console.error("❌ Widget creation FAILED:", err);

    const message =
      err?.message ||
      err?.error_description ||
      err?.details ||
      "Failed to create widget due to an unknown error.";

    console.error("❌ Error message returned:", message);

    setError(message);
  }

  console.log("──────────────────────────────");
};



  // ----------------------------
  // UPDATE LAYOUT (allowed for all members)
  // Each user has their own layout row.
  // ----------------------------
  const handleLayoutChange = async (
    widgetId: string,
    updates: Partial<WidgetLayout>
  ) => {
    let layoutId: string | null = null;

    setWidgets((prev) =>
      prev.map((w) => {
        if (w.id === widgetId) {
          layoutId = w.layout.id;
          return {
            ...w,
            layout: {
              ...w.layout,
              ...updates,
            },
          };
        }
        return w;
      })
    );

    if (!layoutId) return;

    try {
      await updateWidgetLayout(layoutId, updates);
    } catch (err) {
      console.error("Error saving layout:", err);
    }
  };

  // ----------------------------
  // UPDATE CONTENT (only if canEdit)
  // ----------------------------
  const handleContentChange = async (
    widgetId: string,
    content: WidgetContent
  ) => {
    // Phase 6A: Replace silent failure with toast feedback
    if (!canEdit) {
      showToast('warning', 'You don\'t have permission to edit this space');
      return;
    }

    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, content } : w))
    );

    try {
      await updateWidgetContent(widgetId, content);
    } catch (err) {
      console.error("Error updating content:", err);
    }
  };

  // ----------------------------
  // DELETE WIDGET (only if canEdit)
  // ----------------------------
  const handleDeleteWidget = (widgetId: string) => {
    // Phase 6A: Replace silent failure with toast feedback
    if (!canEdit) {
      showToast('warning', 'You don\'t have permission to edit this space');
      return;
    }
    setDeleteWidgetDialog({ isOpen: true, widgetId });
  };

  const confirmDeleteWidget = async () => {
    const widgetId = deleteWidgetDialog.widgetId;
    if (!widgetId) return;

    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));

    try {
      await deleteWidget(widgetId);
    } catch (err) {
      console.error("Error deleting widget:", err);
      await loadWidgets(true);
    }
  };

  // ----------------------------
  // DRAG & DROP HANDLERS FOR GROUPING
  // ----------------------------
  const handleWidgetDragStart = useCallback((widgetId: string) => {
    setDraggingWidgetId(widgetId);
  }, []);

  const handleWidgetDragMove = useCallback(
    (widgetId: string, x: number, y: number, width: number, height: number) => {
      const widgetCenterX = x + width / 2;
      const widgetCenterY = y + height / 2;

      let foundGroupId: string | null = null;
      for (const group of groups) {
        const isOverGroup =
          widgetCenterX >= group.x &&
          widgetCenterX <= group.x + group.width &&
          widgetCenterY >= group.y &&
          widgetCenterY <= group.y + group.height;

        if (isOverGroup) {
          foundGroupId = group.id;
          break;
        }
      }

      setDragOverGroupId(foundGroupId);
    },
    [groups]
  );

  const handleWidgetDragEnd = useCallback(
    async (widgetId: string) => {
      console.log('🔵 handleWidgetDragEnd called', { widgetId, dragOverGroupId });

      const widget = widgets.find((w) => w.id === widgetId);
      if (!widget) {
        console.log('❌ Widget not found');
        setDraggingWidgetId(null);
        setDragOverGroupId(null);
        return;
      }

      const currentGroupId = widget.group_id;
      console.log('📍 Current group:', currentGroupId, '→ Target group:', dragOverGroupId);

      let targetGroupId: string | null | undefined = undefined;

      if (dragOverGroupId && dragOverGroupId !== currentGroupId) {
        console.log('✅ Moving widget into group:', dragOverGroupId);
        targetGroupId = dragOverGroupId;
      } else if (!dragOverGroupId && currentGroupId) {
        console.log('✅ Removing widget from group');
        targetGroupId = null;
      }

      if (targetGroupId !== undefined && canEdit) {
        console.log('💾 Updating Supabase with group_id:', targetGroupId);

        setWidgets((prev) =>
          prev.map((w) => (w.id === widgetId ? { ...w, group_id: targetGroupId } : w))
        );

        try {
          await assignWidgetToGroup(widgetId, targetGroupId);
          console.log('✅ Successfully assigned widget to group');
        } catch (err) {
          console.error("❌ Error assigning widget to group:", err);
          await loadWidgets(true);
        }
      } else {
        console.log('⏭️ No change needed');
      }

      setDraggingWidgetId(null);
      setDragOverGroupId(null);
    },
    [widgets, dragOverGroupId, canEdit, loadWidgets]
  );

  // ----------------------------
  // GROUP HANDLERS
  // ----------------------------
  const handleAddGroup = async () => {
    if (!canEdit) return;

    try {
      const newGroup = await createGroup(householdId, 200, 200);
      setGroups((prev) => [...prev, newGroup]);
      setSelectedGroupId(newGroup.id);
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  const handleUpdateGroup = async (groupId: string, updates: Partial<FridgeGroup>) => {
    if (!canEdit) return;

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );

    try {
      await updateGroup(groupId, updates);
    } catch (err) {
      console.error("Error updating group:", err);
      await loadGroupsData(true);
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!canEdit) return;
    setDeleteGroupDialog({ isOpen: true, groupId });
  };

  const confirmDeleteGroup = async () => {
    const groupId = deleteGroupDialog.groupId;
    if (!groupId) return;

    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setSelectedGroupId(null);
    setEditingGroupId(null);

    try {
      await deleteGroup(groupId);
      await loadWidgets(true);
    } catch (err) {
      console.error("Error deleting group:", err);
      await loadGroupsData(true);
    }
  };

  const handleAssignWidgetToGroup = async (widgetId: string, groupId: string | null) => {
    if (!canEdit) return;

    setWidgets((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, group_id: groupId } : w))
    );

    try {
      await assignWidgetToGroup(widgetId, groupId);
    } catch (err) {
      console.error("Error assigning widget to group:", err);
      await loadWidgets(true);
    }
  };

  // ----------------------------
  // CANVAS SVG HANDLERS
  // ----------------------------
  const handleSVGUpdate = async (id: string, updates: { x_position?: number; y_position?: number; scale?: number }) => {
    setCanvasSVGs((prev) =>
      prev.map((svg) => (svg.id === id ? { ...svg, ...updates } : svg))
    );

    try {
      await updateCanvasSVG(id, updates);
    } catch (err) {
      console.error("Error updating canvas SVG:", err);
      await loadCanvasSVGs(true);
    }
  };

  const handleSVGDelete = async (id: string) => {
    if (!canEdit) return;

    setCanvasSVGs((prev) => prev.filter((svg) => svg.id !== id));

    try {
      await deleteCanvasSVG(id);
    } catch (err) {
      console.error("Error deleting canvas SVG:", err);
      await loadCanvasSVGs(true);
    }
  };

  const handleSVGBringForward = async (id: string) => {
    if (!canEdit) return;

    try {
      await bringCanvasSVGForward(id, householdId);
      await loadCanvasSVGs(true);
    } catch (err) {
      console.error("Error bringing SVG forward:", err);
    }
  };

  const handleSVGSendBackward = async (id: string) => {
    if (!canEdit) return;

    try {
      await sendCanvasSVGBackward(id, householdId);
      await loadCanvasSVGs(true);
    } catch (err) {
      console.error("Error sending SVG backward:", err);
    }
  };

  const handleSVGUpload = async (file: File, svgContent: string) => {
    if (!canEdit) {
      throw new Error("You do not have permission to upload graphics.");
    }

    try {
      // Upload file to storage and create file record
      const fileRecord = await uploadFile({
        file,
        space_id: householdId,
        space_type: 'shared',
      });

      // Create canvas SVG object
      const svgObject = await createCanvasSVG({
        space_id: householdId,
        source_file_id: fileRecord.id,
        x_position: 100,
        y_position: 100,
        scale: 1.0,
      });

      // Reload SVGs to get the file URL
      await loadCanvasSVGs(true);
    } catch (err: any) {
      console.error("Error uploading SVG:", err);
      throw new Error(err.message || "Failed to upload SVG graphic");
    }
  };

  // ----------------------------
  // RENDER WIDGET CONTENT
  // ----------------------------
  const renderWidget = (widget: WidgetWithLayout) => {
    const viewMode = widget.layout.size_mode; // 'icon' | 'mini' | 'large' | 'xlarge'

    switch (widget.widget_type) {
      case "note":
        return (
          <NoteWidget
            content={widget.content as NoteContent}
            viewMode={viewMode}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "reminder":
        return (
          <ReminderWidget
            content={widget.content as ReminderContent}
            viewMode={viewMode}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "calendar":
        return (
          <CalendarCanvasWidget
            householdId={householdId}
            viewMode={viewMode}
            onViewModeChange={(newMode) => handleLayoutUpdate(widget.id, { size_mode: newMode })}
            onNewEvent={() => {
              console.log('New event clicked - implement event creation modal');
            }}
          />
        );

      case "goal":
        return (
          <GoalCanvasWidget
            content={widget.content as GoalContent}
            viewMode={viewMode}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "habit":
        return (
          <HabitCanvasWidget
            content={widget.content as HabitContent}
            viewMode={viewMode}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "photo":
        return (
          <PhotoCanvasWidget
            content={widget.content as PhotoContent}
            viewMode={viewMode}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "insight":
        return (
          <InsightCanvasWidget
            content={widget.content as InsightContent}
            viewMode={viewMode}
          />
        );

      case "habit_tracker":
        return (
          <HabitTrackerWidget
            householdId={householdId}
          />
        );

      case "achievements":
        return (
          <AchievementsWidget
            householdId={householdId}
          />
        );

      case "meal_planner":
        return (
          <MealPlannerWidget
            householdId={householdId}
            viewMode={viewMode}
            content={widget.content as MealPlannerContent}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
            onViewModeChange={(mode) => handleLayoutChange(widget.id, { size_mode: mode })}
            onFullscreenChange={setIsMealPlannerFullscreen}
          />
        );

      case "grocery_list":
        return (
          <GroceryListWidget
            householdId={householdId}
            viewMode={viewMode}
            content={widget.content as GroceryListContent}
            onContentChange={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "todos":
        return (
          <TodoCanvasWidget
            householdId={householdId}
            viewMode={viewMode}
          />
        );

      case "stack_card":
        return (
          <StackCardCanvasWidget
            content={widget.content as StackCardContent}
            onUpdate={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      case "files":
        return (
          <FilesCanvasWidget
            content={widget.content as FilesContent}
            onUpdate={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
            onAddToCanvas={() => loadCanvasSVGs(true)}
          />
        );

      case "collections":
        return (
          <CollectionsCanvasWidget
            spaceId={householdId}
            spaceType="shared"
            sizeMode={widget.layout.size_mode}
          />
        );

      case "tables":
        return (
          <TablesCanvasWidget
            widgetId={widget.id}
            content={widget.content as TablesContent}
            sizeMode={widget.layout.size_mode}
            spaceId={householdId}
            spaceType="shared"
            onUpdate={
              canEdit ? (c) => handleContentChange(widget.id, c) : undefined
            }
          />
        );

      default:
        return (
          <div className="p-4 text-gray-600 text-sm">
            Unknown widget type
          </div>
        );
    }
  };

  // ----------------------------
  // LOADING / ERROR STATES
  // ----------------------------
  if (loading || permLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={48}
            className="animate-spin text-orange-500 mx-auto mb-4"
          />
          <p className="text-gray-700 font-medium">
            Loading your fridge board...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => loadWidgets(false)}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Phase 6A: Mobile canvas disclaimer state
  const [showMobileDisclaimer, setShowMobileDisclaimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    const dismissed = sessionStorage.getItem('mobile_canvas_disclaimer_dismissed');
    return !dismissed && window.innerWidth < 768;
  });

  // ----------------------------
  // MAIN RENDER
  // ----------------------------
  return (
    <>
      <CanvasHeader householdName={householdName} />

      {/* Phase 6A: Mobile canvas disclaimer - dismissible notice */}
      {showMobileDisclaimer && isMobile && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">
                Advanced canvas editing works best on desktop
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can view and interact with widgets, but some actions like drag and resize are optimized for desktop.
              </p>
            </div>
            <button
              onClick={() => {
                setShowMobileDisclaimer(false);
                sessionStorage.setItem('mobile_canvas_disclaimer_dismissed', 'true');
              }}
              className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Phase 6A: Mobile canvas disclaimer - dismissible notice */}
      {showMobileDisclaimer && isMobile && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md mx-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">
                Advanced canvas editing works best on desktop
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can view and interact with widgets, but some actions like drag and resize are optimized for desktop.
              </p>
            </div>
            <button
              onClick={() => {
                setShowMobileDisclaimer(false);
                sessionStorage.setItem('mobile_canvas_disclaimer_dismissed', 'true');
              }}
              className="text-blue-400 hover:text-blue-600 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Permission badge */}
      <div className="fixed top-20 right-4 z-40">
        {canEdit ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-1.5 rounded-full shadow-sm">
            <ShieldCheck size={14} />
            <span>
              {role === "owner"
                ? "Household owner • Full edit access"
                : "Editor • Can edit widgets"}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-800 text-xs px-3 py-1.5 rounded-full shadow-sm">
            <Eye size={14} />
            <span>
              Viewer mode • You can move things, but only adults can edit
            </span>
          </div>
        )}
      </div>

      <InfiniteCanvas reducedMotion={reducedMotion} disableInteraction={isMealPlannerFullscreen}>
        {/* Render canvas SVGs first (lowest layer) */}
        {canvasSVGs.map((svg) => (
          <CanvasSVGObject
            key={svg.id}
            svg={svg}
            onUpdate={handleSVGUpdate}
            onDelete={handleSVGDelete}
            onBringForward={handleSVGBringForward}
            onSendBackward={handleSVGSendBackward}
          />
        ))}

        {/* Render groups */}
        {groups.map((group) => {
          const widgetsInGroup = widgets.filter((w) => w.group_id === group.id);
          return (
            <GroupFrame
              key={group.id}
              group={group}
              isSelected={selectedGroupId === group.id}
              isEditMode={editingGroupId === group.id}
              isDragOver={dragOverGroupId === group.id}
              zoom={1}
              canEdit={canEdit}
              onUpdate={(updates) => handleUpdateGroup(group.id, updates)}
              onDelete={() => handleDeleteGroup(group.id)}
              onSelect={() => setSelectedGroupId(group.id)}
              onEnterEditMode={() => {
                setEditingGroupId(group.id);
                setSelectedGroupId(group.id);
              }}
              onOpenFullscreen={() => setFullscreenGroupId(group.id)}
            >
              {/* Micro widget icons inside the group */}
              {widgetsInGroup.map((widget, index) => (
                <MicroWidgetIcon
                  key={widget.id}
                  widget={widget}
                  index={index}
                  onClick={() => setFullscreenGroupId(group.id)}
                />
              ))}
            </GroupFrame>
          );
        })}

        {/* Render widgets not in any group */}
        {widgets
          .filter((w) => !w.group_id)
          .map((widget) => (
            <CanvasWidgetWrapper
              key={widget.id}
              layout={widget.layout}
              onLayoutChange={(updates) => handleLayoutChange(widget.id, updates)}
              onDelete={canEdit ? () => handleDeleteWidget(widget.id) : undefined}
              onDragStart={handleWidgetDragStart}
              onDragMove={handleWidgetDragMove}
              onDragEnd={handleWidgetDragEnd}
              isBeingDragged={draggingWidgetId === widget.id}
              reducedMotion={reducedMotion}
              widgetType={widget.widget_type}
            >
              {renderWidget(widget)}
            </CanvasWidgetWrapper>
          ))}

        {/* Empty state */}
        {widgets.length === 0 && groups.length === 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-orange-200 p-8 max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Welcome to your Fridge Board!
              </h2>
              <p className="text-gray-600 mb-4">
                {canEdit
                  ? "Click the + button in the bottom right to add widgets or create groups."
                  : "Your board is ready. An adult can add widgets from their account."}
              </p>
              <p className="text-sm text-gray-500">
                Add notes, reminders, photos, goals, habits — make the space
                yours.
              </p>
            </div>
          </div>
        )}
      </InfiniteCanvas>

      {/* Toolbox only for editors/owners */}
      {canEdit && (
        <WidgetToolbox
          onAddWidget={handleAddWidget}
          onAddGroup={handleAddGroup}
          onOpenSVGUpload={() => setShowSVGUpload(true)}
          householdId={householdId}
          isMobile={isMobile}
        />
      )}

      {/* SVG Upload Modal */}
      <UploadSVGModal
        isOpen={showSVGUpload}
        onClose={() => setShowSVGUpload(false)}
        onUpload={handleSVGUpload}
      />

      {/* Fullscreen Group View */}
      {fullscreenGroupId && (() => {
        const group = groups.find((g) => g.id === fullscreenGroupId);
        const widgetsInGroup = widgets.filter((w) => w.group_id === fullscreenGroupId);

        if (!group) return null;

        return (
          <FullscreenGroupView
            group={group}
            widgets={widgetsInGroup}
            onClose={() => setFullscreenGroupId(null)}
          >
            {/* Render full-size widgets in fullscreen */}
            {widgetsInGroup.map((widget) => (
              <CanvasWidgetWrapper
                key={widget.id}
                layout={widget.layout}
                onLayoutChange={(updates) => handleLayoutChange(widget.id, updates)}
                onDelete={canEdit ? () => handleDeleteWidget(widget.id) : undefined}
                reducedMotion={reducedMotion}
                widgetType={widget.widget_type}
              >
                {renderWidget(widget)}
              </CanvasWidgetWrapper>
            ))}
          </FullscreenGroupView>
        );
      })()}

      <ConfirmDialog
        isOpen={deleteWidgetDialog.isOpen}
        onClose={() => setDeleteWidgetDialog({ isOpen: false, widgetId: null })}
        onConfirm={confirmDeleteWidget}
        title="Delete Widget?"
        message="Are you sure you want to delete this widget? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deleteGroupDialog.isOpen}
        onClose={() => setDeleteGroupDialog({ isOpen: false, groupId: null })}
        onConfirm={confirmDeleteGroup}
        title="Delete Group?"
        message="Are you sure you want to delete this group? Widgets inside will not be deleted and will remain on the canvas."
        confirmText="Delete Group"
        cancelText="Cancel"
        variant="warning"
      />
    </>
  );
}
