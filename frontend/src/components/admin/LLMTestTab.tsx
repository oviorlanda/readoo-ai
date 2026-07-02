import React, { useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { admin } from '../../services/api';

export const LLMTestTab: React.FC = () => {
  const [provider, setProvider] = useState('groq');
  const [model, setModel] = useState('llama3-8b-8192');
  const [apiKey, setApiKey] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);

  const testConnection = async () => {
    setLoading(true);
    setResult('');
    try {
      const data = await admin.testLLMConnection({
        llm_provider: provider,
        llm_model: model,
        llm_api_key: apiKey || undefined,
      });
      setResult(
        data.success ? `✅ Berhasil: ${data.response}` : `❌ Gagal: ${data.error}`
      );
    } catch (e) {
      setResult(`❌ Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const detectModels = async () => {
    setLoading(true);
    try {
      const data = await admin.detectModels({
        llm_provider: provider,
        llm_api_key: apiKey || undefined,
      });
      setModels(data.models);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Test Koneksi LLM</h2>
      <Card className="space-y-4">
        <Select
          label="Provider"
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setModels([]);
          }}
          options={[
            { value: 'groq', label: 'Groq' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'gemini', label: 'Gemini' },
            { value: 'deepseek', label: 'DeepSeek' },
            { value: 'ollama', label: 'Ollama' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Model
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Nama model"
              className="flex-1"
            />
            <Button
              onClick={detectModels}
              disabled={loading}
              variant="secondary"
              className="text-sm flex items-center gap-1 h-[42px] mt-auto"
            >
              <RefreshCw className="w-3 h-3" /> Deteksi
            </Button>
          </div>
          {models.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {models.map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-gray-800 dark:text-gray-200"
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input
          label="API Key (opsional, jika belum disimpan)"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="********"
        />
        <Button onClick={testConnection} disabled={loading} className="w-full sm:w-auto">
          <Activity className="w-4 h-4 inline mr-1" /> Test Koneksi
        </Button>
        {result && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap border border-gray-100 dark:border-gray-600">
            {result}
          </div>
        )}
      </Card>
    </div>
  );
};
