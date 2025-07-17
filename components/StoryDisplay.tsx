import React, { useState } from 'react';
import { StoryOutput } from '../types';
import { generateBookPdf } from '../services/pdfService';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface StoryDisplayProps {
  story: StoryOutput;
  onContinue: () => void;
  isContinuing: boolean;
}

const StorySection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`mb-8 ${className}`}>
        <h3 className="text-lg font-bold text-amber-400 mb-3 border-b-2 border-amber-400/20 pb-2">{title}</h3>
        <div className="text-slate-300 prose prose-invert max-w-none prose-p:text-slate-300 prose-li:text-slate-300">
            {children}
        </div>
    </div>
);

const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, onContinue, isContinuing }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const canContinue = story.chapters.length < story.chapterOutline.length;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Short delay for better UX, allowing the UI to update to the loading state.
      await new Promise(resolve => setTimeout(resolve, 100));
      generateBookPdf(story);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      // In a real app, you might want to show a user-facing error message here.
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full h-full animate-fade-in text-left">
      <h2 className="font-serif text-4xl font-bold text-center mb-2 text-white">{story.title || "Untitled Story"}</h2>
      {story.dedication && (
        <p className="font-serif text-center italic text-slate-400 mb-8">{story.dedication}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
            {story.characters && (
                 <StorySection title="Characters">
                    <div className="whitespace-pre-wrap font-sans text-sm">{story.characters}</div>
                 </StorySection>
            )}
             {story.chapterOutline && story.chapterOutline.length > 0 && (
                 <StorySection title="Chapter Outline">
                    <ol className="list-decimal list-inside space-y-1 font-sans text-sm">
                      {story.chapterOutline.map((title, index) => (
                        <li key={index} className={index < story.chapters.length ? 'text-slate-200 font-medium' : 'text-slate-400 italic'}>
                          {title}
                        </li>
                      ))}
                    </ol>
                 </StorySection>
            )}
        </div>
        <div className="md:col-span-2 space-y-8">
            {story.chapters.map((chapter, index) => (
                <StorySection title={`Chapter ${index + 1}: ${chapter.title}`} key={index}>
                    <p className="whitespace-pre-wrap font-serif leading-relaxed">{chapter.content}</p>
                </StorySection>
            ))}
        </div>
      </div>
      
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        {canContinue && (
            <button
                onClick={onContinue}
                disabled={isContinuing || isDownloading}
                className="w-full max-w-sm flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
            >
                {isContinuing ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Writing Next Chapter...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5" />
                        Continue Story
                    </>
                )}
            </button>
        )}
        <button
            onClick={handleDownload}
            disabled={isDownloading || isContinuing}
            className="w-full max-w-sm flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:bg-slate-600 disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
        >
            {isDownloading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Book...
                </>
            ) : (
                <>
                    <DownloadIcon className="w-5 h-5" />
                    Download as Book
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default StoryDisplay;