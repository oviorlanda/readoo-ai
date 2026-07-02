import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { admin } from '../../services/api';

export const TTSTestTab: React.FC = () => {
  const [text, setText] = useState('Halo, saya adalah asisten AI Anda.');
  const [provider, setProvider] = useState('edge-tts');
  const [voice, setVoice] = useState('id-ID-GadisNeural');
  const [audioUrl, setAudioUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const testTTS = async () => {
    setLoading(true);
    try {
      const data = await admin.testTTS({ text, provider, voice });
      setAudioUrl(data.audio_url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'TTS test gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Test Suara TTS</h2>
      <Card className="space-y-4">
        <Textarea
          label="Teks"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-20"
        />
        <Select
          label="Provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          options={[
            { value: 'edge-tts', label: 'Edge-TTS' },
            { value: 'supertonic', label: 'Supertonic' },
          ]}
        />
        <Input
          label="Suara"
          type="text"
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          placeholder="id-ID-GadisNeural"
        />
        <Button onClick={testTTS} disabled={loading} className="w-full sm:w-auto">
          <Volume2 className="w-4 h-4 inline mr-1" /> Test Suara
        </Button>
        {audioUrl && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600">
            <p className="text-xs text-gray-500 mb-2">Hasil Sintesis Suara:</p>
            <audio controls src={audioUrl} className="w-full" autoPlay />
          </div>
        )}
      </Card>
    </div>
  );
};
