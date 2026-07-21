import React from 'react';
import { MessageSquare, Trash2, X, Plus } from 'lucide-react';
import type { ChatSession } from '../../types';

interface SidebarProps {
  sessions: ChatSession[];
  currentSession: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onNewChat: () => void;
  sidebarOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSession,
  onSelectSession,
  onDeleteSession,
  onNewChat,
  sidebarOpen,
  onClose,
}) => {
  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-[#0D121D] border-r border-slate-800/80 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3.5 border-b border-slate-800/80 bg-[#0F1420]/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
              <h2 className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Percakapan</h2>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-slate-800 rounded text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onNewChat}
            className="btn-linear-primary w-full justify-center text-xs py-2"
          >
            <Plus className="w-4 h-4" /> Chat Baru
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-7rem)] p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              Belum ada riwayat percakapan.
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = currentSession === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150 group border ${
                    isActive
                      ? 'bg-slate-800/80 border-indigo-500/40 text-slate-100 shadow-sm'
                      : 'border-transparent hover:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  <span className="text-xs truncate flex-1 font-medium">
                    {s.title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-700/60 rounded text-slate-500 hover:text-red-400 transition-all"
                    title="Hapus Sesi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};
