import { useState, useRef, useEffect } from "react";
import type { Todo } from "../../types";
import { useTreeStore } from "../../store/treeStore";
import { ChevronRight, Check, Plus, Trash2, GripVertical } from "lucide-react";

interface TreeNodeProps {
  todo: Todo;
  depth: number;
}

export function TreeNode({ todo, depth }: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [collapsed, setCollapsed] = useState(false);
  const [dragOver, setDragOver] = useState<"before" | "after" | "child" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const {
    toggleTodo,
    updateTodoTitle,
    deleteTodo,
    createTodo,
    editingTodoID,
    setEditingTodoID,
    activeTodoID,
    setActiveTodoID,
    indentTodo,
    outdentTodo,
    moveTodoToParent,
    moveBefore,
  } = useTreeStore();
  const hasChildren = todo.children && todo.children.length > 0;

  useEffect(() => {
    if (editingTodoID !== todo.id) return;
    setEditTitle(todo.title);
    setIsEditing(true);
    setEditingTodoID(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [editingTodoID, todo.id, todo.title, setEditingTodoID]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTodo(todo.id, !todo.done);
  };

  const startEdit = () => {
    setEditTitle(todo.title);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const saveEdit = () => {
    if (editTitle.trim() && editTitle !== todo.title) updateTodoTitle(todo.id, editTitle.trim());
    setIsEditing(false);
  };

  const handleClick = () => setActiveTodoID(todo.id);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startEdit();
  };

  const handleInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.stopPropagation(); saveEdit(); }
    if (e.key === "Escape") { e.stopPropagation(); setIsEditing(false); }
    e.stopPropagation();
  };

  const handleAddSub = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = await createTodo("", todo.id);
    if (id) setEditingTodoID(id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", todo.id);
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.stopPropagation();

    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = (e.clientY - rect.top) / rect.height;

    if (y < 0.25) setDragOver("before");
    else if (y > 0.75) setDragOver("after");
    else setDragOver("child");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOver(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = e.dataTransfer.getData("text/plain");
    setDragOver(null);
    if (!draggedId || draggedId === todo.id) return;

    if (dragOver === "child") {
      await moveTodoToParent(draggedId, todo.id);
    } else if (dragOver === "before") {
      await moveBefore(draggedId, todo.id);
    } else {
      const flat = flattenTodos(useTreeStore.getState().todos);
      const siblings = flat.filter((f) => f.parentId === todo.parent_id);
      const idx = siblings.findIndex((s) => s.id === todo.id);
      const next = siblings[idx + 1];
      if (next) {
        await moveBefore(draggedId, next.id);
      } else {
        await moveTodoToParent(draggedId, todo.parent_id);
      }
    }
  };

  const isActive = activeTodoID === todo.id;
  const dropClass =
    dragOver === "before" ? "ring-2 ring-primary/50" :
    dragOver === "after" ? "ring-2 ring-primary/50" :
    dragOver === "child" ? "ring-2 ring-accent/50" : "";

  return (
    <div className="select-none">
      <div style={{ marginLeft: depth > 0 ? 32 : 0 }}
           className={depth > 0 ? "border-l-[3px] border-base-300 pl-3" : ""}>
      {dragOver === "before" && <div className="h-0.5 bg-primary/40 mx-6 rounded-full" />}

      <div
        ref={rowRef}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`mx-2 my-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
          todo.done
            ? "bg-success/5 border border-success/15 shadow-sm"
            : "bg-base-100 border border-base-300/60 shadow-sm hover:shadow-md hover:border-base-300"
        } ${dropClass} ${isActive ? "ring-2 ring-primary/25 shadow-md" : ""}`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center gap-1.5 px-3 py-2.5">

        {/* Drag handle */}
        <span className="text-base-content/20 cursor-grab active:cursor-grabbing shrink-0 hover:text-base-content/40">
          <GripVertical size={14} />
        </span>

        {/* Collapse */}
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/30 hover:text-base-content/60">
            <ChevronRight size={14} className={`transition-transform ${collapsed ? "" : "rotate-90"}`} />
          </button>
        ) : <div className="w-5 shrink-0" />}

        {/* Checkbox */}
        <button onClick={handleToggle}
          className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition ${
            todo.done
              ? "bg-success/30 border-success/50 text-success-content"
              : "border-base-300 hover:border-primary/50 bg-base-100"
          }`}>
          {todo.done && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Title */}
        {isEditing ? (
          <input ref={inputRef} type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveEdit} onKeyDown={handleInputKey}
            className="flex-1 min-w-0 bg-base-200/50 text-sm text-base-content outline-none px-2 py-0.5 rounded" autoFocus />
        ) : (
          <span className={`flex-1 min-w-0 text-sm leading-relaxed ${
            todo.done ? "line-through text-base-content/40" : "text-base-content"
          }`}>
            {todo.title || "untitled"}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleAddSub}
            className="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 text-base-content/40 hover:text-primary"
            title="Add child">
            <Plus size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); indentTodo(todo.id); }}
            className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/30 hover:text-primary/60"
            title="Indent">
            <span className="text-xs font-bold">↳</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); outdentTodo(todo.id); }}
            className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/30 hover:text-secondary/60"
            title="Outdent">
            <span className="text-xs font-bold">↰</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) deleteTodo(todo.id); }}
            className="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 text-base-content/30 hover:text-error/60"
            title="Delete">
            <Trash2 size={12} />
          </button>
        </div>

        {/* Mobile actions (always visible) */}
        <div className="flex items-center gap-0.5 shrink-0 group-hover:hidden sm:hidden">
          <button onClick={handleAddSub}
            className="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 text-base-content/40 hover:text-primary"
            title="Add child">
            <Plus size={14} />
          </button>
        </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && !collapsed && (
        <div>{todo.children.map((child) => <TreeNode key={child.id} todo={child} depth={depth + 1} />)}</div>
      )}
      </div>
    </div>
  );
}

function flattenTodos(todos: Todo[]): { id: string; parentId: string | null }[] {
  const r: { id: string; parentId: string | null }[] = [];
  const walk = (items: Todo[]) => {
    for (const t of items) {
      r.push({ id: t.id, parentId: t.parent_id });
      if (t.children) walk(t.children);
    }
  };
  walk(todos);
  return r;
}
