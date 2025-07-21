
import React, { useState } from 'react';
import { StoryOutput, StoryArtwork, AnalysisReport } from '../types';
import { generateBookPdf } from '../services/pdfService';
import { generateBookEpub } from '../services/epubService';
import Modal from './Modal';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { MagicWandIcon } from './icons/MagicWandIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { SwitchHorizontalIcon } from './icons/SwitchHorizontalIcon';
import { LANGUAGES } from '../constants';

interface StoryDisplayProps {
  story: StoryOutput;
  artwork: StoryArtwork | null;
  onContinue: () => void;
  isContinuing: boolean;
  onGenerateCover: () => void;
  isGeneratingCover: boolean;
  onGenerateChapterIllustration: (index: number) => void;
  generatingIllustrationIndices: Set<number>;
  // Translation Props
  targetLanguage: string;
  onLanguageChange: (langCode: string) => void;
  onTranslateChapter: (index: number) => void;
  translatingChapterIndex: number | null;
  onTranslateAllChapters: () => void;
  isTranslatingAll: boolean;
  // Writing Tools Props
  plotTwists: string[] | null;
  isGeneratingTwists: boolean;
  onGeneratePlotTwists: () => void;
  onClosePlotTwists: () => void;
  analysisReport: AnalysisReport | null;
  isAnalyzing: boolean;
  onAnalyzeStory: () => void;
  onCloseAnalysis: () => void;
  generatingAlternativeFor: number | null;
  onGenerateAlternative: (index: number) => void;
  onPromoteAlternative: (index: number) => void;
}

const StorySection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`mb-4 ${className}`}>
        <h3 className="text-lg font-bold text-accent mb-3 border-b-2 border-accent/20 pb-2">{title}</h3>
        <div className="text-secondary prose-custom max-w-none">
            {children}
        </div>
    </div>
);

const ArtworkPlaceholder: React.FC<{ onGenerate: () => void, isLoading: boolean, buttonText: string, disabled: boolean }> = ({ onGenerate, isLoading, buttonText, disabled }) => (
    <div className="relative aspect-video w-full rounded-lg border-2 border-dashed border-input flex items-center justify-center mb-4 bg-input/50">
        <button
            onClick={onGenerate}
            disabled={disabled}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:bg-disabled disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100"
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Generating...
                </>
            ) : (
                <>
                    <PhotoIcon className="w-5 h-5" />
                    {buttonText}
                </>
            )}
        </button>
    </div>
);

const StoryDisplay: React.FC<StoryDisplayProps> = (props) => {
  const { 
    story, artwork, onContinue, isContinuing, onGenerateCover, isGeneratingCover,
    onGenerateChapterIllustration, generatingIllustrationIndices,
    targetLanguage, onLanguageChange, onTranslateChapter, translatingChapterIndex,
    onTranslateAllChapters, isTranslatingAll,
    plotTwists, isGeneratingTwists, onGeneratePlotTwists, onClosePlotTwists,
    analysisReport, isAnalyzing, onAnalyzeStory, onCloseAnalysis,
    generatingAlternativeFor, onGenerateAlternative, onPromoteAlternative
  } = props;

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingEpub, setIsDownloadingEpub] = useState(false);

  const canContinue = story.chapters.length < story.chapterOutline.length;

  // Granular busy states for better concurrency control
  const isAnyIllustrationGenerating = generatingIllustrationIndices.size > 0;
  const isMajorActionRunning = 
    isContinuing ||
    isDownloadingPdf ||
    isDownloadingEpub ||
    isTranslatingAll ||
    isGeneratingTwists ||
    isAnalyzing ||
    translatingChapterIndex !== null ||
    generatingAlternativeFor !== null ||
    isGeneratingCover;

  // This is for "global" buttons that should be disabled if any major action OR any art generation is happening.
  const isGenerallyBusy = isMajorActionRunning || isAnyIllustrationGenerating;
  
  const commonSelectClasses = "bg-input border border-input rounded-md shadow-sm py-2 px-3 text-primary focus:outline-none focus:ring-2 focus:ring-accent transition";
  const buttonBaseClasses = "w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-md transition-all duration-200 disabled:bg-disabled disabled:cursor-not-allowed transform hover:scale-105 disabled:scale-100";
  const toolButtonClasses = "flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 disabled:bg-disabled disabled:cursor-not-allowed";

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      generateBookPdf(story, artwork);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsDownloadingPdf(false);
    }
  };
  
  const handleDownloadEpub = async () => {
    setIsDownloadingEpub(true);
    try {
        await generateBookEpub(story, artwork);
    } catch (error) {
        console.error("Failed to generate ePub:", error);
    } finally {
        setIsDownloadingEpub(false);
    }
  };

  return (
    <div className="w-full h-full animate-fade-in text-left">
      {plotTwists && (
        <Modal title="Suggested Plot Twists" isOpen={!!plotTwists} onClose={onClosePlotTwists}>
            <ul className="space-y-4">
                {plotTwists.map((twist, i) => (
                    <li key={i} className="p-4 bg-primary rounded-lg border border-primary text-secondary">
                        <span className="font-bold text-accent mr-2">Twist {i+1}:</span> {twist}
                    </li>
                ))}
            </ul>
        </Modal>
      )}
      {analysisReport && (
        <Modal title="Story Analysis Report" isOpen={!!analysisReport} onClose={onCloseAnalysis}>
            <div className="space-y-6">
                <StorySection title="Pacing Analysis">
                    <p className="whitespace-pre-wrap font-sans leading-relaxed">{analysisReport.pacing}</p>
                </StorySection>
                 <StorySection title="Tone Consistency">
                    <p className="whitespace-pre-wrap font-sans leading-relaxed">{analysisReport.tone}</p>
                </StorySection>
                 <StorySection title="Actionable Suggestions">
                    <p className="whitespace-pre-wrap font-sans leading-relaxed">{analysisReport.suggestions}</p>
                </StorySection>
            </div>
        </Modal>
      )}

      <div className="mb-8">
        {artwork?.cover ? (
          <div className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-custom">
              <img src={artwork.cover} alt={`${story.title} book cover`} className="w-full h-auto object-cover" />
          </div>
        ) : (
          <ArtworkPlaceholder
            onGenerate={onGenerateCover}
            isLoading={isGeneratingCover}
            buttonText="Generate Book Cover"
            disabled={isGenerallyBusy}
          />
        )}
      </div>

      <h2 className="font-serif text-4xl font-bold text-center mb-2 text-primary">{story.title || "Untitled Story"}</h2>
      {story.dedication && (
        <p className="font-serif text-center italic text-secondary mb-8">{story.dedication}</p>
      )}
      
      {/* Writing Tools */}
      <div className="my-6 p-4 bg-secondary rounded-lg ring-1 ring-custom">
        <h3 className="text-lg font-bold text-accent mb-3 text-center">Writing Tools</h3>
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center flex-wrap">
            <button onClick={onGeneratePlotTwists} disabled={isGenerallyBusy} className={toolButtonClasses}>
                {isGeneratingTwists ? 'Thinking...' : <><MagicWandIcon className="w-5 h-5" /> Suggest Plot Twists</>}
            </button>
            <button onClick={onAnalyzeStory} disabled={isGenerallyBusy || canContinue} className={toolButtonClasses} title={canContinue ? "Finish the story to enable analysis" : "Analyze Story"}>
                {isAnalyzing ? 'Analyzing...' : <><ChartBarIcon className="w-5 h-5" /> Analyze Story</>}
            </button>
        </div>
      </div>

      {/* Translation Controls */}
      <div className="my-6 p-4 bg-secondary rounded-lg ring-1 ring-custom flex flex-col sm:flex-row items-center gap-4 justify-between flex-wrap">
        <div className="flex items-center gap-2">
            <GlobeIcon className="w-6 h-6 text-link" />
            <label htmlFor="language" className="font-medium text-secondary">Translate to:</label>
            <select id="language" value={targetLanguage} onChange={e => onLanguageChange(e.target.value)} disabled={isGenerallyBusy} className={commonSelectClasses}>
              {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
            </select>
        </div>
        {targetLanguage !== 'en' && (
            <button
              onClick={onTranslateAllChapters}
              disabled={isGenerallyBusy}
              className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-md transition-all duration-200 disabled:bg-disabled disabled:cursor-not-allowed"
            >
              {isTranslatingAll ? 'Translating...' : 'Translate All Chapters'}
            </button>
        )}
      </div>


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
                        <li key={index} className={index < story.chapters.length ? 'text-primary font-medium' : 'text-secondary italic'}>
                          {title}
                        </li>
                      ))}
                    </ol>
                 </StorySection>
            )}
        </div>
        <div className="md:col-span-2 space-y-8">
            {story.chapters.map((chapter, index) => {
              const isTranslatingThis = translatingChapterIndex === index;
              const isTranslated = chapter.translatedContent && chapter.translatedLanguage === targetLanguage;
              const displayTitle = isTranslated ? chapter.translatedTitle! : chapter.title;
              const displayContent = isTranslated ? chapter.translatedContent! : chapter.content;
              const isGeneratingAlternative = generatingAlternativeFor === index;
              const isGeneratingThisIllustration = generatingIllustrationIndices.has(index);

              // A chapter's local tools (translate, alternative) should be disabled if any major action or *any* art generation is running.
              const isThisChapterLocked = isMajorActionRunning || isAnyIllustrationGenerating;

              return (
                <div key={index}>
                    <div className="mb-4">
                        {artwork?.chapterIllustrations?.[index] ? (
                            <div className="rounded-md overflow-hidden shadow-lg ring-1 ring-custom">
                                <img src={artwork.chapterIllustrations[index]!} alt={`Illustration for ${chapter.title}`} className="w-full h-auto object-cover" />
                            </div>
                        ) : (
                           <ArtworkPlaceholder
                             onGenerate={() => onGenerateChapterIllustration(index)}
                             isLoading={isGeneratingThisIllustration}
                             buttonText="Generate Illustration"
                             disabled={isMajorActionRunning || isGeneratingThisIllustration}
                           />
                        )}
                    </div>
                    
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-grow">
                        <StorySection title={`Chapter ${index + 1}: ${displayTitle}`}>
                            <p className="whitespace-pre-wrap font-serif leading-relaxed">{displayContent}</p>
                        </StorySection>
                      </div>
                      <div className="flex flex-col items-center gap-1 mt-2">
                        {targetLanguage !== 'en' && (
                          <button onClick={() => onTranslateChapter(index)} disabled={isThisChapterLocked} className="p-2 rounded-full hover:bg-input transition-colors disabled:opacity-50" title={isTranslated ? `Re-translate` : `Translate`}>
                            {isTranslatingThis ? (
                              <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                              <GlobeIcon className={`w-5 h-5 ${isTranslated ? 'text-link' : 'text-secondary'}`} />
                            )}
                          </button>
                        )}
                         <button onClick={() => onGenerateAlternative(index)} disabled={isThisChapterLocked} className="p-2 rounded-full hover:bg-input transition-colors disabled:opacity-50" title="Generate Alternative Version">
                            {isGeneratingAlternative ? (
                                <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <SwitchHorizontalIcon className="w-5 h-5 text-secondary" />
                            )}
                        </button>
                      </div>
                    </div>
                    {chapter.alternativeContent && (
                        <div className="mt-4 p-4 border-t-2 border-dashed border-accent/30 bg-primary/30 rounded-b-lg">
                             <h4 className="font-bold text-accent mb-2">Alternative Version</h4>
                             <p className="whitespace-pre-wrap font-serif leading-relaxed text-secondary">{chapter.alternativeContent}</p>
                             <button 
                                onClick={() => onPromoteAlternative(index)}
                                className="mt-4 text-sm bg-accent hover:bg-accent-hover text-accent-contrast font-bold py-1 px-3 rounded-md transition"
                             >
                                Promote to Main Version
                            </button>
                        </div>
                    )}
                </div>
              )
            })}
        </div>
      </div>
      
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
        {canContinue && (
            <button
                onClick={onContinue}
                disabled={isGenerallyBusy}
                className={`${buttonBaseClasses} max-w-xs bg-accent hover:bg-accent-hover text-accent-contrast`}
            >
                {isContinuing ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Writing...
                    </>
                ) : ( <> <SparklesIcon className="w-5 h-5" /> Continue Story </> )}
            </button>
        )}
        <div className="w-full max-w-xs flex flex-col items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerallyBusy}
              className={`${buttonBaseClasses} bg-sky-500 hover:bg-sky-600 text-white`}
            >
              {isDownloadingPdf ? (
                  <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generating PDF...
                  </>
              ) : ( <> <DownloadIcon className="w-5 h-5" /> Download PDF </>)}
            </button>
        </div>
        <div className="w-full max-w-xs flex flex-col items-center gap-3">
            <button
              onClick={handleDownloadEpub}
              disabled={isGenerallyBusy}
              className={`${buttonBaseClasses} bg-emerald-500 hover:bg-emerald-600 text-white`}
            >
              {isDownloadingEpub ? (
                  <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Generating ePub...
                  </>
              ) : ( <> <DownloadIcon className="w-5 h-5" /> Download ePub </>)}
            </button>
        </div>
      </div>
    </div>
  );
};

export default StoryDisplay;
