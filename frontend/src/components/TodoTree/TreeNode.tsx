import { useState, useRef } from "react";
import type { Todo } from "../../types";
import { useTreeStore } from "../../store/treeStore";

interface TreeNodeProps {
  todo: Todo;
  depth: number;
}

export function TreeNode({ todo, depth }: TreeNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const childInputRef = useRef<HTMLInputElement>(null);

  const { toggleTodo, updateTodoTitle, deleteTodo, createTodo, indentTodo, outdentTodo } = useTreeStore();
  const hasChildren = todo.children && todo.children.length > 0;

  const handleToggle = () => {
    toggleTodo(todo.id, !todo.done);
  };

  const handleTitleClick = () => {
    setEditTitle(todo.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== todo.title) {
      updateTodoTitle(todo.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleAddChild = async () => {
    if (!childTitle.trim()) return;
    await createTodo(childTitle.trim(), todo.id);
    setChildTitle("");
    setIsAddingChild(false);
    setCollapsed(false);
  };

  return (
    <div className="select-none">
      <div
        className={`group flex items-center gap-1 py-1 px-2 rounded-sm transition ${
          todo.done ? "opacity-50" : "hover:bg-hover"
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {/* indent / outdent handles */}
        <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition shrink-0 mr-0.5">
          <button
            onClick={() => indentTodo(todo.id)}
            className="w-5 h-5 flex items-center justify-center text-fg-muted hover:text-blue rounded-sm hover:bg-hover transition"
            title="Make child of previous item"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h12M3 14h12M3 18h18" />
            </svg>
          </button>
          <button
            onClick={() => outdentTodo(todo.id)}
            className="w-5 h-5 flex items-center justify-center text-fg-muted hover:text-peach rounded-sm hover:bg-hover transition"
            title="Move up one level"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M9 6l-6 6 6 6" />
            </svg>
          </button>
        </div>

        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-4 h-4 flex items-center justify-center text-fg-muted hover:text-fg shrink-0"
          >
            <svg
              className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition ${
            todo.done
              ? "bg-mint/30 border-mint/50 text-mint"
              : "bg-elevated border-border hover:border-lavender/50"
          }`}
        >
          {todo.done && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Title */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleSave();
              if (e.key === "Escape") setIsEditing(false);
            }}
            className="flex-1 min-w-0 bg-elevated border border-lavender/50 rounded-sm px-1.5 py-0.5 text-sm text-fg outline-none"
            autoFocus
          />
        ) : (
          <span
            onClick={handleTitleClick}
            className={`flex-1 min-w-0 text-sm cursor-text truncate ${
              todo.done ? "line-through text-fg-muted" : "text-fg"
            }`}
          >
            {todo.title || "untitled"}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            onClick={() => { setIsAddingChild(true); setTimeout(() => childInputRef.current?.focus(), 0); }}
            className="w-6 h-6 flex items-center justify-center text-fg-muted hover:text-mint rounded-sm hover:bg-hover transition"
            title="Add sub-task"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => { if (confirm("Delete this todo?")) deleteTodo(todo.id); }}
            className="w-6 h-6 flex items-center justify-center text-fg-muted hover:text-danger rounded-sm hover:bg-danger-bg transition"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add child input */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 20 + 32}px` }} className="py-1">
          <input
            ref={childInputRef}
            type="text"
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChild();
              if (e.key === "Escape") { setIsAddingChild(false); setChildTitle(""); }
            }}
            onBlur={() => { if (!childTitle.trim()) { setIsAddingChild(false); } }}
            placeholder="add sub-task..."
            className="w-full max-w-xs bg-elevated border border-border rounded-sm px-2 py-1 text-xs text-fg placeholder:text-fg-muted outline-none focus:border-mint/50 transition"
          />
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
