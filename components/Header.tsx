
import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { THEMES } from '../constants';

interface HeaderProps {
    theme: string;
    onThemeChange: (themeId: string) => void;
}

const Header: React.FC<HeaderProps> = ({ theme, onThemeChange }) => {
  return (
    <header className="bg-primary/70 backdrop-blur-sm sticky top-0 z-20 border-b border-primary">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight text-primary">
            StoryCrafter <span className="text-accent">AI</span>
            </h1>
        </div>
        <div>
            <select
                aria-label="Select theme"
                value={theme}
                onChange={(e) => onThemeChange(e.target.value)}
                className="bg-input border border-input rounded-md py-1.5 px-2 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition"
            >
            {THEMES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            </select>
        </div>
      </div>
    </header>
  );
};

export default Header;
