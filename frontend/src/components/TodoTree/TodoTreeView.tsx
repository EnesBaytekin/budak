import { useCallback, useEffect } from "react";
import { useTreeStore } from "../../store/treeStore";
import { TreeNode } from "./TreeNode";
import { Plus } from "lucide-react";

export function TodoTreeView() {
  const todos = useTreeStore((s) => s.todos);

  const addRootTodo = useCallback(async () => {
    const { createTodo, setEditingTodoID, setActiveTodoID } = useTreeStore.getState();
    const id = await createTodo("", null);
    if (id) { setEditingTodoID(id); setActiveTodoID(id); }
  }, []);

  // Global keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const isInput = t.tagName === "INPUT" || t.tagName === "TEXTAREA";

      // Shift+Enter → new child of active todo
      if (e.key === "Enter" && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (isInput || t.tagName === "BUTTON") return;
        e.preventDefault();
        const { activeTodoID, createTodo, setEditingTodoID } = useTreeStore.getState();
        const pid = activeTodoID || null;
        createTodo("", pid).then((id) => { if (id) { setEditingTodoID(id); useTreeStore.getState().setActiveTodoID(id); } });
        return;
      }

      // Enter → new root todo
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (isInput || t.tagName === "BUTTON") return;
        e.preventDefault();
        addRootTodo();
        return;
      }

      // The rest only applies outside inputs
      if (isInput) return;

      const { activeTodoID, indentTodo, outdentTodo, selectNextTodo, selectPrevTodo } = useTreeStore.getState();

      // Tab vs Shift+Tab → indent/outdent
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        if (activeTodoID) indentTodo(activeTodoID);
        return;
      }
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (activeTodoID) outdentTodo(activeTodoID);
        return;
      }
      // Shift+Right / Shift+Left → same as Tab/Shift+Tab
      if (e.key === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        if (activeTodoID) indentTodo(activeTodoID);
        return;
      }
      if (e.key === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        if (activeTodoID) outdentTodo(activeTodoID);
        return;
      }

      // Arrow keys → navigate (without shift)
      if (e.key === "ArrowDown" && !e.shiftKey) { e.preventDefault(); selectNextTodo(); return; }
      if (e.key === "ArrowUp" && !e.shiftKey) { e.preventDefault(); selectPrevTodo(); return; }

      // Shift+Up / Shift+Down → reorder
      if (e.key === "ArrowDown" && e.shiftKey) { e.preventDefault(); if (activeTodoID) useTreeStore.getState().moveDown(activeTodoID); return; }
      if (e.key === "ArrowUp" && e.shiftKey) { e.preventDefault(); if (activeTodoID) useTreeStore.getState().moveUp(activeTodoID); return; }

      // Enter on an input is handled by the component itself
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addRootTodo]);

  return (
    <div className="h-full flex flex-col bg-base-200">
      <div className="flex-1 overflow-y-auto tree-scroll">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-base-content/30 gap-3">
            <div className="text-5xl">☐</div>
            <p className="text-sm">press Enter to add a todo</p>
          </div>
        ) : (
          <div>
            {todos.map((todo) => (
              <TreeNode key={todo.id} todo={todo} depth={0} />
            ))}
          </div>
        )}

        <div className="px-2 pt-1 pb-2">
          <button
            onClick={addRootTodo}
            className="btn btn-ghost btn-sm w-full justify-start gap-3 text-base-content/30 hover:text-base-content/60 hover:bg-base-100 rounded-xl"
          >
            <span className="w-5 h-5 rounded-full border-2 border-dashed border-base-300 flex items-center justify-center shrink-0">
              <Plus size={10} />
            </span>
            <span className="text-sm">add node</span>
          </button>
        </div>
      </div>
    </div>
  );
}
