import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, Activity, RefreshCw, Volume2, Sparkles, Brain, MessageSquare, Image as ImageIcon, MoveHorizontal, MoveVertical, FlipHorizontal, Crosshair, Trash2, Upload, ZoomIn, RotateCcw } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { admin } from '../../services/api';
import { VrmTalkingHeadAvatar } from '../chat/VrmTalkingHeadAvatar';

interface PersonalisasiTabProps {
  onSuccess: (msg: string) => void;
  setHasUnsavedChanges: (v: boolean) => void;
}

const voiceMap: Record<string, Record<string, { value: string; label: string; gender: 'female' | 'male' }[]>> = {
  'edge-tts': {
    'id-ID': [
      { value: 'id-ID-GadisNeural', label: 'Gadis (Neural - Perempuan)', gender: 'female' },
      { value: 'id-ID-ArdiNeural', label: 'Ardi (Neural - Laki-laki)', gender: 'male' },
    ],
    'en-US': [
      { value: 'en-US-AvaNeural', label: 'Ava (Neural - Perempuan)', gender: 'female' },
      { value: 'en-US-EmmaNeural', label: 'Emma (Neural - Perempuan)', gender: 'female' },
      { value: 'en-US-AndrewNeural', label: 'Andrew (Neural - Laki-laki)', gender: 'male' },
      { value: 'en-US-BrianNeural', label: 'Brian (Neural - Laki-laki)', gender: 'male' },
    ],
  },
  'supertonic': {
    'id-ID': [
      { value: 'F1', label: 'F1 (Perempuan)', gender: 'female' },
      { value: 'F2', label: 'F2 (Perempuan)', gender: 'female' },
      { value: 'M1', label: 'M1 (Laki-laki)', gender: 'male' },
      { value: 'M2', label: 'M2 (Laki-laki)', gender: 'male' },
    ],
    'en-US': [
      { value: 'F5', label: 'F5 (Female)', gender: 'female' },
      { value: 'M5', label: 'M5 (Male)', gender: 'male' },
    ],
  },
};

export const PersonalisasiTab: React.FC<PersonalisasiTabProps> = ({ onSuccess, setHasUnsavedChanges }) => {
  // Identity States
  const [assistantName, setAssistantName] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [assistantJob, setAssistantJob] = useState('');

  // Avatar Visual Framing States
  const [avatarVrmUrl, setAvatarVrmUrl] = useState('');
  const [avatarCharImage, setAvatarCharImage] = useState('');
  const [avatarBgImage, setAvatarBgImage] = useState('');
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [avatarScale, setAvatarScale] = useState(1);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarIsMirrored, setAvatarIsMirrored] = useState(false);
  const [avatarGender, setAvatarGender] = useState<'female' | 'male'>('female');
  const [uploadingVrm, setUploadingVrm] = useState(false);
  const [uploadingChar, setUploadingChar] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  // LLM States
  const [llmProvider, setLlmProvider] = useState('groq');
  const [llmModel, setLlmModel] = useState('llama-3.1-8b-instant');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmMaxTokens, setLlmMaxTokens] = useState('200');
  const [llmTemperature, setLlmTemperature] = useState('0.7');

  // TTS States
  const [ttsProvider, setTtsProvider] = useState('edge-tts');
  const [ttsLanguage, setTtsLanguage] = useState('id-ID');
  const [ttsVoice, setTtsVoice] = useState('id-ID-GadisNeural');
  const [ttsTestText, setTtsTestText] = useState('Halo, saya adalah asisten AI Anda.');

  // UI / Logic States
  const [loadingConnection, setLoadingConnection] = useState(false);
  const [loadingTTS, setLoadingTTS] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionResult, setConnectionResult] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const initialSettingsRef = useRef<Record<string, string>>({});

  // Available models list (detected from LLM provider)
  const [detectedModels, setDetectedModels] = useState<string[]>([]);

  // Sub-tab navigation: VrmTalkingHeadAvatar only mounts when 'avatar' tab is active
  const [activeTab, setActiveTab] = useState<'avatar' | 'otak' | 'suara'>('avatar');
  // Force-remount VrmTalkingHeadAvatar cleanly (reset / new upload)
  const [previewKey, setPreviewKey] = useState(0);

  // Fetch all settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const sett = await admin.getSettings();

        // Cache original values for dirty-check comparison
        initialSettingsRef.current = {
          assistant_name: sett.assistant_name || '',
          greeting_message: sett.greeting_message || '',
          assistant_job: sett.assistant_job || '',
          avatar_char_image: sett.avatar_char_image || '',
          avatar_bg_image: sett.avatar_bg_image || '',
          avatar_offset_x: String(sett.avatar_offset_x || '0'),
          avatar_offset_y: String(sett.avatar_offset_y || '0'),
          avatar_scale: String(sett.avatar_scale || '1.0'),
          avatar_is_mirrored: sett.avatar_is_mirrored || 'false',
          llm_provider: sett.llm_provider || '',
          llm_model: sett.llm_model || '',
          llm_api_key: sett.llm_api_key || '',
          llm_max_tokens: String(sett.llm_max_tokens || '200'),
          llm_temperature: String(sett.llm_temperature || '0.7'),
          tts_provider: sett.tts_provider || '',
          tts_language: sett.tts_language || '',
          tts_voice: sett.tts_voice || '',
          avatar_gender: sett.avatar_gender || 'female',
        };

        if (sett.assistant_name) setAssistantName(sett.assistant_name);
        if (sett.greeting_message) setGreetingMessage(sett.greeting_message);
        if (sett.assistant_job) setAssistantJob(sett.assistant_job);

        if (sett.avatar_vrm_url !== undefined) setAvatarVrmUrl(sett.avatar_vrm_url);
        if (sett.avatar_char_image !== undefined) setAvatarCharImage(sett.avatar_char_image);
        if (sett.avatar_bg_image !== undefined) setAvatarBgImage(sett.avatar_bg_image);
        if (sett.avatar_offset_x) setAvatarOffsetX(Number(sett.avatar_offset_x));
        if (sett.avatar_offset_y) setAvatarOffsetY(Number(sett.avatar_offset_y));
        if (sett.avatar_scale) setAvatarScale(Number(sett.avatar_scale));
        if (sett.avatar_rotation !== undefined) setAvatarRotation(Number(sett.avatar_rotation));
        if (sett.avatar_is_mirrored) setAvatarIsMirrored(sett.avatar_is_mirrored === 'true');
        if (sett.avatar_gender) setAvatarGender(sett.avatar_gender as 'female' | 'male');

        if (sett.llm_provider) setLlmProvider(sett.llm_provider);
        if (sett.llm_model) {
          setLlmModel(sett.llm_model);
          setDetectedModels([sett.llm_model]);
        }
        if (sett.llm_api_key) setLlmApiKey(sett.llm_api_key);
        if (sett.llm_max_tokens) setLlmMaxTokens(sett.llm_max_tokens);
        if (sett.llm_temperature) setLlmTemperature(sett.llm_temperature);
        if (sett.tts_provider) setTtsProvider(sett.tts_provider);
        if (sett.tts_language) setTtsLanguage(sett.tts_language);
        if (sett.tts_voice) setTtsVoice(sett.tts_voice);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Track changes to form inputs
  useEffect(() => {
    if (!isLoaded) return;

    const hasDiff =
      assistantName !== (initialSettingsRef.current.assistant_name || '') ||
      greetingMessage !== (initialSettingsRef.current.greeting_message || '') ||
      assistantJob !== (initialSettingsRef.current.assistant_job || '') ||
      avatarCharImage !== (initialSettingsRef.current.avatar_char_image || '/assets/images/default_avatar.png') ||
      avatarBgImage !== (initialSettingsRef.current.avatar_bg_image || '') ||
      String(avatarOffsetX) !== (initialSettingsRef.current.avatar_offset_x || '0') ||
      String(avatarOffsetY) !== (initialSettingsRef.current.avatar_offset_y || '0') ||
      String(avatarIsMirrored) !== (initialSettingsRef.current.avatar_is_mirrored || 'false') ||
      llmProvider !== (initialSettingsRef.current.llm_provider || '') ||
      llmModel !== (initialSettingsRef.current.llm_model || '') ||
      (llmApiKey !== '' && llmApiKey !== '********' && llmApiKey !== (initialSettingsRef.current.llm_api_key || '')) ||
      llmMaxTokens !== (initialSettingsRef.current.llm_max_tokens || '') ||
      llmTemperature !== (initialSettingsRef.current.llm_temperature || '') ||
      ttsProvider !== (initialSettingsRef.current.tts_provider || '') ||
      ttsLanguage !== (initialSettingsRef.current.tts_language || '') ||
      ttsVoice !== (initialSettingsRef.current.tts_voice || '');

    setHasUnsavedChanges(hasDiff);
  }, [
    assistantName,
    greetingMessage,
    assistantJob,
    avatarCharImage,
    avatarBgImage,
    avatarOffsetX,
    avatarOffsetY,
    avatarIsMirrored,
    llmProvider,
    llmModel,
    llmApiKey,
    llmMaxTokens,
    llmTemperature,
    ttsProvider,
    ttsLanguage,
    ttsVoice,
    isLoaded,
    setHasUnsavedChanges
  ]);

  // Update voice list automatically when provider, language, or gender changes
  const availableVoices = useMemo(() => {
    const allVoices = voiceMap[ttsProvider]?.[ttsLanguage] || [];
    return allVoices.filter((v) => v.gender === avatarGender);
  }, [ttsProvider, ttsLanguage, avatarGender]);

  useEffect(() => {
    if (availableVoices.length > 0) {
      const isVoiceAvailable = availableVoices.some((v: { value: string }) => v.value === ttsVoice);
      if (!isVoiceAvailable) {
        setTtsVoice(availableVoices[0].value);
      }
    }
  }, [ttsProvider, ttsLanguage, avatarGender, ttsVoice, availableVoices]);

  // Image Upload Handlers
  const handleUploadVrm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVrm(true);
    try {
      const res = await admin.uploadAvatarVrm(file);
      setAvatarVrmUrl(res.avatar_vrm_url);
      onSuccess('Model 3D VRM berhasil diunggah!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah model 3D VRM');
    } finally {
      setUploadingVrm(false);
    }
  };

  const handleUploadChar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingChar(true);
    try {
      const res = await admin.uploadAvatarCharacter(file);
      setAvatarCharImage(res.avatar_char_image);
      onSuccess('Foto karakter berhasil diunggah!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah foto karakter');
    } finally {
      setUploadingChar(false);
    }
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const res = await admin.uploadAvatarBackground(file);
      setAvatarBgImage(res.avatar_bg_image);
      onSuccess('Foto background berhasil diunggah!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah background');
    } finally {
      setUploadingBg(false);
    }
  };

  const handleResetChar = async () => {
    try {
      const res = await admin.resetAvatarCharacter();
      setAvatarCharImage(res.avatar_char_image);
      onSuccess('Foto karakter avatar berhasil dihapus');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mereset foto karakter');
    }
  };

  const handleResetBg = async () => {
    try {
      const res = await admin.resetAvatarBackground();
      setAvatarBgImage(res.avatar_bg_image);
      onSuccess('Background telah dikembalikan ke tampilan default');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mereset background');
    }
  };

  const handleResetVrm = async () => {
    try {
      const res = await admin.resetAvatarVrm();
      setAvatarVrmUrl(res.avatar_vrm_url);
      setPreviewKey((k) => k + 1); // force-remount: tears down old WebGL context cleanly
      onSuccess('Model 3D Avatar berhasil dihapus');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal mereset model 3D Avatar');
    }
  };

  const [enableAnimation, setEnableAnimation] = useState(false);

  // Center Character Helper
  const handleCenterAvatar = () => {
    setAvatarOffsetX(0);
    setAvatarOffsetY(0);
    setAvatarScale(1);
    setAvatarRotation(0);
  };

  // Check LLM Connection
  const checkLlmConnection = async () => {
    setLoadingConnection(true);
    setConnectionResult('');
    try {
      const res = await admin.testLLMConnection({
        llm_provider: llmProvider,
        llm_model: llmModel,
        llm_api_key: llmApiKey,
      });
      if (res.success) {
        setConnectionResult('✔ Koneksi LLM Berhasil');
      } else {
        setConnectionResult('❌ ' + (res.error || 'Koneksi gagal'));
      }
    } catch (e) {
      setConnectionResult('❌ ' + (e instanceof Error ? e.message : 'Koneksi gagal'));
    } finally {
      setLoadingConnection(false);
    }
  };

  // Test TTS voice playback
  const testTTSVoice = async () => {
    setLoadingTTS(true);
    setAudioUrl('');
    try {
      const data = await admin.testTTS({
        text: ttsTestText,
        provider: ttsProvider,
        voice: ttsVoice,
        language: ttsLanguage,
      });
      setAudioUrl(data.audio_url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'TTS test gagal');
    } finally {
      setLoadingTTS(false);
    }
  };

  // Save identity settings
  const saveIdentitySettings = async () => {
    setSaving(true);
    try {
      const payload = {
        assistant_name: assistantName,
        greeting_message: greetingMessage,
        assistant_job: assistantJob,
      };
      await admin.saveSettings(payload);

      initialSettingsRef.current = {
        ...initialSettingsRef.current,
        assistant_name: assistantName,
        greeting_message: greetingMessage,
        assistant_job: assistantJob,
      };

      setHasUnsavedChanges(false);
      onSuccess('Identitas asisten berhasil disimpan!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan identitas');
    } finally {
      setSaving(false);
    }
  };

  // Save Visual Avatar Framing settings
  const saveAvatarVisualSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        avatar_char_image: avatarCharImage,
        avatar_bg_image: avatarBgImage,
        avatar_vrm_url: avatarVrmUrl,
        avatar_offset_x: String(avatarOffsetX),
        avatar_offset_y: String(avatarOffsetY),
        avatar_scale: String(avatarScale),
        avatar_rotation: String(avatarRotation),
        avatar_is_mirrored: String(avatarIsMirrored),
      };
      await admin.saveSettings(payload);

      initialSettingsRef.current = {
        ...initialSettingsRef.current,
        avatar_char_image: avatarCharImage,
        avatar_bg_image: avatarBgImage,
        avatar_vrm_url: avatarVrmUrl,
        avatar_offset_x: String(avatarOffsetX),
        avatar_offset_y: String(avatarOffsetY),
        avatar_scale: String(avatarScale),
        avatar_rotation: String(avatarRotation),
        avatar_is_mirrored: String(avatarIsMirrored),
      };

      setHasUnsavedChanges(false);
      onSuccess('Pengaturan Visual Avatar & Framing berhasil disimpan!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan visual');
    } finally {
      setSaving(false);
    }
  };

  // Save LLM settings
  const saveLlmSettings = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        llm_provider: llmProvider,
        llm_model: llmModel,
        llm_max_tokens: llmMaxTokens,
        llm_temperature: llmTemperature,
      };
      if (llmApiKey && llmApiKey !== '********') {
        payload.llm_api_key = llmApiKey;
      }
      await admin.saveSettings(payload);

      initialSettingsRef.current = {
        ...initialSettingsRef.current,
        llm_provider: llmProvider,
        llm_model: llmModel,
        llm_max_tokens: llmMaxTokens,
        llm_temperature: llmTemperature,
        llm_api_key: llmApiKey,
      };

      onSuccess('Pengaturan Otak AI (LLM) berhasil disimpan!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan LLM');
    } finally {
      setSaving(false);
    }
  };

  // Save TTS settings
  const saveTtsSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        tts_provider: ttsProvider,
        tts_language: ttsLanguage,
        tts_voice: ttsVoice,
        avatar_gender: avatarGender,
      };
      await admin.saveSettings(payload);

      initialSettingsRef.current = {
        ...initialSettingsRef.current,
        tts_provider: ttsProvider,
        tts_language: ttsLanguage,
        tts_voice: ttsVoice,
        avatar_gender: avatarGender,
      };

      onSuccess('Pengaturan Suara AI (TTS) berhasil disimpan!');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan TTS');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Identity Config — always visible */}
      <Card className="space-y-4 border-l-4 border-l-primary-500">
        <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <span>Identitas Asisten</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Nama Asisten"
            value={assistantName}
            onChange={(e) => setAssistantName(e.target.value)}
            placeholder="Contoh: Aiko"
          />
          <Input
            label="Pekerjaan / Peran Asisten"
            value={assistantJob}
            onChange={(e) => setAssistantJob(e.target.value)}
            placeholder="Contoh: Customer Service Toko Elektronik, Sales Mobil"
          />
          <Input
            label="Pesan Sambutan"
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value)}
            placeholder="Contoh: Halo! Saya Aiko. Ada yang bisa saya bantu?"
          />
        </div>
        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700/50">
          <Button onClick={saveIdentitySettings} disabled={saving} className="text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan Identitas'}
          </Button>
        </div>
      </Card>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/70 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
        {[
          { key: 'avatar', icon: '🎭', label: 'Avatar 3D', color: 'emerald' },
          { key: 'otak', icon: '🧠', label: 'Otak AI', color: 'purple' },
          { key: 'suara', icon: '🔊', label: 'Suara AI', color: 'teal' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as 'avatar' | 'otak' | 'suara')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 2. Avatar 3D Tab — VrmTalkingHeadAvatar ONLY mounts here */}
      {activeTab === 'avatar' && (
      <Card className="space-y-6 border-l-4 border-l-emerald-500">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
          <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
            <ImageIcon className="w-5 h-5 text-emerald-500" />
            <span>Personalisasi Visual Avatar &amp; Background (Framing Studio)</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            VRM 3D TalkingHead Studio 16:9
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Panel (Left Column) */}
          <div className="lg:col-span-6 space-y-5">
            {/* Upload Buttons */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                1. Upload Model 3D & Media
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 3D VRM Model Uploader */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                    Model 3D Avatar (.vrm)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-indigo-400/60 dark:border-indigo-500/60 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    {uploadingVrm ? 'Uploading...' : 'Unggah Model VRM 3D'}
                    <input type="file" accept=".vrm" onChange={handleUploadVrm} className="hidden" />
                  </label>
                  {avatarVrmUrl && (
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center gap-1">
                        ✓ Model 3D Aktif: {avatarVrmUrl.split('/').pop()}
                      </span>
                      <button
                        type="button"
                        onClick={handleResetVrm}
                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-semibold flex items-center gap-1 transition-all ml-2 shrink-0"
                        title="Hapus Model 3D Avatar"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Model
                      </button>
                    </div>
                  )}
                </div>

                {/* Background Uploader */}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                    Foto Background (16:9)
                  </label>
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-gray-800 transition-all text-xs font-medium text-gray-700 dark:text-gray-200">
                    <Upload className="w-4 h-4 text-blue-500" />
                    {uploadingBg ? 'Uploading...' : 'Unggah Background'}
                    <input type="file" accept="image/*" onChange={handleUploadBg} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Reset to Default BG Button */}
              {avatarBgImage && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResetBg}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Background (Kembalikan ke Default)
                  </button>
                </div>
              )}
            </div>

            {/* 4 Framing Controls */}
            <div className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200/70 dark:border-gray-700">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                2. Kontrol Position & Alignment
              </label>

              {/* Offset X Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                    <MoveHorizontal className="w-3.5 h-3.5 text-emerald-500" /> Geser Kiri - Kanan
                  </span>
                  <span className="font-mono text-gray-500">{avatarOffsetX} px</span>
                </div>
                <input
                  type="range"
                  min="-250"
                  max="250"
                  value={avatarOffsetX}
                  onChange={(e) => setAvatarOffsetX(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Offset Y Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                    <MoveVertical className="w-3.5 h-3.5 text-blue-500" /> Geser Atas - Bawah
                  </span>
                  <span className="font-mono text-gray-500">{avatarOffsetY} px</span>
                </div>
                <input
                  type="range"
                  min="-250"
                  max="250"
                  value={avatarOffsetY}
                  onChange={(e) => setAvatarOffsetY(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {/* Scale / Zoom Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                    <ZoomIn className="w-3.5 h-3.5 text-purple-500" /> Perbesar / Perkecil Gambar (Zoom / Skala)
                  </span>
                  <span className="font-mono text-gray-500">{Math.round(avatarScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={avatarScale}
                  onChange={(e) => setAvatarScale(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Rotation Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" /> Rotasi 3D Avatar (Sudut Pandang)
                  </span>
                  <span className="font-mono text-gray-500">{avatarRotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={avatarRotation}
                  onChange={(e) => setAvatarRotation(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Quick Action Buttons: Mirror, Tengahkan, Terapkan Animasi */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAvatarIsMirrored(!avatarIsMirrored)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${avatarIsMirrored
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  {avatarIsMirrored ? 'Mirror (On)' : 'Mirror'}
                </button>

                <button
                  type="button"
                  onClick={handleCenterAvatar}
                  className="py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <Crosshair className="w-3.5 h-3.5 text-primary-500" />
                  Tengahkan
                </button>

                <button
                  type="button"
                  onClick={() => setEnableAnimation(!enableAnimation)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${enableAnimation
                      ? 'bg-purple-500/15 border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  {enableAnimation ? 'Animasi (On)' : 'Animasi'}
                </button>
              </div>
            </div>
          </div>

          {/* Live Interactive Preview Box (Right Column) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Live Interactive Preview (Rasio 16:9)
              </label>

              <div className="w-full">
                <VrmTalkingHeadAvatar
                  key={previewKey}
                  vrmUrl={avatarVrmUrl}
                  bgImage={avatarBgImage}
                  offsetX={avatarOffsetX}
                  offsetY={avatarOffsetY}
                  scale={avatarScale}
                  rotation={avatarRotation}
                  isMirrored={avatarIsMirrored}
                  enableAnimation={enableAnimation}
                  assistantName={assistantName || 'Readoo AI'}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={saveAvatarVisualSettings} disabled={saving} className="text-xs py-2.5 px-6 flex items-center gap-1.5 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Perubahan Visual'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
      )} {/* end activeTab === 'avatar' */}

      {/* 3. Otak AI & Suara AI — only rendered when their tab is active */}
      {(activeTab === 'otak' || activeTab === 'suara') && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Left Column: Otak LLM — only shown on otak tab */}
        {activeTab === 'otak' && (
        <Card className="space-y-4 border-l-4 border-l-purple-500 h-full flex flex-col justify-between col-span-full lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <span>Otak AI (Large Language Model)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Provider LLM"
                value={llmProvider}
                onChange={(e) => {
                  setLlmProvider(e.target.value);
                  setDetectedModels([]);
                }}
                options={[
                  { value: 'groq', label: 'Groq (Sangat Cepat)' },
                  { value: 'openai', label: 'OpenAI (Premium)' },
                  { value: 'gemini', label: 'Gemini (Google)' },
                  { value: 'deepseek', label: 'DeepSeek (Hemat)' },
                  { value: 'ollama', label: 'Ollama (Lokal)' },
                ]}
              />

              <Select
                label="Model AI (Terdeteksi)"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                options={
                  detectedModels.length > 0
                    ? detectedModels.map((m) => ({ value: m, label: m }))
                    : [{ value: llmModel, label: llmModel }]
                }
              />
            </div>

            <div className="relative">
              <Input
                label="API Key Provider"
                type="password"
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder="Masukkan API Key (cth: gsk_...)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max Tokens"
                type="number"
                value={llmMaxTokens}
                onChange={(e) => setLlmMaxTokens(e.target.value)}
              />
              <Input
                label="Temperature"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={llmTemperature}
                onChange={(e) => setLlmTemperature(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                onClick={checkLlmConnection}
                disabled={loadingConnection}
                className="text-xs py-1.5 px-3 flex items-center gap-1"
              >
                <Activity className="w-3.5 h-3.5" />
                {loadingConnection ? 'Memeriksa...' : 'Cek Koneksi & Deteksi Model'}
              </Button>
              {connectionResult && (
                <span
                  className={`text-xs font-semibold ${connectionResult.startsWith('✔') ? 'text-emerald-500' : 'text-red-500'
                    }`}
                >
                  {connectionResult}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-4">
            <Button onClick={saveLlmSettings} disabled={saving} className="text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm bg-purple-600 hover:bg-purple-700 text-white">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan LLM'}
            </Button>
          </div>
        </Card>
        )} {/* end activeTab === 'otak' */}

        {/* Right Column: Suara TTS — only shown on suara tab */}
        {activeTab === 'suara' && (
        <Card className="space-y-4 border-l-4 border-l-teal-500 h-full flex flex-col justify-between col-span-full lg:col-span-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-700 pb-2">
              <Volume2 className="w-5 h-5 text-teal-500" />
              <span>Suara AI (Text-to-Speech)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Jenis Kelamin Avatar"
                value={avatarGender}
                onChange={(e) => setAvatarGender(e.target.value as 'female' | 'male')}
                options={[
                  { value: 'female', label: 'Perempuan (Female)' },
                  { value: 'male', label: 'Laki-laki (Male)' },
                ]}
              />

              <Select
                label="Provider TTS"
                value={ttsProvider}
                onChange={(e) => setTtsProvider(e.target.value)}
                options={[
                  { value: 'edge-tts', label: 'Edge-TTS (Jernih & Alami)' },
                  { value: 'supertonic', label: 'Supertonic ONNX (Lokal/Offline)' },
                ]}
              />

              <Select
                label="Bahasa"
                value={ttsLanguage}
                onChange={(e) => setTtsLanguage(e.target.value)}
                options={[
                  { value: 'id-ID', label: 'Bahasa Indonesia' },
                  { value: 'en-US', label: 'English (US)' },
                ]}
              />
            </div>

            <Select
              label="Model Suara Karakter"
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value)}
              options={availableVoices}
            />

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
              <Input
                label="Teks Pengujian Suara"
                value={ttsTestText}
                onChange={(e) => setTtsTestText(e.target.value)}
              />

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="secondary"
                  onClick={testTTSVoice}
                  disabled={loadingTTS}
                  className="text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTTS ? 'animate-spin' : ''}`} />
                  {loadingTTS ? 'Mengolah...' : 'Uji Suara Karakter'}
                </Button>

                {audioUrl && (
                  <audio controls autoPlay src={audioUrl} className="h-8 max-w-[200px]" />
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-4">
            <Button onClick={saveTtsSettings} disabled={saving} className="text-xs py-2 px-5 flex items-center gap-1.5 shadow-sm bg-teal-600 hover:bg-teal-700 text-white">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan TTS'}
            </Button>
          </div>
        </Card>
        )} {/* end activeTab === 'suara' */}

      </div>
      )} {/* end activeTab otak|suara */}
    </div>
  );
};