
import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/70 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700/50">
      <div className="container mx-auto px-4 py-4 flex items-center gap-3">
        <BookOpenIcon className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold tracking-tight text-white">
          StoryCrafter <span className="text-amber-400">AI</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;
