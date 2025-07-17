
import React, { useState, useCallback } from 'react';
import { StoryPrompt, StoryOutput, Chapter } from './types';
import { GENRES, TONES } from './constants';
import { generateInitialStory, generateNextChapter } from './services/supabaseService';
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
  
  // Clean the characters section to remove markdown
  const rawCharacters = getSectionContent(text, '[CHARACTERS]', '[CHAPTER_OUTLINE]');
  const characters = rawCharacters
    .split('\n')
    .map(line => line.replace(/\*/g, '').trim()) // Remove all asterisks and trim whitespace
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isContinuing, setIsContinuing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateClick = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setStory(null);
    setActivePrompt(null);
    try {
      const generatedText = await generateInitialStory(prompt);
      if (!generatedText) {
        throw new Error('The AI returned an empty response.');
      }
      const parsed = parseStory(generatedText);
      setStory(parsed);
      setActivePrompt(prompt);
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

    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred while continuing the story.');
    } finally {
        setIsContinuing(false);
    }
  }, [story, activePrompt, isContinuing]);

  const handlePromptChange = <K extends keyof StoryPrompt>(field: K, value: StoryPrompt[K]) => {
    setPrompt(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-4 xl:col-span-3">
            <PromptForm 
              prompt={prompt} 
              onPromptChange={handlePromptChange} 
              onSubmit={handleGenerateClick}
              isLoading={isLoading} 
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="bg-slate-800/50 rounded-lg shadow-lg p-6 min-h-[60vh] flex flex-col justify-center items-center ring-1 ring-slate-700">
              {isLoading && <Loader />}
              {error && !(isLoading || isContinuing) && (
                <div className="text-center text-red-400">
                  <h3 className="text-xl font-semibold mb-2">An Error Occurred</h3>
                  <p>{error}</p>
                </div>
              )}
              {!isLoading && !error && story && (
                <StoryDisplay 
                  story={story}
                  onContinue={handleContinueStory}
                  isContinuing={isContinuing}
                />
              )}
              {!isLoading && !error && !story && (
                 <div className="text-center text-slate-400">
                    <h2 className="text-2xl font-bold text-slate-200 mb-2">Welcome to StoryCrafter AI</h2>
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
