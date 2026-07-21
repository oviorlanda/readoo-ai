import React from 'react';
import { ShoppingBag, BookOpen, Package, Tag } from 'lucide-react';
import type { ChatItem } from '../../types';

interface RagInspectorProps {
  items: ChatItem[];
  isFastPath?: boolean;
  activeCollectionName?: string;
}

export const RagInspector: React.FC<RagInspectorProps> = ({ items }) => {
  return (
    <aside className="w-80 lg:w-96 border-l border-slate-800/80 bg-[#0D121D] flex flex-col h-full overflow-hidden text-xs">
      {/* Header Etalase */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#0F1420]/90 backdrop-blur-sm">
        <div className="flex items-center gap-2.5 font-semibold text-slate-100 text-sm">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span>Etalase Produk</span>
        </div>
        <span className="text-[11px] font-medium bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700/60">
          {items.length} Produk
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400/60 shadow-inner">
              <Package className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-slate-300 font-medium text-sm">Etalase Masih Kosong</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Produk atau rekomendasi buku dari percakapan akan otomatis ditampilkan di sini.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item: ChatItem, idx: number) => {
              const coverSrc =
                (item as any).image_base64 ||
                (item as any).cover_image ||
                (item as any).image_url;

              // Extract key display fields
              const titleKey = Object.keys(item).find((k) =>
                ['judul', 'title', 'nama', 'name', 'nama_produk'].includes(k.toLowerCase())
              );
              const titleVal = titleKey ? String(item[titleKey]) : null;

              const authorKey = Object.keys(item).find((k) =>
                ['pengarang', 'author', 'penulis', 'brand'].includes(k.toLowerCase())
              );
              const authorVal = authorKey ? String(item[authorKey]) : null;

              // Other attribute entries (excluding cover/id/title/author)
              const otherEntries = Object.entries(item).filter(([k, v]) => {
                if (!v) return false;
                const lower = k.toLowerCase();
                return !(
                  ['id', 'cover_image', 'cover_color', 'image_base64', 'image_url'].includes(lower) ||
                  k === titleKey ||
                  k === authorKey
                );
              });

              return (
                <div
                  key={item.id || idx}
                  className="group bg-[#111622] border border-slate-800/80 rounded-xl p-3.5 hover:border-indigo-500/40 hover:bg-[#141A29] transition-all duration-200 shadow-sm"
                >
                  <div className="flex gap-3 items-start">
                    {/* Image or Product Icon */}
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={titleVal || 'Gambar Produk'}
                        className="w-14 h-20 object-cover rounded-lg flex-shrink-0 border border-slate-700/60 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 flex flex-col items-center justify-center text-indigo-400 flex-shrink-0 shadow-sm">
                        <BookOpen className="w-5 h-5 opacity-80" />
                      </div>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {titleVal ? (
                        <h4 className="font-semibold text-slate-100 text-xs line-clamp-2 group-hover:text-indigo-300 transition-colors">
                          {titleVal}
                        </h4>
                      ) : (
                        <h4 className="font-semibold text-slate-200 text-xs">
                          Produk #{idx + 1}
                        </h4>
                      )}

                      {authorVal && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Tag className="w-3 h-3 text-indigo-400/80" />
                          <span className="truncate">{authorVal}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Attributes details */}
                  {otherEntries.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-1 gap-1 text-[11px]">
                      {otherEntries.slice(0, 4).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-start gap-2">
                          <span className="text-slate-500 font-medium capitalize flex-shrink-0">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="text-slate-300 text-right font-normal truncate max-w-[180px]">
                            {String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};
