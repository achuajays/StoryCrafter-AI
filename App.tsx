
import React, { useState, useCallback, useEffect } from 'react';
import { StoryPrompt, StoryOutput, Chapter, StoryArtwork, PromptTemplate } from './types';
import { GENRES, TONES, LANGUAGES, THEMES } from './constants';
import { generateInitialStory, generateNextChapter, translateChapter } from './services/supabaseService';
import { generateImage } from './services/imageService';
import Header from './components/Header';
import PromptForm from './components/PromptForm';
import StoryDisplay from './components/StoryDisplay';
import Loader from './components/Loader';

const parseStory = (text: string): StoryOutput => {
  const getSectionContent = (allText: string, startTag: string, endTag?: string): string => {
    const startIndex = allText.indexOf(startTag);
    if (startIndex === -1) return '';
    const contentStart = startIndex + startTag.length;

    let contentEnd;
    if (endTag) {
        contentEnd = allText.indexOf(endTag, contentStart);
    } else {
        contentEnd = allText.indexOf('\n[', contentStart);
    }
    
    if (contentEnd === -1) {
        contentEnd = allText.length;
    }

    return allText.substring(contentStart, contentEnd).trim();
  };

  const title = getSectionContent(text, '[TITLE]', '[DEDICATION]');
  const dedication = getSectionContent(text, '[DEDICATION]', '[CHARACTERS]');
  
  const rawCharacters = getSectionContent(text, '[CHARACTERS]', '[CHAPTER_OUTLINE]');
  const characters = rawCharacters
    .split('\n')
    .map(line => line.replace(/\*/g, '').trim())
    .filter(Boolean)
    .join('\n');
    
  const outlineText = getSectionContent(text, '[CHAPTER_OUTLINE]', '[CHAPTER_');

  const chapterOutline = outlineText
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean);

  const chapters: Chapter[] = [];
  const chapterRegex = /\[CHAPTER_\d+:\s*(.*?)\]\s*([\s\S]*?)(?=\s*\[CHAPTER_|$)/g;
  let match;
  while ((match = chapterRegex.exec(text)) !== null) {
    chapters.push({
      title: match[1].trim(),
      content: match[2].trim(),
    });
  }

  return { title, dedication, characters, chapterOutline, chapters };
};


const App: React.FC = () => {
  const [prompt, setPrompt] = useState<StoryPrompt>({
    genre: GENRES[0],
    tone: TONES[0],
    character: 'A cynical detective with a secret past',
    setting: 'A rain-soaked cyberpunk city in 2088',
    theme: 'Redemption',
    isEpic: false,
  });
  const [activePrompt, setActivePrompt] = useState<StoryPrompt | null>(null);
  const [story, setStory] = useState<StoryOutput | null>(null);
  const [artwork, setArtwork] = useState<StoryArtwork | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isContinuing, setIsContinuing] = useState<boolean>(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState<boolean>(false);
  const [generatingIllustrationIndex, setGeneratingIllustrationIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Translation State
  const [targetLanguage, setTargetLanguage] = useState<string>(LANGUAGES[0].code);
  const [translatingChapterIndex, setTranslatingChapterIndex] = useState<number | null>(null);
  const [isTranslatingAll, setIsTranslatingAll] = useState<boolean>(false);

  // Personalization State
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('storycrafter-theme') || THEMES[0].id);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>(() => {
    const saved = localStorage.getItem('storycrafter-templates');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(theme);
    localStorage.setItem('storycrafter-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('storycrafter-templates', JSON.stringify(promptTemplates));
  }, [promptTemplates]);

  const handleGenerateClick = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStory(null);
    setArtwork(null);
    setActivePrompt(null);
    try {
      const generatedText = await generateInitialStory(prompt);
      if (!generatedText) {
        throw new Error('The AI returned an empty response.');
      }
      const parsed = parseStory(generatedText);
      setStory(parsed);
      setArtwork({
        cover: null,
        chapterIllustrations: Array(parsed.chapters.length).fill(null),
      });
      setActivePrompt(prompt);
      setTargetLanguage(LANGUAGES[0].code);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  const handleContinueStory = useCallback(async () => {
    if (!story || !activePrompt || isContinuing) return;

    const nextChapterIndex = story.chapters.length;
    if (nextChapterIndex >= story.chapterOutline.length) {
        setError("You've reached the end of the story outline!");
        return;
    }

    setIsContinuing(true);
    setError(null);

    const nextChapterTitle = story.chapterOutline[nextChapterIndex];

    try {
        const newChapterContent = await generateNextChapter(activePrompt, story, nextChapterTitle);
        if (!newChapterContent) {
            throw new Error("The AI returned an empty response for the next chapter.");
        }
        
        const newChapter: Chapter = {
            title: nextChapterTitle,
            content: newChapterContent,
        };

        setStory(prevStory => {
            if (!prevStory) return null;
            return {
                ...prevStory,
                chapters: [...prevStory.chapters, newChapter],
            };
        });
        
        setArtwork(prev => prev ? ({ ...prev, chapterIllustrations: [...prev.chapterIllustrations, null] }) : null);

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while continuing the story.');
    } finally {
        setIsContinuing(false);
    }
  }, [story, activePrompt, isContinuing]);

  const handleGenerateCover = useCallback(async () => {
    if (!story || !activePrompt || isGeneratingCover) return;
    setIsGeneratingCover(true);
    setError(null);
    try {
        const coverPrompt = `A stunning, high-quality book cover for a ${activePrompt.genre} story titled "${story.title}". The scene should depict ${activePrompt.setting}. The overall tone should be ${activePrompt.tone}. Cinematic, detailed, epic fantasy art style.`;
        const coverImageB64 = await generateImage(coverPrompt);
        setArtwork(prev => prev ? { ...prev, cover: `data:image/png;base64,${coverImageB64}` } : { cover: `data:image/png;base64,${coverImageB64}`, chapterIllustrations: [] });
    } catch (err) {
        console.error("Failed to generate cover:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the cover.');
    } finally {
        setIsGeneratingCover(false);
    }
  }, [story, activePrompt, isGeneratingCover]);
  
  const handleGenerateChapterIllustration = useCallback(async (chapterIndex: number) => {
    if (!story || !activePrompt || generatingIllustrationIndex !== null || chapterIndex >= story.chapters.length) return;
    setGeneratingIllustrationIndex(chapterIndex);
    setError(null);
    try {
        const chapter = story.chapters[chapterIndex];
        const chapterPrompt = `An illustration for a chapter titled "${chapter.title}" from a ${activePrompt.genre} story about ${activePrompt.character} in ${activePrompt.setting}. Style: atmospheric digital painting. Focus on the main character and the key mood of the chapter.`;
        const chapterImageB64 = await generateImage(chapterPrompt);
        setArtwork(prev => {
            if (!prev) return null;
            const newIllustrations = [...prev.chapterIllustrations];
            newIllustrations[chapterIndex] = `data:image/png;base64,${chapterImageB64}`;
            return { ...prev, chapterIllustrations: newIllustrations };
        });
    } catch (err) {
        console.error(`Failed to generate illustration for chapter ${chapterIndex + 1}:`, err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while generating the illustration.');
    } finally {
        setGeneratingIllustrationIndex(null);
    }
  }, [story, activePrompt, generatingIllustrationIndex]);

  const handleTranslateChapter = useCallback(async (chapterIndex: number) => {
    if (!story || targetLanguage === 'en' || translatingChapterIndex !== null || isTranslatingAll) return;
    
    const languageName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
    setTranslatingChapterIndex(chapterIndex);
    setError(null);

    try {
        const chapterToTranslate = story.chapters[chapterIndex];
        const { title, content } = await translateChapter(chapterToTranslate, languageName);

        setStory(prevStory => {
            if (!prevStory) return null;
            const newChapters = [...prevStory.chapters];
            newChapters[chapterIndex] = {
                ...newChapters[chapterIndex],
                translatedTitle: title,
                translatedContent: content,
                translatedLanguage: targetLanguage,
            };
            return { ...prevStory, chapters: newChapters };
        });
    } catch (err) {
        console.error(`Failed to translate chapter ${chapterIndex + 1}:`, err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred during translation.');
    } finally {
        setTranslatingChapterIndex(null);
    }
  }, [story, targetLanguage, translatingChapterIndex, isTranslatingAll]);

  const handleTranslateAllChapters = useCallback(async () => {
    if (!story || targetLanguage === 'en' || isTranslatingAll) return;

    setIsTranslatingAll(true);
    setError(null);
    
    const languageName = LANGUAGES.find(l => l.code === targetLanguage)?.name || targetLanguage;
    const chaptersToTranslate = story.chapters.filter(ch => ch.translatedLanguage !== targetLanguage);

    for (const chapter of chaptersToTranslate) {
        const index = story.chapters.indexOf(chapter);
        try {
            // Re-using the single chapter logic to show progress
            await handleTranslateChapter(index);
        } catch (err) {
            // Error is set in the single handler
            setIsTranslatingAll(false);
            return; 
        }
    }

    setIsTranslatingAll(false);
}, [story, targetLanguage, isTranslatingAll, handleTranslateChapter]);


  const handleLanguageChange = useCallback((langCode: string) => {
    setTargetLanguage(langCode);
  }, []);

  const handlePromptChange = <K extends keyof StoryPrompt>(field: K, value: StoryPrompt[K]) => {
    setPrompt(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSaveTemplate = () => {
    const name = window.prompt("Enter a name for this template:");
    if (name && name.trim()) {
        const newTemplate: PromptTemplate = { name: name.trim(), prompt };
        setPromptTemplates(prev => [...prev.filter(t => t.name !== name), newTemplate]);
    }
  };

  const handleLoadTemplate = (templateName: string) => {
    const template = promptTemplates.find(t => t.name === templateName);
    if (template) {
        setPrompt(template.prompt);
    }
  };

  const handleDeleteTemplate = (templateName: string) => {
     if (window.confirm(`Are you sure you want to delete the template "${templateName}"?`)) {
        setPromptTemplates(prev => prev.filter(t => t.name !== templateName));
     }
  };


  return (
    <div className="min-h-screen bg-primary text-primary">
      <Header theme={theme} onThemeChange={setTheme} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-4 xl:col-span-3">
            <PromptForm 
              prompt={prompt} 
              onPromptChange={handlePromptChange} 
              onSubmit={handleGenerateClick}
              isLoading={isLoading} 
              templates={promptTemplates}
              onSaveTemplate={handleSaveTemplate}
              onLoadTemplate={handleLoadTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-secondary rounded-lg shadow-lg p-6 min-h-[60vh] flex flex-col justify-center items-center ring-1 ring-custom">
              {isLoading && <Loader />}
              {error && !(isLoading || isContinuing) && (
                <div className="text-center text-error">
                  <h3 className="text-xl font-semibold mb-2">An Error Occurred</h3>
                  <p>{error}</p>
                </div>
              )}
              {!isLoading && !error && story && (
                <StoryDisplay 
                  story={story}
                  artwork={artwork}
                  onContinue={handleContinueStory}
                  isContinuing={isContinuing}
                  onGenerateCover={handleGenerateCover}
                  isGeneratingCover={isGeneratingCover}
                  onGenerateChapterIllustration={handleGenerateChapterIllustration}
                  generatingIllustrationIndex={generatingIllustrationIndex}
                  // Translation props
                  targetLanguage={targetLanguage}
                  onLanguageChange={handleLanguageChange}
                  onTranslateChapter={handleTranslateChapter}
                  translatingChapterIndex={translatingChapterIndex}
                  onTranslateAllChapters={handleTranslateAllChapters}
                  isTranslatingAll={isTranslatingAll}
                />
              )}
              {!isLoading && !error && !story && (
                 <div className="text-center text-secondary">
                    <h2 className="text-2xl font-bold text-primary mb-2">Welcome to StoryCrafter AI</h2>
                    <p>Fill out the prompts on the left and click "Craft My Story" to begin your creative journey.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;