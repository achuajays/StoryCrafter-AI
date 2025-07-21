
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { StoryPrompt, StoryOutput, Chapter, AnalysisReport } from '../types';

interface GeminiRequestParams {
    contents: string;
    config?: {
        responseMimeType?: string;
        responseSchema?: any;
    };
}

const callGeminiApi = async (params: GeminiRequestParams): Promise<any> => {
    const functionName = 'gemini';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed with status ' + response.status }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (params.config?.responseMimeType === 'application/json') {
            try {
                // The AI's JSON output can be stringified in the 'text' property or be the data itself
                if (typeof data.text === 'string') {
                    return JSON.parse(data.text);
                }
                return data; // Assume the function returned the JSON object directly
            } catch (e) {
                console.error("Failed to parse JSON response:", data, e);
                throw new Error("The AI returned an invalid format. Please try again.");
            }
        }
        
        if (typeof data.text !== 'string') {
             throw new Error("The AI returned an unexpected format. Expected text.");
        }
        
        return data.text; // Return plain text if not expecting JSON
    } catch (error: any) {
        console.error('Error calling Supabase function:', error);
        throw new Error(error.message || 'An unknown error occurred.');
    }
};


// --- Prompt-building logic ---

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

// --- Exported functions now use the secure API caller ---

export const generateInitialStory = async (promptData: StoryPrompt): Promise<string> => {
  const fullPrompt = buildInitialPrompt(promptData);
  return callGeminiApi({ contents: fullPrompt });
};

export const generateNextChapter = async (
  originalPrompt: StoryPrompt,
  storySoFar: Omit<StoryOutput, 'prompt'>,
  nextChapterTitle: string
): Promise<string> => {
    const fullPrompt = buildContinuationPrompt(originalPrompt, storySoFar, nextChapterTitle);
    return callGeminiApi({ contents: fullPrompt });
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
    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: 'OBJECT',
            properties: {
                title: { type: 'STRING', description: 'The translated chapter title.' },
                content: { type: 'STRING', description: 'The full translated content of the chapter.' },
            },
            required: ['title', 'content'],
        },
    };
    return callGeminiApi({ contents: prompt, config });
};

export const generatePlotTwists = async (story: StoryOutput): Promise<string[]> => {
    const storySummary = story.chapters.map((c, i) => `Chapter ${i + 1}: ${c.title}`).join('\n');
    const prompt = `You are a creative writing assistant. Based on the story titled "${story.title}" and the following chapter summaries, generate 3-4 surprising and compelling plot twists.
The twists should be distinct from one another.

**Story Summary:**
${storySummary}

**Last Chapter Content:**
${story.chapters[story.chapters.length - 1].content}

**Task:**
Return a JSON object containing a single key "twists" which is an array of strings.
Example: { "twists": ["The friendly sidekick was the villain all along.", "The entire world is a simulation and the character is becoming self-aware."] }
`;
    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: 'OBJECT',
            properties: {
                twists: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['twists']
        }
    };
    const result = await callGeminiApi({ contents: prompt, config });
    if (!result.twists || !Array.isArray(result.twists)) {
        throw new Error("Invalid format for plot twists received from AI.");
    }
    return result.twists;
};

export const generateAlternativeChapter = async (prompt: StoryPrompt, story: StoryOutput, chapterIndex: number): Promise<string> => {
    const chapterToRewrite = story.chapters[chapterIndex];
    const storyContext = story.chapters.slice(0, chapterIndex).map(c => c.content).join('\n\n---\n\n');
    const fullPrompt = `You are a creative writing assistant. Your task is to rewrite a chapter of a story with a significant change or from a different perspective.
**Original Story Idea:**
- Genre: ${prompt.genre}
- Tone: ${prompt.tone}
- Main Character: ${prompt.character}
**Story So Far (context):**
${storyContext}
**Original Chapter Content (Chapter ${chapterIndex + 1}: ${chapterToRewrite.title}):**
---
${chapterToRewrite.content}
---
**Your Task:**
Rewrite this chapter. Introduce a different key decision, a new character's perspective, or an unexpected event that alters the course of this chapter. The new version should still logically follow the story context provided, but take this specific chapter in a new direction. Do not change the chapter title.
**Output Structure:**
Just output the raw text of the rewritten chapter. Do not add any titles, delimiters, or extra text.
`;
    return callGeminiApi({ contents: fullPrompt });
};

export const analyzeStory = async (story: StoryOutput): Promise<AnalysisReport> => {
    const fullStoryText = story.chapters.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n');
    const prompt = `You are an expert writing critic. Analyze the following story draft.
**Story Title:** ${story.title}
**Full Text:**
---
${fullStoryText}
---
**Your Task:**
Provide a critical analysis of the story. Focus on three key areas:
1.  **Pacing:** Is the story well-paced? Does it drag in places or rush through important moments?
2.  **Tone:** Is the tone consistent with the stated genre and consistent throughout the story?
3.  **Suggestions:** Provide 2-3 actionable suggestions for how the author could improve the draft.
**Output Structure:**
Return a JSON object with the keys "pacing", "tone", and "suggestions".`;

    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: 'OBJECT',
            properties: {
                pacing: { type: 'STRING', description: "Analysis of the story's pacing." },
                tone: { type: 'STRING', description: "Analysis of the story's tone." },
                suggestions: { type: 'STRING', description: "Actionable suggestions for improvement." }
            },
            required: ['pacing', 'tone', 'suggestions']
        }
    };
    return await callGeminiApi({ contents: prompt, config });
};
