import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { admin } from '../../services/api';
import type { Collection } from '../../types';

interface CollectionsTabProps {
  collections: Collection[];
  onRefresh: () => void;
  onSetActive: (colId: number) => void;
  onRebuildIndex: (colId: number) => void;
  onDelete: (colId: number) => void;
}

export const CollectionsTab: React.FC<CollectionsTabProps> = ({
  collections,
  onRefresh,
  onSetActive,
  onRebuildIndex,
  onDelete,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Koleksi Data</h2>
        <Button
          onClick={onRefresh}
          variant="secondary"
          className="text-sm py-1.5 px-3 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {collections.length === 0 ? (
        <Card className="text-center text-gray-500 py-12">
          Belum ada koleksi. Upload dataset untuk memulai.
        </Card>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <Card
              key={col.id}
              className={`flex items-center justify-between ${
                col.active ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {col.name}{' '}
                  {col.active && (
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded-full ml-1">
                      Aktif
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{col.doc_count} dokumen</p>
              </div>
              <div className="flex items-center gap-2">
                {!col.active && (
                  <Button
                    onClick={() => onSetActive(col.id)}
                    className="text-xs py-1 px-2"
                  >
                    Aktifkan
                  </Button>
                )}
                <Button
                  onClick={() => onRebuildIndex(col.id)}
                  variant="secondary"
                  className="text-xs py-1 px-2 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Rebuild
                </Button>
                <button
                  onClick={() => onDelete(col.id)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                  title="Hapus Koleksi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
