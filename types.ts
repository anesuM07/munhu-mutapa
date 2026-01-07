
export interface ConceptNode {
  id: string;
  name: string;
  category: 'core' | 'related' | 'prerequisite';
}

export interface ConceptLink {
  source: string;
  target: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Challenge {
  scenario: string;
  task: string;
  hints: string[];
}

export interface Experiment {
  title: string;
  setup: string;
  steps: string[];
  expectedObservation: string;
  interactiveElement?: string;
}

export interface WebResult {
  title: string;
  snippet: string;
  url: string;
}

export interface ImageResult {
  title: string;
  url: string;
  source: string;
}

export interface VideoResult {
  title: string;
  thumbnail: string;
  url: string;
  duration: string;
  summary: string;
}

export interface NewsResult {
  title: string;
  date: string;
  snippet: string;
  url: string;
}

export interface PDFResult {
  title: string;
  summary: string;
  url: string;
}

export interface LearningModule {
  topic: string;
  summary: string;
  storyMode?: string;
  analogy?: string;
  experiment?: Experiment;
  webResults: WebResult[];
  imageResults: ImageResult[];
  videoResults: VideoResult[];
  newsResults: NewsResult[];
  pdfResults: PDFResult[];
  nodes: ConceptNode[];
  links: ConceptLink[];
  quiz: QuizQuestion[];
  challenge?: Challenge;
  nextTopics: string[];
  keyTerms: { term: string; definition: string }[];
  timeTravelContext?: string; // Used when Time Travel Mode is active
}

export interface SessionNote {
  id: string;
  title: string;
  content: string;
  type: 'summary' | 'result' | 'quiz';
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export type InputMode = 'text' | 'image' | 'voice';
export type TabType = 'all' | 'images' | 'videos' | 'news' | 'pdfs' | 'tutor' | 'universe' | 'lab';
export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Chinese' | 'Japanese';
export type UserMood = 'Curious' | 'Tired' | 'Motivated' | 'Creative';
