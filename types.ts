
export interface StoryPrompt {
  genre: string;
  tone: string;
  character: string;
  setting: string;
  theme: string;
  isEpic: boolean;
}

export interface Chapter {
    title: string;
    content: string;
    translatedTitle?: string | null;
    translatedContent?: string | null;
    translatedLanguage?: string | null;
}

export interface StoryOutput {
  title: string;
  dedication: string;
  characters: string;
  chapterOutline: string[];
  chapters: Chapter[];
}

export interface StoryArtwork {
  cover: string | null;
  chapterIllustrations: (string | null)[];
}

export interface PromptTemplate {
  name: string;
  prompt: StoryPrompt;
}
