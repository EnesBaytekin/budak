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

  const { toggleTodo, updateTodoTitle, deleteTodo, createTodo } = useTreeStore();
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
        className={`group flex items-center gap-1.5 py-1 px-1 rounded-md hover:bg-gray-100 transition ${
          todo.done ? "opacity-60" : ""
        }`}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${collapsed ? "" : "rotate-90"}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="w-5 shrink-0" />
        )}

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={todo.done}
          onChange={handleToggle}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
        />

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
            className="flex-1 min-w-0 px-1.5 py-0.5 text-sm border border-blue-400 rounded outline-none focus:ring-1 focus:ring-blue-400"
            autoFocus
          />
        ) : (
          <span
            onClick={handleTitleClick}
            className={`flex-1 min-w-0 text-sm cursor-text truncate ${
              todo.done ? "line-through text-gray-400" : "text-gray-800"
            }`}
          >
            {todo.title || "Untitled"}
          </span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => { setIsAddingChild(true); setTimeout(() => childInputRef.current?.focus(), 0); }}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
            title="Add sub-task"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => { if (confirm("Delete this todo?")) deleteTodo(todo.id); }}
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add child input */}
      {isAddingChild && (
        <div style={{ paddingLeft: `${(depth + 1) * 24 + 32}px` }} className="py-1">
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
            placeholder="Add sub-task..."
            className="w-full max-w-xs px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-400 outline-none"
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
