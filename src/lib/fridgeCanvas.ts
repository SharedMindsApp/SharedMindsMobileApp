// lib/fridgeCanvas.ts

import { supabase } from "./supabase";
import { getSupabaseClient } from "./supabaseClientWithToken";
import {
  FridgeWidget,
  FridgeGroup,
  WidgetWithLayout,
  WidgetLayout,
  WidgetType,
  WidgetContent,
  NoteContent,
  TaskContent,
  CalendarContent,
  GoalContent,
  HabitContent,
  PhotoContent,
  InsightContent,
  ReminderContent,
  AgreementContent,
  StackCardContent,
  TablesContent,
  CustomContent,
} from "./fridgeCanvasTypes";
import { createStackCardWithInitialCards } from "./stackCards";

/* ======================================================================
   UTIL: FETCH PROFILE.ID (REQUIRED FOR ALL RLS LOGIC)
   ====================================================================== */
async function getProfileId(): Promise<string> {
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!auth.user) throw new Error("User not authenticated");

  const userId = auth.user.id;

  const sb = await getSupabaseClient();
  const { data: profile, error: pErr } = await sb
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!profile) throw new Error("Profile not found");

  return profile.id; // THIS is what RLS checks against
}

/* ======================================================================
   UTIL: FETCH HOUSEHOLD_MEMBERS.ID FOR WIDGET CREATION
   ====================================================================== */
async function getMemberId(householdId: string, profileId: string): Promise<string> {
  const sb = await getSupabaseClient();
  const { data: member, error } = await sb
    .from("space_members")
    .select("id")
    .eq("space_id", householdId)
    .eq("user_id", profileId)
    .maybeSingle();

  if (error) throw error;
  if (!member) throw new Error("User is not a member of this household");

  return member.id;
}

/* ======================================================================
   CREATE DEFAULT LAYOUT FOR THIS USER
   ====================================================================== */
async function createDefaultLayout(
  widgetId: string,
  profileId: string
): Promise<WidgetLayout> {
  const randomX = Math.floor(Math.random() * 600) + 200;
  const randomY = Math.floor(Math.random() * 600) + 200;
  const randomRotation = (Math.random() - 0.5) * 6;

  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_widget_layouts")
    .insert({
      widget_id: widgetId,
      member_id: profileId, // IMPORTANT — NOT auth.uid
      position_x: randomX,
      position_y: randomY,
      size_mode: "mini",
      z_index: 1,
      rotation: randomRotation,
      is_collapsed: false,
      group_id: null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as WidgetLayout;
}

/* ======================================================================
   LOAD WIDGETS + USER LAYOUTS
   ====================================================================== */
export async function loadHouseholdWidgets(
  householdId: string
): Promise<WidgetWithLayout[]> {
  const profileId = await getProfileId();

  const sb = await getSupabaseClient();

  // Load widgets (exclude deleted ones)
  const { data: widgets, error: wErr } = await sb
    .from("fridge_widgets")
    .select("*")
    .eq("space_id", householdId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (wErr) throw wErr;
  if (!widgets || widgets.length === 0) return [];

  const widgetIds = widgets.map((w) => w.id);

  // Load layouts for this user
  const { data: layouts, error: layoutErr } = await sb
    .from("fridge_widget_layouts")
    .select("*")
    .eq("member_id", profileId)
    .in("widget_id", widgetIds.length ? widgetIds : ["_"]);

  if (layoutErr) throw layoutErr;

  const layoutMap = new Map<string, WidgetLayout>(
    (layouts ?? []).map((l) => [l.widget_id, l])
  );

  const results: WidgetWithLayout[] = [];

  for (const widget of widgets as FridgeWidget[]) {
    let layout = layoutMap.get(widget.id);

    // Auto-create missing layout for this user
    if (!layout) layout = await createDefaultLayout(widget.id, profileId);

    // Defensive defaults
    if (!layout.size_mode) layout.size_mode = "mini";
    if (layout.position_x == null) layout.position_x = 200;
    if (layout.position_y == null) layout.position_y = 200;

    results.push({ ...widget, layout });
  }

  return results;
}

/* ======================================================================
   GET SINGLE WIDGET BY ID
   ====================================================================== */
export async function getWidgetById(widgetId: string): Promise<WidgetWithLayout | null> {
  const profileId = await getProfileId();

  const sb = await getSupabaseClient();

  // Load widget
  const { data: widget, error: wErr } = await sb
    .from("fridge_widgets")
    .select("*")
    .eq("id", widgetId)
    .is("deleted_at", null)
    .maybeSingle();

  if (wErr) throw wErr;
  if (!widget) return null;

  // Load layout for this user
  const { data: layout, error: layoutErr } = await sb
    .from("fridge_widget_layouts")
    .select("*")
    .eq("widget_id", widgetId)
    .eq("member_id", profileId)
    .maybeSingle();

  if (layoutErr) throw layoutErr;

  let widgetLayout = layout;
  if (!widgetLayout) {
    widgetLayout = await createDefaultLayout(widget.id, profileId);
  }

  // Defensive defaults
  if (!widgetLayout.size_mode) widgetLayout.size_mode = "mini";
  if (widgetLayout.position_x == null) widgetLayout.position_x = 200;
  if (widgetLayout.position_y == null) widgetLayout.position_y = 200;

  return { ...widget, layout: widgetLayout };
}

/* ======================================================================
   CREATE WIDGET — NOW FIXED TO USE profile.id (NOT auth.uid)
   ====================================================================== */
// lib/fridgeCanvas.ts

export async function createWidget(
  householdId: string,
  widgetType: WidgetType,
  content: WidgetContent
): Promise<WidgetWithLayout> {
  console.log("🟦 createWidget() starting…");

  // 1️⃣ Get authenticated user
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr) {
    console.error("❌ auth.getUser error:", authErr);
    throw authErr;
  }
  if (!authData.user) throw new Error("User not authenticated");

  const authUserId = authData.user.id;
  console.log("🟦 createWidget() → auth.uid():", authUserId);

  // 2️⃣ Load their profile.id
  const sb = await getSupabaseClient();
  const { data: profile, error: profileErr } = await sb
    .from("profiles")
    .select("id")
    .eq("user_id", authUserId)
    .single();

  console.log("🟩 profile lookup:", profile, profileErr);

  if (profileErr || !profile) {
    console.error("❌ No profile found for user:", authUserId);
    throw new Error("Profile not found for authenticated user.");
  }

  const profileId = profile.id;

  // 3️⃣ If creating a stack_card widget, create the stack_cards record first
  let widgetContent = content;
  if (widgetType === 'stack_card') {
    const stack = await createStackCardWithInitialCards({
      title: 'Revision Cards',
      color_scheme: 'cyan',
      space_id: householdId,
    });
    widgetContent = {
      stackId: stack.id,
      title: stack.title,
      cardCount: 6,
      colorScheme: stack.color_scheme,
    } as StackCardContent;
  }

  // Map widget type to proper display name
  const widgetTypeNames: Record<WidgetType, string> = {
    note: 'Note',
    task: 'Task',
    reminder: 'Reminder',
    calendar: 'Calendar',
    goal: 'Goal',
    habit: 'Habit',
    habit_tracker: 'Habit Tracker',
    achievements: 'Achievements',
    photo: 'Photo',
    insight: 'Insight',
    agreement: 'Agreement',
    meal_planner: 'Meal Planner',
    grocery_list: 'Grocery List',
    stack_card: 'Stack Cards',
    files: 'Files',
    collections: 'Collections',
    tables: 'Tables',
    todos: 'Todos',
    custom: 'Custom Widget',
  };

  const widgetName = widgetTypeNames[widgetType] || 'Widget';

  // 4️⃣ Build exact payload Supabase will receive
  const insertPayload = {
    space_id: householdId,
    created_by: profileId,
    widget_type: widgetType,
    title: widgetName,
    content: widgetContent,
    color: "yellow",
    icon: "StickyNote",
  };

  console.log("📦 REAL INSERT PAYLOAD:", insertPayload);

  // 5️⃣ Perform INSERT (reuse sb from above)
  const { data: widget, error: widgetErr } = await sb
    .from("fridge_widgets")
    .insert(insertPayload)
    .select("*")
    .single();

  console.log("🟥 INSERT RESPONSE:", widget, widgetErr);

  if (widgetErr) {
    console.error("❌ Widget insert failed:", widgetErr);
    throw widgetErr;
  }

  // 6️⃣ Create layout row for this profile
  const layout = await createDefaultLayout(widget.id, profileId);

  return { ...(widget as FridgeWidget), layout };
}


/* ======================================================================
   UPDATE WIDGET CONTENT (owners/editors only via RLS)
   ====================================================================== */
export async function updateWidgetContent(
  widgetId: string,
  content: WidgetContent
): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widgets")
    .update({ content })
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   UPDATE LAYOUT (everyone allowed via RLS)
   ====================================================================== */
export async function updateWidgetLayout(
  layoutId: string,
  updates: Partial<WidgetLayout>
): Promise<void> {
  const { id, widget_id, member_id, updated_at, ...safe } = updates;

  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widget_layouts")
    .update(safe)
    .eq("id", layoutId);

  if (error) throw error;
}

/* ======================================================================
   DELETE WIDGET (soft delete - moves to trash)
   ====================================================================== */
export async function deleteWidget(widgetId: string): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widgets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   RESTORE WIDGET (undelete from trash)
   ====================================================================== */
export async function restoreWidget(widgetId: string): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_widgets")
    .update({ deleted_at: null })
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   PERMANENTLY DELETE WIDGET (hard delete)
   ====================================================================== */
export async function permanentlyDeleteWidget(widgetId: string): Promise<void> {
  const sb = await getSupabaseClient();

  // Delete layouts first
  await sb.from("fridge_widget_layouts").delete().eq("widget_id", widgetId);

  // Then delete widget
  const { error } = await sb
    .from("fridge_widgets")
    .delete()
    .eq("id", widgetId);

  if (error) throw error;
}

/* ======================================================================
   GET DELETED WIDGETS (trash)
   ====================================================================== */
export async function getDeletedWidgets(
  householdId: string
): Promise<FridgeWidget[]> {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_widgets")
    .select("*")
    .eq("space_id", householdId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/* ======================================================================
   DEFAULT WIDGET CONTENT
   ====================================================================== */
export function getDefaultWidgetContent(type: WidgetType): WidgetContent {
  switch (type) {
    case "note":
      return { text: "", fontSize: "text-base" } as NoteContent;
    case "task":
      return { description: "", completed: false } as TaskContent;
    case "calendar":
      return { eventCount: 0, events: [] } as CalendarContent;
    case "goal":
      return { progress: 0, target: 100 } as GoalContent;
    case "habit":
      return { streak: 0, frequency: "daily", completedToday: false } as HabitContent;
    case "habit_tracker":
      return { totalHabits: 0, completedToday: 0, totalStreak: 0, totalCompletions: 0 };
    case "achievements":
      return { totalAchievements: 0, unlockedCount: 0, progressPercentage: 0 };
    case "photo":
      return { url: "" } as PhotoContent;
    case "insight":
      return { category: "general" } as InsightContent;
    case "reminder":
      return { title: "", message: "", priority: "medium", completed: false } as ReminderContent;
    case "agreement":
      return { rules: [], agreedBy: [] } as AgreementContent;
    case "meal_planner":
      return { weekPlan: {} };
    case "grocery_list":
      return { items: [] };
    case "stack_card":
      return { stackId: '', title: '', cardCount: 0, colorScheme: 'cyan' } as StackCardContent;
    case "files":
      return { spaceId: null, spaceType: 'personal', fileCount: 0 };
    case "collections":
      return {};
    case "tables":
      return { tableId: '', tableName: '', rowCount: 0, columnCount: 0 } as TablesContent;
    default:
      return {} as CustomContent;
  }
}

/* ======================================================================
   GROUP MANAGEMENT FUNCTIONS
   ====================================================================== */

/* ======================================================================
   LOAD GROUPS
   ====================================================================== */
export async function loadGroups(householdId: string): Promise<FridgeGroup[]> {
  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_groups")
    .select("*")
    .eq("space_id", householdId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/* ======================================================================
   CREATE GROUP
   ====================================================================== */
export async function createGroup(
  householdId: string,
  x: number,
  y: number
): Promise<FridgeGroup> {
  const profileId = await getProfileId();
  const sb = await getSupabaseClient();

  const { data, error } = await sb
    .from("fridge_groups")
    .insert({
      space_id: householdId,
      created_by: profileId,
      title: "New Group",
      x,
      y,
      width: 500,
      height: 400,
      color: "gray",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as FridgeGroup;
}

/* ======================================================================
   UPDATE GROUP
   ====================================================================== */
export async function updateGroup(
  groupId: string,
  updates: Partial<Omit<FridgeGroup, "id" | "space_id" | "created_by" | "created_at">>
): Promise<void> {
  const sb = await getSupabaseClient();
  const { error } = await sb
    .from("fridge_groups")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", groupId);

  if (error) throw error;
}

/* ======================================================================
   DELETE GROUP
   ====================================================================== */
export async function deleteGroup(groupId: string): Promise<void> {
  const sb = await getSupabaseClient();

  // First, unassign all widgets from this group
  await sb
    .from("fridge_widgets")
    .update({ group_id: null })
    .eq("group_id", groupId);

  // Then delete the group
  const { error } = await sb
    .from("fridge_groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

/* ======================================================================
   ASSIGN WIDGET TO GROUP
   ====================================================================== */
export async function assignWidgetToGroup(
  widgetId: string,
  groupId: string | null
): Promise<void> {
  console.log('🔵 assignWidgetToGroup called', { widgetId, groupId });

  const sb = await getSupabaseClient();
  const { data, error } = await sb
    .from("fridge_widgets")
    .update({ group_id: groupId })
    .eq("id", widgetId)
    .select("*")
    .single();

  console.log('💾 Supabase update result:', { data, error });

  if (error) {
    console.error('❌ Supabase update failed:', error);
    throw error;
  }

  console.log('✅ Widget group assignment successful');
}
