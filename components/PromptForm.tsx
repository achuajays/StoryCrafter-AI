import React, { useState } from 'react';
import { StoryPrompt, PromptTemplate } from '../types';
import { GENRES, TONES } from '../constants';
import { SparklesIcon } from './icons/SparklesIcon';

interface PromptFormProps {
  prompt: StoryPrompt;
  onPromptChange: <K extends keyof StoryPrompt>(field: K, value: StoryPrompt[K]) => void;
  onSubmit: () => void;
  isLoading: boolean;
  templates: PromptTemplate[];
  onSaveTemplate: () => void;
  onLoadTemplate: (name: string) => void;
  onDeleteTemplate: (name: string) => void;
}

const InputLabel: React.FC<{ children: React.ReactNode; htmlFor: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-secondary mb-1">
    {children}
  </label>
);

const PromptForm: React.FC<PromptFormProps> = (props) => {
  const { 
    prompt, onPromptChange, onSubmit, isLoading,
    templates, onSaveTemplate, onLoadTemplate, onDeleteTemplate
  } = props;
  
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const commonInputClasses = "w-full bg-input border border-input rounded-md shadow-sm py-2 px-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition";
  
  const handleLoadClick = () => {
    if (selectedTemplate) {
        onLoadTemplate(selectedTemplate);
    }
  };

  const handleDeleteClick = () => {
    if (selectedTemplate) {
        onDeleteTemplate(selectedTemplate);
        setSelectedTemplate('');
    }
  };

  return (
    <div className="bg-secondary p-6 rounded-lg shadow-lg sticky top-24 ring-1 ring-custom">
      <h2 className="text-xl font-bold mb-4 text-accent">Creative Prompts</h2>
      
      {/* Template Section */}
      <div className="space-y-2 mb-6 border-b border-primary pb-4">
        <InputLabel htmlFor="templates">📋 Prompt Templates</InputLabel>
        <div className="flex items-center gap-2">
            <select 
                id="templates" 
                value={selectedTemplate} 
                onChange={e => setSelectedTemplate(e.target.value)}
                className={`${commonInputClasses} flex-grow`}
            >
                <option value="">Select a template...</option>
                {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <button type="button" onClick={handleLoadClick} disabled={!selectedTemplate} className="p-2 bg-input rounded-md hover:bg-accent hover:text-accent-contrast disabled:opacity-50 transition">Load</button>
        </div>
        <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={onSaveTemplate} className="text-link hover:underline">Save Current</button>
            {selectedTemplate && (
                <button type="button" onClick={handleDeleteClick} className="text-error hover:underline ml-auto">Delete Selected</button>
            )}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
        <div>
          <InputLabel htmlFor="genre">📚 Genre</InputLabel>
          <select id="genre" value={prompt.genre} onChange={(e) => onPromptChange('genre', e.target.value)} className={commonInputClasses}>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <InputLabel htmlFor="tone">🎭 Tone</InputLabel>
          <select id="tone" value={prompt.tone} onChange={(e) => onPromptChange('tone', e.target.value)} className={commonInputClasses}>
            {TONES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between bg-input/50 p-3 rounded-md ring-1 ring-custom">
          <div>
            <label htmlFor="isEpic" className="font-medium text-primary cursor-pointer">✨ Epic Story Mode</label>
            <p className="text-xs text-secondary">Longer story with more chapters</p>
          </div>
          <label htmlFor="isEpic" className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              id="isEpic"
              checked={prompt.isEpic}
              onChange={(e) => onPromptChange('isEpic', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-input rounded-full peer focus:ring-2 focus:ring-accent peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all bg-accent-peer"></div>
          </label>
        </div>

        <div>
          <InputLabel htmlFor="character">🧑‍🤝‍🧑 Main Character</InputLabel>
          <input type="text" id="character" value={prompt.character} onChange={(e) => onPromptChange('character', e.target.value)} className={commonInputClasses} />
        </div>
        <div>
          <InputLabel htmlFor="setting">🏞️ Setting</InputLabel>
          <input type="text" id="setting" value={prompt.setting} onChange={(e) => onPromptChange('setting', e.target.value)} className={commonInputClasses} />
        </div>
        <div>
          <InputLabel htmlFor="theme">💡 Theme or Message</InputLabel>
          <input type="text" id="theme" value={prompt.theme} onChange={(e) => onPromptChange('theme', e.target.value)} className={commonInputClasses} />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-accent-contrast font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:bg-disabled disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Crafting...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              Craft My Story
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default PromptForm;
