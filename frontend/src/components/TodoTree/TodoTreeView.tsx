import { useState, useRef, useEffect } from "react";
import { useTreeStore } from "../../store/treeStore";
import { TreeNode } from "./TreeNode";
import { Plus } from "lucide-react";
import type { Todo } from "../../types";

export function TodoTreeView() {
  const { todos, createTodo, setEditingTodoID, activeTodoID, setActiveTodoID } = useTreeStore();
  const [newTitle, setNewTitle] = useState("");
  const [insertAfterID, setInsertAfterID] = useState<string | null>(null);
  const [mode, setMode] = useState<"bottom" | "sibling">("bottom");
  const inputRef = useRef<HTMLInputElement>(null);
  const insertRef = useRef<HTMLDivElement>(null);

  // When a todo is selected, switch to sibling mode
  useEffect(() => {
    if (activeTodoID) {
      setInsertAfterID(activeTodoID);
      setMode("sibling");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        insertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [activeTodoID, todos]);

  const handleSubmit = async (title?: string) => {
    const text = title ?? newTitle;

    if (mode === "sibling" && insertAfterID) {
      // Add sibling after the selected todo (same parent)
      const pid = getParentOfTodo(insertAfterID, todos);
      const id = await createTodo(text, pid);
      if (id) setEditingTodoID(id);
    } else {
      // Add to bottom as root
      const id = await createTodo(text, null);
      if (id) setEditingTodoID(id);
    }

    setNewTitle("");
    setActiveTodoID(null);
    setMode("bottom");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleSubmit();
      return;
    }
    if (e.key === "Escape") {
      setActiveTodoID(null);
      setInsertAfterID(null);
      setMode("bottom");
      setNewTitle("");
    }
  };

  // Clear selection on pane click
  const handlePaneClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.pane) {
      setActiveTodoID(null);
      setInsertAfterID(null);
      setMode("bottom");
    }
  };

  // Global Enter to refocus bottom input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        if (mode === "bottom") {
          e.preventDefault();
          inputRef.current?.focus();
        } else {
          // If in sibling mode, pressing Enter globally submits
          e.preventDefault();
          const pid = activeTodoID ? getParentOfTodo(activeTodoID, todos) : null;
          createTodo("", pid).then((id) => {
            if (id) setEditingTodoID(id);
            setActiveTodoID(null);
            setMode("bottom");
          });
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, activeTodoID, todos, createTodo, setEditingTodoID]);

  return (
    <div className="h-full flex flex-col bg-base-200">
      {/* Tree area */}
      <div className="flex-1 overflow-y-auto" onClick={handlePaneClick}>
        <div className="max-w-2xl mx-auto">
          {todos.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-base-content/30">
              <div className="text-center">
                <div className="text-5xl mb-3">☐</div>
                <p className="text-sm">type below to add a todo</p>
              </div>
            </div>
          ) : (
            <>
              {todos.map((todo) => (
                <div key={todo.id}>
                  <TreeNode todo={todo} depth={0} />

                  {/* Sibling input appears right after the selected todo */}
                  {mode === "sibling" && activeTodoID === todo.id && (
                    <div
                      ref={insertRef}
                      className="flex items-center gap-3 px-3 py-2 ml-10 rounded-xl border border-dashed border-primary/30 bg-primary/[0.02]"
                    >
                      <span className="w-4 h-4 rounded-full border-2 border-dashed border-base-300 shrink-0" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="add sibling..."
                        className="flex-1 bg-transparent text-sm text-base-content placeholder:text-base-content/30 outline-none"
                        autoFocus
                      />
                      <span className="text-[10px] text-base-content/20 shrink-0 whitespace-nowrap">sibling · Esc to cancel</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Bottom bar — always visible when no sibling mode */}
      {mode === "bottom" && (
        <div className="p-3 border-t border-base-300 bg-base-100 shrink-0" data-pane>
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <span className="w-5 h-5 rounded-full border-2 border-base-300 flex items-center justify-center shrink-0">
              <Plus size={10} className="text-base-content/30" />
            </span>
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={todos.length === 0 ? "write a todo..." : "add to end..."}
              className="flex-1 bg-transparent text-sm text-base-content placeholder:text-base-content/30 outline-none py-0.5"
              autoFocus
            />
            <span className="text-[10px] text-base-content/20">click a todo to add sibling</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getParentOfTodo(todoId: string, todos: Todo[]): string | null {
  for (const t of todos) {
    if (t.id === todoId) return t.parent_id;
    if (t.children) {
      const f = getParentOfTodo(todoId, t.children);
      if (f !== null) return f;
    }
  }
  return null;
}
