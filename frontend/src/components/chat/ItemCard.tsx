import React from 'react';
import type { ChatItem } from '../../types';

interface ItemCardProps {
  item: ChatItem;
  index?: number;
}

const PRIORITY_FIELDS = ['nama_produk', 'judul', 'harga', 'stok', 'pengarang', 'kode_buku', 'kode'];

export const ItemCard: React.FC<ItemCardProps> = ({ item, index }) => {
  const coverSrc = (item as any).image_base64 || (item as any).cover_image;

  const allEntries = Object.entries(item).filter(
    ([k]) => !['id', 'cover_image', 'cover_color', 'image_base64'].includes(k)
  );

  const displayFields = [
    ...PRIORITY_FIELDS
      .map((pf) => allEntries.find(([k]) => k === pf))
      .filter((e): e is [string, unknown] => Boolean(e)),
    ...allEntries.filter(([k]) => !PRIORITY_FIELDS.includes(k)),
  ].slice(0, 4);

  return (
    <div className="linear-card flex flex-col gap-2 items-start hover:border-slate-700 relative">
      {index !== undefined && (
        <div className="bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/40 shadow-sm flex items-center gap-1">
          <span>Etalase Produk #{index + 1}</span>
        </div>
      )}
      <div className="flex gap-3 items-start w-full">
        {coverSrc && (
          <img
            src={coverSrc as string}
            alt=""
            className="w-14 h-18 object-cover rounded-lg flex-shrink-0 border border-slate-700/60"
          />
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          {displayFields.map(([key, val]) => (
            <p key={key} className="text-xs text-slate-300 truncate">
              <span className="font-semibold text-slate-400 capitalize">{key.replace('_', ' ')}: </span>
              {String(val)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};