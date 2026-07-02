import React from 'react';
import type { ChatItem } from '../../types';

interface ItemCardProps {
  item: ChatItem;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item }) => {
  // Filter out system/UI specific keys
  const displayFields = Object.entries(item).filter(
    ([k]) => !['id', 'cover_image', 'cover_color'].includes(k)
  ).slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex gap-3 items-start">
      {item.cover_image && (
        <img
          src={item.cover_image as string}
          alt=""
          className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        {displayFields.map(([key, val]) => (
          <p key={key} className="text-sm text-gray-700 dark:text-gray-300 truncate">
            <span className="font-medium capitalize">{key}: </span>
            {String(val)}
          </p>
        ))}
      </div>
    </div>
  );
};
