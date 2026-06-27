import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TodoTreeView } from "../TodoTree/TodoTreeView";
import { MindMapView } from "../MindMap/MindMapView";
import { useTreeStore } from "../../store/treeStore";

type View = "tree" | "mindmap";

export function MainLayout() {
  const [view, setView] = useState<View>("tree");
  const selectedTreeID = useTreeStore((s) => s.selectedTreeID);

  const tabs = [
    { id: "tree" as View, label: "Tree", icon: "🌲" },
    { id: "mindmap" as View, label: "Mind Map", icon: "🧠" },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* View Toggle */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-1 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                view === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          {!selectedTreeID && (
            <span className="ml-auto text-sm text-gray-400 italic">
              Select a tree from the sidebar
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {!selectedTreeID ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-lg">Select or create a tree to get started</p>
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
