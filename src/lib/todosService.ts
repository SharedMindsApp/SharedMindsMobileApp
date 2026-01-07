import { supabase } from './supabase';

export type TodoPriority = 'low' | 'medium' | 'high';

export interface PersonalTodo {
  id: string;
  user_id: string;
  household_id: string;
  title: string;
  description?: string;
  completed: boolean;
  completed_at?: string;
  due_date?: string;
  priority: TodoPriority;
  category?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
  shared_spaces?: SharedSpace[];
}

export interface SharedSpace {
  id: string;
  space_id: string;
  space_name?: string;
  shared_at: string;
}

export interface CreateTodoParams {
  householdId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TodoPriority;
  category?: string;
}

export interface UpdateTodoParams {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string;
  priority?: TodoPriority;
  category?: string;
  orderIndex?: number;
}

export async function getPersonalSpace(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, households!inner(type)')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .eq('households.type', 'personal')
    .maybeSingle();

  if (error || !data) return null;
  return data.household_id;
}

export async function getTodos(householdId?: string): Promise<PersonalTodo[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase
    .from('personal_todos')
    .select(`
      *,
      todo_space_shares!left(
        id,
        space_id,
        shared_at,
        households!inner(name)
      )
    `)
    .eq('user_id', user.id)
    .order('completed', { ascending: true })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (householdId) {
    query = query.eq('household_id', householdId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(todo => ({
    ...todo,
    shared_spaces: (todo.todo_space_shares || []).map((share: any) => ({
      id: share.id,
      space_id: share.space_id,
      space_name: share.households?.name,
      shared_at: share.shared_at,
    })),
  }));
}

export async function getSharedTodosInSpace(spaceId: string): Promise<PersonalTodo[]> {
  const { data, error } = await supabase
    .from('personal_todos')
    .select(`
      *,
      todo_space_shares!inner(id, space_id, shared_at)
    `)
    .eq('todo_space_shares.space_id', spaceId)
    .order('completed', { ascending: true })
    .order('order_index', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTodo(params: CreateTodoParams): Promise<PersonalTodo> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: todos } = await supabase
    .from('personal_todos')
    .select('order_index')
    .eq('household_id', params.householdId)
    .order('order_index', { ascending: false })
    .limit(1);

  const maxOrder = todos && todos.length > 0 ? todos[0].order_index : -1;

  const { data, error } = await supabase
    .from('personal_todos')
    .insert({
      user_id: user.id,
      household_id: params.householdId,
      title: params.title,
      description: params.description || null,
      due_date: params.dueDate || null,
      priority: params.priority || 'medium',
      category: params.category || null,
      order_index: maxOrder + 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTodo(todoId: string, params: UpdateTodoParams): Promise<void> {
  const updates: any = {};

  if (params.title !== undefined) updates.title = params.title;
  if (params.description !== undefined) updates.description = params.description;
  if (params.completed !== undefined) {
    updates.completed = params.completed;
    updates.completed_at = params.completed ? new Date().toISOString() : null;
  }
  if (params.dueDate !== undefined) updates.due_date = params.dueDate;
  if (params.priority !== undefined) updates.priority = params.priority;
  if (params.category !== undefined) updates.category = params.category;
  if (params.orderIndex !== undefined) updates.order_index = params.orderIndex;

  const { error } = await supabase
    .from('personal_todos')
    .update(updates)
    .eq('id', todoId);

  if (error) throw error;
}

export async function deleteTodo(todoId: string): Promise<void> {
  const { error } = await supabase
    .from('personal_todos')
    .delete()
    .eq('id', todoId);

  if (error) throw error;
}

export async function shareToSpace(todoId: string, spaceId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('todo_space_shares')
    .insert({
      todo_id: todoId,
      space_id: spaceId,
      shared_by: user.id,
    });

  if (error) throw error;
}

export async function unshareFromSpace(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('todo_space_shares')
    .delete()
    .eq('id', shareId);

  if (error) throw error;
}

export async function getAvailableSpaces(): Promise<Array<{ id: string; name: string; type: string }>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, households!inner(id, name, type)')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .neq('households.type', 'personal');

  if (error) {
    console.error('Error fetching spaces:', error);
    return [];
  }

  return (data || []).map((item: any) => ({
    id: item.households.id,
    name: item.households.name,
    type: item.households.type,
  }));
}

export async function clearCompleted(householdId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('personal_todos')
    .delete()
    .eq('user_id', user.id)
    .eq('household_id', householdId)
    .eq('completed', true);

  if (error) throw error;
}
