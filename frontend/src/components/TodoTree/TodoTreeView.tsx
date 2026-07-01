import { useState, useRef, useEffect } from "react";
import { useTreeStore } from "../../store/treeStore";
import { TreeNode } from "./TreeNode";
import { Plus } from "lucide-react";

export function TodoTreeView() {
  const { todos, createTodo, setEditingTodoID, activeTodoID, setActiveTodoID } = useTreeStore();
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // When a todo is selected, focus the input
  useEffect(() => {
    if (activeTodoID) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [activeTodoID]);

  // Scroll input into view (mobile keyboard)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTodoID]);

  const handleSubmit = async (title?: string) => {
    const text = title ?? newTitle;

    if (activeTodoID) {
      // Add as CHILD of the selected todo
      const id = await createTodo(text, activeTodoID);
      if (id) setEditingTodoID(id);
      setNewTitle("");
      // Keep selection so user can add multiple children
    } else {
      // Add as root
      const id = await createTodo(text, null);
      if (id) setEditingTodoID(id);
      setNewTitle("");
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleSubmit();
      return;
    }
    if (e.key === "Escape") {
      setActiveTodoID(null);
      setNewTitle("");
    }
  };

  const handlePaneClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setActiveTodoID(null);
      setNewTitle("");
    }
  };

  // Global Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

        if (activeTodoID) {
          // Someone pressed Enter with a todo selected → add child
          createTodo("", activeTodoID).then((id) => {
            if (id) setEditingTodoID(id);
          });
        } else {
          // Focus the input
          inputRef.current?.focus();
        }
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTodoID, createTodo, setEditingTodoID]);

  return (
    <div className="h-full flex flex-col bg-base-200">
      {/* Tree area */}
      <div className="flex-1 overflow-y-auto tree-scroll" onClick={handlePaneClick}>
        <div className="max-w-2xl mx-auto">
          {todos.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-base-content/30">
              <div className="text-center">
                <div className="text-5xl mb-3">☐</div>
                <p className="text-sm">write below to add a todo</p>
              </div>
            </div>
          ) : (
            todos.map((todo) => (
              <div key={todo.id}>
                <TreeNode todo={todo} depth={0} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom input — always visible */}
      <div
        ref={bottomRef}
        className="p-3 border-t border-base-300 bg-base-100 shrink-0"
      >
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
            placeholder={activeTodoID ? "add child..." : "add a todo..."}
            className="flex-1 bg-transparent text-sm text-base-content placeholder:text-base-content/30 outline-none py-0.5"
          />
          <span className="text-[10px] text-base-content/20 shrink-0 whitespace-nowrap">
            {activeTodoID ? "will be child of selected" : "press Enter to add"}
          </span>
        </div>
      </div>
    </div>
  );
}
