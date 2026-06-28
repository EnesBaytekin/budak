import { useState, useRef, useEffect } from "react";
import type { Todo } from "../../types";
import { useTreeStore } from "../../store/treeStore";
import { ChevronRight, Check, Trash2, Plus } from "lucide-react";

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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isDragging = useRef(false);

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
    if (editTitle.trim() && editTitle !== todo.title) {
      updateTodoTitle(todo.id, editTitle.trim());
    }
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

  // Long press → enter drag mode
  const handlePointerDown = () => {
    longPressTimer.current = setTimeout(() => {
      isDragging.current = true;
    }, 400);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    // If we were dragging, don't trigger click
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    // Start native drag
    e.preventDefault();
    // Could implement HTML5 drag, but for now just activate
  };

  // Add sub-task
  const handleAddSub = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = await createTodo("", todo.id);
    if (id) setEditingTodoID(id);
  };

  // HTML5 Drag & Drop for reordering
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", todo.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const rect = rowRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const h = rect.height;

    if (y < h * 0.25) setDragOver("before");
    else if (y > h * 0.75) setDragOver("after");
    else setDragOver("child");
  };

  const handleDragLeave = () => setDragOver(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === todo.id) return;

    const position = dragOver;
    if (position === "child") {
      moveTodoToParent(draggedId, todo.id);
    } else {
      // before/after: move to same parent level
      moveTodoToParent(draggedId, todo.parent_id);
    }
  };

  const isActive = activeTodoID === todo.id;
  const dropClass = dragOver === "before" ? "border-t-2 border-primary" :
    dragOver === "after" ? "border-b-2 border-primary" :
    dragOver === "child" ? "bg-primary/10 rounded-xl" : "";

  return (
    <div className="select-none" draggable onDragStart={handleDragStart}>
      {/* Drop indicator above */}
      {dragOver === "before" && <div className="h-0.5 bg-primary mx-2 rounded-full" />}

      <div
        ref={rowRef}
        className={`group flex items-center gap-2 px-2 py-2.5 rounded-xl transition cursor-pointer ${dropClass} ${
          isActive
            ? "bg-primary/5"
            : todo.done
              ? "opacity-50 hover:bg-base-100"
              : "hover:bg-base-100"
        }`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Collapse */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
            className="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 text-base-content/30 hover:text-base-content/60"
          >
            <ChevronRight size={16} className={`transition-transform ${collapsed ? "" : "rotate-90"}`} />
          </button>
        ) : (
          <div className="w-6 shrink-0" />
        )}

        {/* Checkbox — round, Google Keep style */}
        <button
          onClick={handleToggle}
          className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border-2 transition ${
            todo.done
              ? "bg-success/20 border-success/40 text-success"
              : "border-base-300 hover:border-primary/40 bg-base-100"
          }`}
        >
          {todo.done && <Check size={12} strokeWidth={3} />}
        </button>

        {/* Title */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleInputKey}
            className="flex-1 min-w-0 bg-transparent text-sm text-base-content outline-none px-1 rounded"
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 min-w-0 text-sm leading-relaxed ${
              todo.done ? "line-through text-base-content/40" : "text-base-content"
            }`}
          >
            {todo.title || "untitled"}
          </span>
        )}

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
          {/* Add sub — visible on hover */}
          <button
            onClick={handleAddSub}
            className="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 text-base-content/30 hover:text-primary"
            title="Add sub-task"
          >
            <Plus size={14} />
          </button>
          {/* Indent/outdent */}
          <button
            onClick={(e) => { e.stopPropagation(); indentTodo(todo.id); }}
            className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/20 hover:text-primary/60"
            title="Indent"
          >
            <span className="text-xs font-bold">↳</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); outdentTodo(todo.id); }}
            className="btn btn-ghost btn-xs p-0 w-5 h-5 min-h-0 text-base-content/20 hover:text-secondary/60"
            title="Outdent"
          >
            <span className="text-xs font-bold">↰</span>
          </button>
          {/* Delete */}
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm("Delete?")) deleteTodo(todo.id); }}
            className="btn btn-ghost btn-xs p-0 w-6 h-6 min-h-0 text-base-content/20 hover:text-error/60"
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Drop child indicator */}
      {dragOver === "child" && (
        <div className="text-[10px] text-primary/60 px-4 pb-1 italic">
          drop as child of &quot;{todo.title}&quot;
        </div>
      )}

      {/* Children */}
      {hasChildren && !collapsed && (
        <div>
          {todo.children.map((child) => (
            <TreeNode key={child.id} todo={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
