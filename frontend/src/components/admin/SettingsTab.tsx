import React, { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import type { Settings } from '../../types';

interface SettingsTabProps {
  settings: Settings;
  onSave: (s: Record<string, string>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onSave }) => {
  const [form, setForm] = useState<Record<string, string>>({ ...settings });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({ ...settings });
  }, [settings]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(form);
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: string; label: string; type: string }[] = [
    { key: 'assistant_name', label: 'Nama Asisten', type: 'text' },
    { key: 'greeting_message', label: 'Pesan Sambutan', type: 'text' },
    { key: 'system_prompt', label: 'System Prompt', type: 'textarea' },
    { key: 'llm_provider', label: 'Provider LLM', type: 'text' },
    { key: 'llm_model', label: 'Model LLM', type: 'text' },
    { key: 'llm_api_key', label: 'API Key LLM', type: 'password' },
    { key: 'llm_max_tokens', label: 'Max Tokens', type: 'number' },
    { key: 'llm_temperature', label: 'Temperature', type: 'number' },
    { key: 'tts_provider', label: 'Provider TTS', type: 'text' },
    { key: 'tts_voice', label: 'Suara TTS', type: 'text' },
    { key: 'tts_language', label: 'Bahasa TTS', type: 'text' },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Pengaturan Sistem</h2>
      <Card className="space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            {f.type === 'textarea' ? (
              <Textarea
                label={f.label}
                id={f.key}
                value={form[f.key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="h-24"
              />
            ) : (
              <Input
                label={f.label}
                id={f.key}
                type={f.type}
                value={form[f.key] || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
          <Settings2 className="w-4 h-4 inline mr-1" /> Simpan Pengaturan
        </Button>
      </Card>
    </div>
  );
};
