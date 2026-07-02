import { useRef, useEffect } from "react";
import { useTreeStore } from "../../store/treeStore";
import { TreeNode } from "./TreeNode";
import { Plus } from "lucide-react";

export function TodoTreeView() {
  const { todos, createTodo, setEditingTodoID } = useTreeStore();
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [todos.length]);

  const handleAddRoot = async () => {
    const id = await createTodo("", null);
    if (id) setEditingTodoID(id);
  };

  // Global Enter → focus add button
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "BUTTON") return;
        e.preventDefault();
        addBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="h-full flex flex-col bg-base-200">
      <div className="flex-1 overflow-y-auto tree-scroll">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-base-content/30 gap-3">
            <div className="text-5xl">☐</div>
            <p className="text-sm">no todos yet</p>
          </div>
        ) : (
          <div>
            {todos.map((todo) => (
              <TreeNode key={todo.id} todo={todo} depth={0} />
            ))}
          </div>
        )}

        <div ref={bottomRef} className="px-2 pt-1 pb-2">
          <button
            ref={addBtnRef}
            onClick={handleAddRoot}
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
