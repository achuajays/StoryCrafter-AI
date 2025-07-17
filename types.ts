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
}

export interface StoryOutput {
  title: string;
  dedication: string;
  characters: string;
  chapterOutline: string[];
  chapters: Chapter[];
}