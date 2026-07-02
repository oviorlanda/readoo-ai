import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { admin } from '../services/api';
import type { Collection, AdminStats, Settings } from '../types';
import {
  LayoutDashboard,
  Database,
  Settings2,
  Users,
  ArrowLeft,
  Volume2,
  Brain,
} from 'lucide-react';
import { DashboardTab } from '../components/admin/DashboardTab';
import { CollectionsTab } from '../components/admin/CollectionsTab';
import { DatasetUploadTab } from '../components/admin/DatasetUploadTab';
import { SettingsTab } from '../components/admin/SettingsTab';
import { UsersTab } from '../components/admin/UsersTab';
import { LLMTestTab } from '../components/admin/LLMTestTab';
import { TTSTestTab } from '../components/admin/TTSTestTab';
import { Button } from '../components/ui/Button';

type Tab = 'dashboard' | 'collections' | 'dataset' | 'settings' | 'users' | 'llm' | 'tts';

export default function AdminPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [users, setUsers] = useState<{ id: number; nama_lengkap: string; email: string; role: string }[]>([]);
  const [message, setMessage] = useState('');

  // Fetch dashboard stats
  useEffect(() => {
    if (activeTab === 'dashboard') {
      admin.getStats().then(setStats).catch(() => {});
    }
  }, [activeTab]);

  const loadCollections = () => {
    admin.getCollections().then(setCollections).catch(() => {});
  };

  const loadSettings = () => {
    admin.getSettings().then(setSettings).catch(() => {});
  };

  const loadUsers = () => {
    admin.getUsers().then(setUsers).catch(() => {});
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSetActiveCollection = async (colId: number) => {
    try {
      await admin.setActiveCollection(colId);
      loadCollections();
      showMessage('Koleksi aktif diperbarui');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal mengaktifkan koleksi');
    }
  };

  const handleRebuildIndex = async (colId: number) => {
    try {
      await admin.rebuildIndex(colId);
      showMessage('Index FAISS berhasil dibangun ulang');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal membangun ulang index');
    }
  };

  const handleDeleteCollection = async (colId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus koleksi ini? Semua dokumen terkait akan dihapus.')) return;
    try {
      await admin.deleteCollection(colId);
      loadCollections();
      showMessage('Koleksi berhasil dihapus');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menghapus koleksi');
    }
  };

  const handleUpdateUserRole = async (userId: number, role: string) => {
    try {
      await admin.updateUserRole(userId, role);
      loadUsers();
      showMessage('Role pengguna berhasil diperbarui');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal memperbarui role');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus pengguna ini? Semua data sesi juga akan dihapus.')) return;
    try {
      await admin.deleteUser(userId);
      loadUsers();
      showMessage('Pengguna berhasil dihapus');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menghapus pengguna');
    }
  };

  const handleSaveSettings = async (formSettings: Record<string, string>) => {
    try {
      await admin.saveSettings(formSettings);
      loadSettings();
      showMessage('Pengaturan berhasil disimpan');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Gagal menyimpan pengaturan');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'collections', label: 'Koleksi', icon: <Database className="w-4 h-4" /> },
    { id: 'dataset', label: 'Dataset', icon: <Database className="w-4 h-4" /> },
    { id: 'settings', label: 'Pengaturan', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'users', label: 'Pengguna', icon: <Users className="w-4 h-4" /> },
    { id: 'llm', label: 'LLM', icon: <Brain className="w-4 h-4" /> },
    { id: 'tts', label: 'TTS', icon: <Volume2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Top Bar */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500"
              title="Kembali ke Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Panel</h1>
          </div>
          <Button onClick={handleLogout} variant="secondary" className="text-sm py-1.5 px-3">
            Keluar
          </Button>
        </div>
      </header>

      {message && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in text-sm font-medium">
          {message}
        </div>
      )}

      <div className="flex max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation */}
        <nav className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'collections') loadCollections();
                if (tab.id === 'settings') loadSettings();
                if (tab.id === 'users') loadUsers();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardTab stats={stats} />}

          {activeTab === 'collections' && (
            <CollectionsTab
              collections={collections}
              onRefresh={loadCollections}
              onSetActive={handleSetActiveCollection}
              onRebuildIndex={handleRebuildIndex}
              onDelete={handleDeleteCollection}
            />
          )}

          {activeTab === 'dataset' && (
            <DatasetUploadTab
              onSuccess={() => {
                loadCollections();
                showMessage('Dataset berhasil diimpor');
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab settings={settings} onSave={handleSaveSettings} />
          )}

          {activeTab === 'users' && (
            <UsersTab
              users={users}
              onUpdateRole={handleUpdateUserRole}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeTab === 'llm' && <LLMTestTab />}

          {activeTab === 'tts' && <TTSTestTab />}
        </div>
      </div>
    </div>
  );
}