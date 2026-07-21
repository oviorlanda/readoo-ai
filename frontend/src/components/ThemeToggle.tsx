import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return true; // Default to Dark Mode
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDark = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <button
      onClick={toggleDark}
      className={`p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors ${className}`}
      aria-label="Toggle dark mode"
      title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
    >
      {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
    </button>
  );
};
