import React from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

interface User {
  id: number;
  nama_lengkap: string;
  email: string;
  role: string;
}

interface UsersTabProps {
  users: User[];
  onUpdateRole: (userId: number, newRole: string) => void;
  onDeleteUser: (userId: number) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  onUpdateRole,
  onDeleteUser,
}) => {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Manajemen Pengguna</h2>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{u.nama_lengkap}</p>
              <p className="text-sm text-gray-500">
                {u.email} · <span className="font-semibold">{u.role}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={u.role}
                onChange={(e) => onUpdateRole(u.id, e.target.value)}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
                className="text-sm py-1 px-2 h-9 w-28 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
              />
              <button
                onClick={() => onDeleteUser(u.id)}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                title="Hapus Pengguna"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
