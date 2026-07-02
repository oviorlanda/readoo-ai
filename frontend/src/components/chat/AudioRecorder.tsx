import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { voice } from '../../services/api';

interface AudioRecorderProps {
  onTranscribed: (text: string) => void;
  disabled?: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscribed, disabled }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const result = await voice.transcribe(blob);
          if (result.text) {
            onTranscribed(result.text);
          }
        } catch (err) {
          console.error('Transcription failed', err);
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Permission denied or microphone error', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <button
      disabled={disabled}
      onClick={recording ? stopRecording : startRecording}
      className={`p-2 rounded-lg transition-colors focus:outline-none ${
        recording
          ? 'bg-red-500 text-white animate-pulse'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}
      type="button"
      title={recording ? 'Berhenti Merekam' : 'Mulai Rekam Suara'}
    >
      {recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
};
