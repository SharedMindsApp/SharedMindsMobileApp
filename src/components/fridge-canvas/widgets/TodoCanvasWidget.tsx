import { CheckSquare, Plus, Share2, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WidgetViewMode } from '../../../lib/fridgeCanvasTypes';
import * as todosService from '../../../lib/todosService';
import type { PersonalTodo } from '../../../lib/todosService';

interface TodoCanvasWidgetProps {
  householdId: string;
  viewMode: WidgetViewMode;
}

export function TodoCanvasWidget({ householdId, viewMode }: TodoCanvasWidgetProps) {
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  useEffect(() => {
    loadTodos();
  }, [householdId]);

  const loadTodos = async () => {
    try {
      const data = await todosService.getTodos(householdId);
      setTodos(data);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (todo: PersonalTodo) => {
    try {
      await todosService.updateTodo(todo.id, { completed: !todo.completed });
      await loadTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      await todosService.createTodo({
        householdId,
        title: newTodoTitle,
      });
      setNewTodoTitle('');
      setShowAddInput(false);
      await loadTodos();
    } catch (error) {
      console.error('Error creating todo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await todosService.deleteTodo(id);
      await loadTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
    }
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedCount = todos.filter(t => t.completed).length;

  if (viewMode === 'micro') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <CheckSquare className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
          <div className="text-xs font-medium text-slate-700">{activeTodos.length}</div>
          <div className="text-xs text-slate-500">tasks</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <p className="text-slate-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">To-Do List</h3>
        </div>
        <button
          onClick={() => setShowAddInput(!showAddInput)}
          className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAddInput && (
        <form onSubmit={handleAdd} className="mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="New task..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {todos.length > 0 && (
        <div className="text-xs text-emerald-700 mb-3 bg-emerald-50 px-2 py-1 rounded">
          {completedCount} of {todos.length} completed
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {activeTodos.length === 0 && completedCount === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No tasks yet</p>
          </div>
        ) : activeTodos.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">All tasks completed!</p>
          </div>
        ) : (
          activeTodos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-start gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <button
                onClick={() => handleToggle(todo)}
                className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 hover:border-emerald-400 transition-colors mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 break-words">{todo.title}</p>
                {todo.shared_spaces && todo.shared_spaces.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Share2 className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-600">
                      Shared
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(todo.id)}
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
