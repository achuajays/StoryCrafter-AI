import { createClient } from '@supabase/supabase-js';
import { StoryPrompt, StoryOutput } from '../types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const buildInitialPrompt = (prompt: StoryPrompt): string => {
  const chapterGenerationInstruction = prompt.isEpic
    ? "Generate a detailed chapter outline with 5-7 chapters. Then, write the full text for the first TWO chapters. Each chapter must be at least 400 words."
    : "Generate a chapter outline with 3-5 chapters. Then, write the full text for the first chapter. The chapter must be at least 300 words.";

  return `
You are StoryCrafter AI, an expert storyteller and book author AI. Your task is to co-create a short story draft based on the user's creative inputs.

**User Inputs:**
- Genre: ${prompt.genre}
- Tone: ${prompt.tone}
- Main Character: ${prompt.character}
- Setting: ${prompt.setting}
- Theme: ${prompt.theme}

**Your Task:**
Generate a complete story draft based on these inputs.
${chapterGenerationInstruction}

**Output Structure:**
The output must be structured precisely as follows, using the exact delimiters. Do not add any extra text or explanations outside of this structure.

[TITLE]
A creative and fitting title for the story.

[DEDICATION]
A short, evocative dedication or opening quote for the book.

[CHARACTERS]
A brief description of the main character and one or two key supporting characters.

[CHAPTER_OUTLINE]
A numbered list of chapter titles that outline the plot progression.
Example:
1. A Storm on the Horizon
2. The Secret in the Walls
3. The Final Confrontation

[CHAPTER_1: Title of the first chapter]
The full text of the first chapter.

[CHAPTER_2: Title of the second chapter]
(This chapter is only generated if "Epic Story" was selected)
The full text of the second chapter.
`;
};

const buildContinuationPrompt = (
  originalPrompt: StoryPrompt,
  storySoFar: Omit<StoryOutput, 'prompt'>,
  nextChapterTitle: string
): string => {
  const previousChapters = storySoFar.chapters.map(
    (ch, i) => `**Chapter ${i + 1}: ${ch.title}**\n\n${ch.content}`
  ).join('\n\n---\n\n');

  return `
You are StoryCrafter AI, an expert storyteller continuing a story you started.

**Original Story Idea:**
- Genre: ${originalPrompt.genre}
- Tone: ${originalPrompt.tone}
- Main Character: ${originalPrompt.character}
- Setting: ${originalPrompt.setting}
- Theme: ${originalPrompt.theme}
- Story Title: ${storySoFar.title}
- Characters: ${storySoFar.characters}
- Full Chapter Outline: \n${storySoFar.chapterOutline.map((t, i) => `${i + 1}. ${t}`).join('\n')}

**Story So Far (Previous Chapters):**
${previousChapters}

**Your Task:**
Write the next chapter in the story. It must be titled "${nextChapterTitle}".
The chapter should be at least 400 words long, continue the plot smoothly, and maintain the established tone and character voices.

**Output Structure:**
Just output the raw text of the chapter. Do not add any titles, delimiters, or extra text. Just the chapter content.
`;
};

const invokeGeminiFunction = async (prompt: string): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('gemini', {
        body: { contents: prompt },
    });

    if (error) {
        console.error('Error invoking Supabase function:', error);
        throw new Error(`The AI service failed: ${error.message}`);
    }

    if (!data || !data.text) {
        console.error('Invalid response from Supabase function:', data);
        throw new Error('The AI returned an empty or invalid response.');
    }

    return data.text;
}

export const generateInitialStory = async (promptData: StoryPrompt): Promise<string> => {
  const fullPrompt = buildInitialPrompt(promptData);
  return invokeGeminiFunction(fullPrompt);
};

export const generateNextChapter = async (
  originalPrompt: StoryPrompt,
  storySoFar: Omit<StoryOutput, 'prompt'>,
  nextChapterTitle: string
): Promise<string> => {
    const fullPrompt = buildContinuationPrompt(originalPrompt, storySoFar, nextChapterTitle);
    return invokeGeminiFunction(fullPrompt);
};