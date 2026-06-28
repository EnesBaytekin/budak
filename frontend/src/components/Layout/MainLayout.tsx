import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TodoTreeView } from "../TodoTree/TodoTreeView";
import { MindMapView } from "../MindMap/MindMapView";
import { useTreeStore } from "../../store/treeStore";
import { Menu } from "lucide-react";

type View = "tree" | "mindmap";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [view, setView] = useState<View>("tree");
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);

  const tabs: { id: View; label: string }[] = [
    { id: "tree", label: "tree" },
    { id: "mindmap", label: "mind map" },
  ];

  return (
    <div className="flex h-dvh bg-base-100 overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-base-200 border-b border-base-300 px-3 py-2 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="btn btn-ghost btn-sm lg:hidden"
          >
            <Menu size={16} />
          </button>

          <div className="join">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`join-item btn btn-sm ${
                  view === tab.id ? "btn-primary" : "btn-ghost"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!selectedTreeID && (
            <span className="ml-auto text-xs text-base-content/40 italic hidden sm:block">
              select a tree from the sidebar
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedTreeID ? (
            <div className="flex items-center justify-center h-full text-base-content/40">
              <div className="text-center">
                <div className="text-5xl mb-3 opacity-30">⊞</div>
                <p className="text-sm">select or create a tree to get started</p>
              </div>
            </div>
          ) : view === "tree" ? (
            <TodoTreeView />
          ) : (
            <MindMapView />
          )}
        </div>
      </div>
    </div>
  );
}
