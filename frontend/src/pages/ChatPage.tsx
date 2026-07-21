import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { chat, voice, auth } from '../services/api';
import type { ChatMessage, ChatSession, ChatItem } from '../types';
import { Send, LogOut, MessageSquare, Menu, Key, X } from 'lucide-react';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ItemCard } from '../components/chat/ItemCard';
import { AudioRecorder } from '../components/chat/AudioRecorder';
import { VrmTalkingHeadAvatar } from '../components/chat/VrmTalkingHeadAvatar';
import { RagInspector } from '../components/chat/RagInspector';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';

type ChatMode = 'chat' | 'avatar';

export default function ChatPage() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<ChatMode>('chat');

  // NEW: nama asisten dinamis, diambil dari /api/settings/public.
  // Default 'Aiko' dipakai sebagai fallback selama fetch belum selesai
  // atau kalau fetch gagal, supaya UI tetap ada teksnya (gak kosong/blank).
  const [assistantName, setAssistantName] = useState('Aiko');
  const [avatarVrmUrl, setAvatarVrmUrl] = useState<string | null>(null);
  const [avatarCharImage, setAvatarCharImage] = useState('/assets/images/default_avatar.png');
  const [avatarBgImage, setAvatarBgImage] = useState('');
  const [avatarOffsetX, setAvatarOffsetX] = useState(0);
  const [avatarOffsetY, setAvatarOffsetY] = useState(0);
  const [avatarScale, setAvatarScale] = useState(1);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarIsMirrored, setAvatarIsMirrored] = useState(false);
  const [avatarAudioUrl, setAvatarAudioUrl] = useState<string | null>(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const res = await fetch('/api/settings/public', {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('token'),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.assistant_name) {
          setAssistantName(data.assistant_name);
        }
        if (data?.avatar_vrm_url) {
          setAvatarVrmUrl(data.avatar_vrm_url);
        }
        if (data?.avatar_char_image) {
          setAvatarCharImage(data.avatar_char_image);
        }
        if (data?.avatar_bg_image !== undefined) {
          setAvatarBgImage(data.avatar_bg_image);
        }
        if (data?.avatar_offset_x !== undefined) {
          setAvatarOffsetX(Number(data.avatar_offset_x));
        }
        if (data?.avatar_offset_y !== undefined) {
          setAvatarOffsetY(Number(data.avatar_offset_y));
        }
        if (data?.avatar_scale !== undefined) {
          setAvatarScale(Number(data.avatar_scale));
        }
        if (data?.avatar_rotation !== undefined) {
          setAvatarRotation(Number(data.avatar_rotation));
        }
        if (data?.avatar_is_mirrored !== undefined) {
          setAvatarIsMirrored(Boolean(data.avatar_is_mirrored));
        }
      } catch {
        /* fallback default settings */
      }
    };
    fetchPublicSettings();
  }, []);

  // FIX: state messages & session DIPISAH per mode, supaya percakapan di
  // mode "Chatting" dan mode "3D Avatar" independen satu sama lain —
  // gak saling "kebawa" saat pindah mode.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [avatarMessages, setAvatarMessages] = useState<ChatMessage[]>([]);
  const [chatSession, setChatSession] = useState<string | null>(null);
  const [avatarSession, setAvatarSession] = useState<string | null>(null);

  // Helper supaya kode di bawah tetap ringkas: "messages" & "currentSession"
  // otomatis merujuk ke state yang sesuai dengan mode yang lagi aktif.
  const messages = mode === 'chat' ? chatMessages : avatarMessages;
  const currentSession = mode === 'chat' ? chatSession : avatarSession;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [avatarAnim, setAvatarAnim] = useState<'idle' | 'wave' | 'thinking'>('idle');
  const [showAvatarBubble, setShowAvatarBubble] = useState(false);

  // FIX (dark mode bug): dulu warna background caption bubble di-hardcode putih
  // lewat inline `style.backgroundImage`, yang selalu override class Tailwind
  // (termasuk `dark:bg-...`). Akibatnya background bubble tetap putih walau
  // dark mode aktif, sementara teks di dalamnya ikut berubah terang -> teks
  // jadi nyaris tak terbaca. `isDark` di sini dipakai buat set warna gradient
  // background secara manual sesuai tema aktif, dan otomatis update lewat
  // MutationObserver setiap kali user toggle dark/light mode.
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  // Change Password Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (mode === 'chat') {
      scrollToBottom();
    }
  }, [chatMessages, mode]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await chat.getSessions();
      setSessions(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sendMessageText = async (userMsg: string) => {
    const userMessage: ChatMessage = { role: 'user', content: userMsg };
    setChatMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const eventSource = await chat.streamMessage(userMsg, chatSession || undefined);
      const reader = eventSource.body?.getReader();
      const decoder = new TextDecoder();
      setStreaming(true);

      let aiMessage = '';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk') {
                aiMessage += parsed.text;
                setChatMessages((prev) => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last.role === 'assistant') {
                    newMsgs[newMsgs.length - 1] = { ...last, content: aiMessage };
                  }
                  return newMsgs;
                });
              } else if (parsed.type === 'items' && parsed.items) {
                setChatMessages((prev) => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  if (last.role === 'assistant') {
                    newMsgs[newMsgs.length - 1] = {
                      ...last,
                      items: parsed.items,
                      all_items: parsed.all_items || parsed.items,
                    };
                  }
                  return newMsgs;
                });
              } else if (parsed.type === 'reply') {
                setChatMessages((prev) => {
                  const newMsgs = [...prev];
                  const last = newMsgs[newMsgs.length - 1];
                  newMsgs[newMsgs.length - 1] = { ...last, content: parsed.text };
                  return newMsgs;
                });
              }
              if (parsed.session_id) {
                setChatSession(parsed.session_id);
                loadSessions();
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Gagal terhubung ke server.' },
      ]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const sendMessageAvatar = async (userMsg: string) => {
    const userMessage: ChatMessage = { role: 'user', content: userMsg };
    setAvatarMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setAvatarAnim('thinking');

    try {
      const res = await chat.sendAvatarMessage(userMsg, avatarSession || undefined);

      if (res.session_id) {
        setAvatarSession(res.session_id);
        loadSessions();
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply || res.speech_text,
        items: res.items as ChatItem[] | undefined,
        all_items: (res.all_items || res.items) as ChatItem[] | undefined,
      };

      // Use instant single-flight audio_url if returned by server, or fallback to TTS client
      let audioUrl = (res as { audio_url?: string }).audio_url;
      if (!audioUrl && res.speech_text) {
        try {
          const ttsRes = await voice.textToSpeech(res.speech_text);
          audioUrl = ttsRes.audio_url;
        } catch {
          /* fallback ignore */
        }
      }

      const videoUrl = (res as { video_url?: string }).video_url;
      if (videoUrl) {
        setAvatarVideoUrl(videoUrl);
      }

      if (audioUrl) {
        setAvatarAudioUrl(audioUrl);
      } else {
        // Fallback: auto-dismiss bubble after 6 seconds if no audio file is present
        setTimeout(() => {
          setShowAvatarBubble(false);
        }, 6000);
      }
      setAvatarMessages((prev) => [...prev, assistantMsg]);
      setShowAvatarBubble(true);
      setLoading(false);
    } catch (err) {
      setAvatarMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Error: Gagal memproses pesan avatar.' },
      ]);
      setAvatarAnim('idle');
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');

    if (mode === 'chat') {
      await sendMessageText(userMsg);
    } else {
      await sendMessageAvatar(userMsg);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectSession = async (sessionId: string) => {
    try {
      const msgs = await chat.getSessionMessages(sessionId);
      // Sesi yang dipilih dari sidebar selalu masuk ke riwayat mode "chat"
      // (sidebar cuma tersedia di mode Chatting).
      setChatMessages(msgs as ChatMessage[]);
      setChatSession(sessionId);
      setSidebarOpen(false);
    } catch {
      /* ignore */
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chat.deleteSession(sessionId);
      if (chatSession === sessionId) {
        setChatMessages([]);
        setChatSession(null);
      }
      if (avatarSession === sessionId) {
        setAvatarMessages([]);
        setAvatarSession(null);
      }
      loadSessions();
    } catch {
      /* ignore */
    }
  };

  const newChat = () => {
    setChatMessages([]);
    setChatSession(null);
    setSidebarOpen(false);
    setAvatarAnim('idle');
  };

  // Mulai percakapan avatar yang baru/kosong (independen dari mode chat)
  const newAvatarChat = () => {
    setAvatarMessages([]);
    setAvatarSession(null);
    setAvatarAnim('idle');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('Semua field wajib diisi.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal harus 6 karakter.');
      return;
    }

    setPasswordLoading(true);
    try {
      await auth.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordSuccess('Password Anda berhasil diperbarui!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Gagal mengubah password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const lastAssistantItems =
    avatarMessages.length > 0 && avatarMessages[avatarMessages.length - 1].role === 'assistant'
      ? avatarMessages[avatarMessages.length - 1].items
      : undefined;

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {mode === 'chat' && (
        <Sidebar
          sessions={sessions}
          currentSession={chatSession}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onNewChat={newChat}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && mode === 'chat' && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-25 lg:hidden transition-opacity duration-200"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Hidden Audio for VRM Lip sync */}
        <audio id="tts-audio" className="hidden" crossOrigin="anonymous" />

        {/* Header */}
        <header className="border-b border-slate-800/80 px-4 py-3 bg-[#0F1420] flex-shrink-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {mode === 'chat' && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h1 className="font-bold text-slate-100 text-base tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-sm shadow-indigo-500/50"></span>
                Readoo AI
              </h1>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-[#0D121D] rounded-lg p-1 border border-slate-800">
              <button
                onClick={() => setMode('chat')}
                className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-all ${
                  mode === 'chat'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chatting
              </button>
              <button
                onClick={() => setMode('avatar')}
                className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-all ${
                  mode === 'avatar'
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3D Avatar
              </button>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="btn-linear-secondary text-xs py-1.5 px-3"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                title="Ganti Password"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Dual-Pane Body Area */}
        <div className="flex-1 flex overflow-hidden relative bg-[#0B0F17]">
          {/* Left / Main Chat Content */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#0B0F17]">
            {/* Chatting View */}
            {mode === 'chat' ? (
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-[#0B0F17]">
                {chatMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-slate-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40 text-indigo-400" />
                      <p className="font-medium text-slate-300 text-sm">Mulai chat dengan {assistantName}, asisten AI Anda</p>
                      <p className="text-xs text-slate-500 mt-1">Enterprise Search RAG & Fast-Path Pipeline Aktif</p>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i}>
                    <ChatBubble
                      message={msg}
                      isStreaming={streaming && i === chatMessages.length - 1}
                    />

                    {/* Rekomendasi buku / dokumen items */}
                    {msg.role === 'assistant' && msg.items && msg.items.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 animate-fade-in">
                        {msg.items.map((item, j) => (
                          <ItemCard key={j} item={item} index={j} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {loading && !streaming && (
                  <div className="flex justify-start">
                    <div className="message-bubble-ai">
                      <div className="flex gap-1.5 py-1">
                        <div
                          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        />
                        <div
                          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* CyberVerse Avatar View - Full Panel Edge-to-Edge */
              <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950">
                <div className="w-full h-full relative flex items-center justify-center">
                  <VrmTalkingHeadAvatar
                    vrmUrl={avatarVrmUrl}
                    bgImage={avatarBgImage}
                    offsetX={avatarOffsetX}
                    offsetY={avatarOffsetY}
                    scale={avatarScale}
                    rotation={avatarRotation}
                    isMirrored={avatarIsMirrored}
                    audioUrl={avatarAudioUrl}
                    onAudioEnded={() => {
                      setShowAvatarBubble(false);
                      setAvatarAudioUrl(null);
                    }}
                    assistantName={assistantName}
                    isSpeaking={loading}
                    isFull={true}
                  />

                  {showAvatarBubble &&
                    avatarMessages.length > 0 &&
                    avatarMessages[avatarMessages.length - 1].role === 'assistant' && (
                      <div className="absolute top-4 right-4 w-80 z-20 animate-fade-in pointer-events-auto transition-all duration-300">
                        <div className="relative w-80 max-h-48 shadow-2xl rounded-2xl p-3.5 border border-indigo-500/30 bg-[#131825]/95 backdrop-blur-md flex flex-col">
                          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                {assistantName.charAt(0).toUpperCase()}
                              </div>
                              <p className="text-xs font-bold text-indigo-400">
                                {assistantName}
                              </p>
                            </div>
                            {avatarAudioUrl && (
                              <span className="text-[10px] text-emerald-400 font-mono font-medium animate-pulse flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Suara Aktif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed overflow-y-auto max-h-32 pr-1">
                            {avatarMessages[avatarMessages.length - 1].content}
                          </p>
                        </div>
                      </div>
                    )}

                  {lastAssistantItems && lastAssistantItems.length > 0 && (
                    <div className="absolute bottom-6 inset-x-4 overflow-x-auto flex gap-3 p-2 z-10 scrollbar-none snap-x pointer-events-auto">
                      {lastAssistantItems.map((item, i) => (
                        <div key={i} className="flex-shrink-0 w-72 snap-center shadow-lg rounded-xl">
                          <ItemCard item={item} index={i} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input Form Footer */}
            <div className="border-t border-slate-800/80 px-4 py-3 bg-[#0F1420]/90 backdrop-blur-md flex-shrink-0 z-20">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <AudioRecorder
                  onTranscribed={(text) => setInput((prev) => prev + ' ' + text)}
                  disabled={loading}
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="input-linear flex-1 resize-none h-10 max-h-32 font-sans"
                  placeholder="Ketik pesan atau pertanyaan..."
                  rows={1}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="btn-linear-primary p-2.5 rounded-lg"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Linear RAG Inspector (Desktop Split-View Showcase) */}
          <div className="hidden md:block">
            <RagInspector
              items={
                (() => {
                  const activeMsgs = mode === 'chat' ? chatMessages : avatarMessages;
                  const lastAss = [...activeMsgs].reverse().find((m) => m.role === 'assistant');
                  return lastAss?.all_items || lastAss?.items || [];
                })()
              }
              isFastPath={chatMessages.length > 0 && chatMessages[chatMessages.length - 1]?.fast_path}
            />
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-150 dark:border-gray-700 overflow-hidden transform transition-all duration-300 animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Ganti Password</h3>
              </div>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                }}
                className="p-1 hover:bg-gray-150 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/45 text-red-600 dark:text-red-400 text-xs rounded-lg border border-red-100 dark:border-red-900/50 font-medium">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-950/45 text-green-600 dark:text-green-400 text-xs rounded-lg border border-green-100 dark:border-green-900/50 font-medium">
                  {passwordSuccess}
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-505 dark:text-gray-400 uppercase tracking-wider">
                  Password Lama
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-755 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  placeholder="Masukkan password lama"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-505 dark:text-gray-400 uppercase tracking-wider">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-650 rounded-lg bg-white dark:bg-gray-755 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  placeholder="Minimal 6 karakter"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-550 dark:text-gray-400 uppercase tracking-wider">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-650 rounded-lg bg-white dark:bg-gray-755 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-655 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  disabled={passwordLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-1.5"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}