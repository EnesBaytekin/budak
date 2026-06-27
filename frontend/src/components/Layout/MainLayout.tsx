import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TodoTreeView } from "../TodoTree/TodoTreeView";
import { MindMapView } from "../MindMap/MindMapView";
import { useTreeStore } from "../../store/treeStore";

type View = "tree" | "mindmap";

export function MainLayout() {
  const [view, setView] = useState<View>("tree");
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);

  const tabs: { id: View; label: string; icon: string }[] = [
    { id: "tree", label: "tree", icon: "⊞" },
    { id: "mindmap", label: "mind map", icon: "◎" },
  ];

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-panel border-b border-border px-4 py-2 flex items-center gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium transition ${
                view === tab.id
                  ? "bg-lavender/15 text-lavender border border-lavender/20"
                  : "text-fg-muted hover:text-fg-soft hover:bg-hover border border-transparent"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          {!selectedTreeID && (
            <span className="ml-auto text-xs text-fg-muted italic">
              select a tree from the sidebar
            </span>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {!selectedTreeID ? (
            <div className="flex items-center justify-center h-full text-fg-muted">
              <div className="text-center">
                <div className="text-5xl mb-3 text-lavender/40">⊞</div>
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
