import React, { useState } from 'react';
import { Upload, Check, X } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { admin } from '../../services/api';

interface DatasetUploadTabProps {
  onSuccess: () => void;
}

export const DatasetUploadTab: React.FC<DatasetUploadTabProps> = ({ onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    temp_file: string;
    headers: string[];
    preview: Record<string, unknown>[];
    total_rows: number;
  } | null>(null);
  const [embeddingCols, setEmbeddingCols] = useState<string[]>([]);
  const [displayCols, setDisplayCols] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await admin.uploadDataset(file);
      setPreview(data);
      setEmbeddingCols(data.headers);
      setDisplayCols(data.headers);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Upload gagal');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      await admin.importDataset({
        name,
        embedding_cols: embeddingCols,
        display_cols: displayCols,
        temp_file: preview.temp_file,
      });
      setPreview(null);
      setFile(null);
      setName('');
      onSuccess();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import gagal');
    } finally {
      setLoading(false);
    }
  };

  const toggleCol = (col: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(col)) setList(list.filter((c) => c !== col));
    else setList([...list, col]);
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Upload Dataset CSV</h2>
      {!preview ? (
        <Card>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
          />
          <Button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> {loading ? 'Memproses...' : 'Upload'}
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <Input
              label="Nama Koleksi"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama koleksi baru"
            />
          </Card>
          <Card>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Kolom untuk Embedding (pencarian semantik)
            </label>
            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleCol(h, embeddingCols, setEmbeddingCols)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    embeddingCols.includes(h)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Kolom Tampilan (untuk UI)
            </label>
            <div className="flex flex-wrap gap-2">
              {preview.headers.map((h) => (
                <button
                  key={h}
                  onClick={() => toggleCol(h, displayCols, setDisplayCols)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    displayCols.includes(h)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-medium mb-2 text-gray-900 dark:text-white">
              Preview Data ({preview.total_rows} baris)
            </h3>
            <div className="overflow-x-auto max-h-60 border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="text-left p-2 border-b border-gray-200 dark:border-gray-600 font-medium text-gray-700 dark:text-gray-300"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {preview.preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className="p-2 border-b border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 whitespace-nowrap overflow-hidden max-w-xs truncate"
                        >
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!name || loading}
              className="flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Import Dataset
            </Button>
            <Button
              onClick={() => setPreview(null)}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" /> Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
