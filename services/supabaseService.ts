
import { GoogleGenAI, Type } from '@google/genai';
import { StoryPrompt, StoryOutput, Chapter } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text;
        if (!text) {
             throw new Error('The AI returned an empty or invalid response.');
        }

        return text;
    } catch (error) {
        console.error('Error invoking Gemini API:', error);
        if (error instanceof Error) {
            throw new Error(`The AI service failed: ${error.message}`);
        }
        throw new Error('An unknown AI service error occurred.');
    }
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

export const translateChapter = async (
    chapter: Chapter,
    targetLanguageName: string
): Promise<{ title: string; content: string }> => {
    const prompt = `You are an expert translator. Your task is to translate the provided chapter of a book into ${targetLanguageName}.
Translate both the chapter title and the chapter content.
Ensure the translation is natural, maintains the original tone, and is grammatically correct.
Do not add any commentary or extra text. Only provide the JSON output.

Chapter Title to translate: "${chapter.title}"

Chapter Content to translate:
---
${chapter.content}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: 'The translated chapter title.',
                        },
                        content: {
                            type: Type.STRING,
                            description: 'The full translated content of the chapter.',
                        },
                    },
                    required: ['title', 'content'],
                },
            },
        });

        const translatedText = response.text.trim();
        if (!translatedText) {
            throw new Error('The AI returned an empty translation.');
        }
        return JSON.parse(translatedText);

    } catch (error) {
        console.error(`Error translating chapter to ${targetLanguageName}:`, error);
        if (error instanceof Error) {
            throw new Error(`The AI translation service failed: ${error.message}`);
        }
        throw new Error('An unknown AI translation service error occurred.');
    }
};