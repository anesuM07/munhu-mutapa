import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Mic, Image as ImageIcon, Sparkles, BookOpen, 
  ChevronRight, GraduationCap, X, Send, 
  PlayCircle, RefreshCcw, Loader2, Globe, FileText, Newspaper, 
  MessageSquare, ExternalLink, Clock, Brain,
  Moon, Sun, Languages, Baby, ClipboardList, Trash2, Pin,
  Volume2, StopCircle, Rocket, Zap, Heart, Coffee, Star, 
  FlaskConical, Trophy, Flame, History, Lightbulb, Info, Maximize2,
  MicOff, Command
} from 'lucide-react';
import { LearningModule, TabType, Language, SessionNote, UserMood, Badge } from './types';
import { queryEduQuest, getQuerySuggestions, generateTTS, getMetaphor, getConceptBreakdown } from './services/geminiService';
import { fetchPexelsImages } from './services/imageService';
import ConceptMap from './components/ConceptMap';
import QuizComponent from './components/QuizComponent';

const App: React.FC = () => {
  // --- States ---
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LearningModule | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // --- Feature States ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChallengeMode, setIsChallengeMode] = useState(false);
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [isTimeTravelMode, setIsTimeTravelMode] = useState(false);
  const [isEli5, setIsEli5] = useState(false);
  const [mood, setMood] = useState<UserMood>('Curious');
  const [language, setLanguage] = useState<Language>('English');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [extraMetaphor, setExtraMetaphor] = useState<string | null>(null);
  const [generatingMetaphor, setGeneratingMetaphor] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);

  // --- Breakdown Feature States ---
  const [activeBreakdown, setActiveBreakdown] = useState<{
    term: string;
    explanation: string;
    imageUrl: string | null;
  } | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  // --- Gamification ---
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastSearchTime, setLastSearchTime] = useState<number>(0);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const suggestionTimeoutRef = useRef<number | null>(null);

  // --- Effects ---
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript.toLowerCase();
        handleVoiceCommand(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [results, isReading, isDarkMode, activeTab]);

  const handleVoiceCommand = (cmd: string) => {
    setVoiceFeedback(`Recognized: "${cmd}"`);
    setTimeout(() => setVoiceFeedback(null), 3000);

    // Navigation Commands
    if (cmd.includes('go to summary') || cmd.includes('show summary')) setActiveTab('all');
    else if (cmd.includes('go to universe') || cmd.includes('show universe')) setActiveTab('universe');
    else if (cmd.includes('go to tutor') || cmd.includes('show tutor') || cmd.includes('quiz')) setActiveTab('tutor');
    else if (cmd.includes('go to lab') || cmd.includes('show lab') || cmd.includes('experiment')) setActiveTab('lab');
    else if (cmd.includes('go to images') || cmd.includes('show images')) setActiveTab('images');
    else if (cmd.includes('go to videos') || cmd.includes('show videos')) setActiveTab('videos');
    else if (cmd.includes('go to news') || cmd.includes('show news')) setActiveTab('news');
    
    // Playback Commands
    else if (cmd.includes('read') || cmd.includes('explain aloud')) playAIExplanation();
    else if (cmd.includes('stop') || cmd.includes('shutup') || cmd.includes('quiet')) stopAIExplanation();

    // Mode Commands
    else if (cmd.includes('dark mode')) setIsDarkMode(true);
    else if (cmd.includes('light mode')) setIsDarkMode(false);
    else if (cmd.includes('eli5 on')) setIsEli5(true);
    else if (cmd.includes('eli5 off')) setIsEli5(false);

    // Search Commands
    else if (cmd.startsWith('search for ')) {
      const q = cmd.replace('search for ', '');
      setQuery(q);
      handleSearch(undefined, q);
    } else {
      setQuery(cmd);
      handleSearch(undefined, cmd);
    }
  };

  const handleSearch = async (e?: React.FormEvent, forceQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = forceQuery || query;
    if (!finalQuery.trim() && !selectedImage) return;
    
    setLoading(true);
    setShowSuggestions(false);
    setExtraMetaphor(null);
    setActiveBreakdown(null);
    stopAIExplanation();
    
    const now = Date.now();
    if (now - lastSearchTime < 600000) setStreak(s => s + 1); else setStreak(1);
    setLastSearchTime(now);
    setPoints(p => p + 10);
    
    try {
      const [aiData, pexelsImages] = await Promise.all([
        queryEduQuest(finalQuery || "Analyze", { 
          image: selectedImage || undefined,
          language, mood, isChallengeMode, isStoryMode, isTimeTravelMode, isEli5
        }),
        fetchPexelsImages(finalQuery || "Academic")
      ]);

      setResults({ ...aiData, imageResults: pexelsImages.length > 0 ? pexelsImages : aiData.imageResults });
      setActiveTab('all');
    } catch (error) {
      alert(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleConceptClick = async (term: string, existingDef?: string) => {
    setLoadingBreakdown(true);
    setPoints(p => p + 2);
    try {
      const [explanation, images] = await Promise.all([
        existingDef ? Promise.resolve(existingDef) : getConceptBreakdown(term),
        fetchPexelsImages(term)
      ]);
      setActiveBreakdown({
        term,
        explanation: typeof explanation === 'string' ? explanation : (explanation as any).explanation,
        imageUrl: images.length > 0 ? images[0].url : null
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleMetaphorGeneration = async () => {
    if (!results) return;
    setGeneratingMetaphor(true);
    try {
      const metaphor = await getMetaphor(results.topic, mood);
      setExtraMetaphor(metaphor);
      setPoints(p => p + 5);
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingMetaphor(false);
    }
  };

  const stopAIExplanation = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsReading(false);
  };

  const playAIExplanation = async () => {
    const textToRead = isStoryMode && results?.storyMode ? results.storyMode : results?.summary;
    if (!textToRead) return;
    
    if (isReading) {
      stopAIExplanation();
      return;
    }

    setIsReading(true);
    try {
      const base64 = await generateTTS(textToRead);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      
      const audioBuffer = await (async () => {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const dataInt16 = new Int16Array(bytes.buffer);
        const buf = ctx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buf.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        return buf;
      })();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsReading(false);
      audioSourceRef.current = source;
      source.start();
    } catch { 
      setIsReading(false); 
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Speech recognition error:", e);
      }
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (suggestionTimeoutRef.current) window.clearTimeout(suggestionTimeoutRef.current);
    if (val.length > 2) {
      suggestionTimeoutRef.current = window.setTimeout(async () => {
        const sug = await getQuerySuggestions(val);
        setSuggestions(sug);
        setShowSuggestions(true);
      }, 300);
    } else setShowSuggestions(false);
  };

  const renderTextWithKeyTerms = (text: string) => {
    if (!results?.keyTerms) return text;
    const sortedTerms = [...results.keyTerms].sort((a, b) => b.term.length - a.term.length);
    let parts: (string | React.ReactNode)[] = [text];
    
    sortedTerms.forEach(({ term, definition }) => {
      const nextParts: (string | React.ReactNode)[] = [];
      parts.forEach(part => {
        if (typeof part !== 'string') { nextParts.push(part); return; }
        const segments = part.split(new RegExp(`(${term})`, 'gi'));
        segments.forEach((seg, i) => {
          if (seg.toLowerCase() === term.toLowerCase()) {
            nextParts.push(
              <button 
                key={`${term}-${i}-${Math.random()}`} 
                onClick={() => handleConceptClick(seg, definition)}
                className="group relative inline-block text-left align-baseline focus:outline-none"
              >
                <span className="border-b-2 border-indigo-400 dark:border-indigo-600 font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer px-0.5 rounded-sm">
                  {seg}
                </span>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40 text-xs text-slate-600 dark:text-slate-300 pointer-events-none">
                  <span className="block font-black text-indigo-600 mb-1 uppercase text-[8px] flex items-center gap-1">
                     <Zap size={8} /> Click for Breakdown
                  </span>
                  {definition.length > 60 ? definition.substring(0, 57) + '...' : definition}
                </span>
              </button>
            );
          } else if (seg) nextParts.push(seg);
        });
      });
      parts = nextParts;
    });
    return parts;
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] dark:bg-slate-950 flex flex-col font-['Inter'] transition-colors duration-500 overflow-x-hidden">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 sticky top-0 z-[60] shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-16 lg:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 lg:gap-8 overflow-hidden">
            <div onClick={() => { setResults(null); setQuery(''); stopAIExplanation(); }} className="flex items-center gap-2 cursor-pointer shrink-0">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><GraduationCap size={20} /></div>
              <span className="text-lg lg:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 whitespace-nowrap">Munhu Mutapa</span>
            </div>
            {results && (
              <form onSubmit={handleSearch} className="hidden lg:flex flex-1 min-w-[200px] max-w-sm relative">
                <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 w-full">
                  <Search className="text-slate-300 mr-2" size={16} />
                  <input type="text" value={query} onChange={(e) => handleQueryChange(e.target.value)} placeholder="Synthesis..." className="bg-transparent outline-none text-xs w-full font-bold text-slate-700 dark:text-slate-200" />
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center gap-1.5 lg:gap-3">
            <button 
              onClick={toggleListening} 
              className={`p-2 rounded-xl transition-all relative ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-600'}`}
              title="Voice Commands"
            >
              <Mic size={20} />
              {isListening && <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping"></span>}
            </button>
            <button onClick={() => setIsEli5(!isEli5)} className={`p-2 rounded-xl transition-all ${isEli5 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`} title="ELI5 Mode"><Baby size={20} /></button>
            <button onClick={() => setIsTimeTravelMode(!isTimeTravelMode)} className={`p-2 rounded-xl transition-all ${isTimeTravelMode ? 'bg-fuchsia-100 text-fuchsia-700 ring-2 ring-fuchsia-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`} title="Time Travel"><History size={20} /></button>
            <button onClick={() => setIsChallengeMode(!isChallengeMode)} className={`p-2 rounded-xl transition-all ${isChallengeMode ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`} title="Challenge Mode"><Trophy size={20} /></button>
            <button onClick={() => setIsStoryMode(!isStoryMode)} className={`p-2 rounded-xl transition-all ${isStoryMode ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`} title="Story Mode"><BookOpen size={20} /></button>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block"></div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400">{isDarkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
          </div>
        </div>

        {results && (
          <div className="max-w-[1440px] mx-auto px-4 lg:px-6 flex gap-6 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800">
            {[
              { id: 'all', label: 'Summary', icon: Globe },
              { id: 'universe', label: 'Universe', icon: Rocket },
              { id: 'tutor', label: 'Tutor', icon: Brain },
              { id: 'lab', label: 'Lab', icon: FlaskConical, hide: !results.experiment },
              { id: 'images', label: 'Images', icon: ImageIcon },
              { id: 'videos', label: 'Videos', icon: PlayCircle },
              { id: 'news', label: 'News', icon: Newspaper },
            ].map(tab => !tab.hide && (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} className={`flex items-center gap-2 py-4 border-b-2 font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {voiceFeedback && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 font-bold text-sm">
          <Command size={18} /> {voiceFeedback}
        </div>
      )}

      <main className={`flex-1 overflow-auto no-scrollbar ${results ? 'p-4 lg:p-12' : 'flex items-center justify-center p-6'}`}>
        {!results ? (
          <div className="max-w-4xl w-full text-center py-10">
            <h1 className="text-6xl lg:text-9xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-none">
              Munhu <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600">Mutapa</span>
            </h1>
            <p className="text-base lg:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-2xl mx-auto font-medium">
              Lightning-fast synthesis with Wikipedia authority. Explore the galaxy of knowledge.
            </p>
            <form onSubmit={handleSearch} className="mb-14 relative max-w-3xl mx-auto group px-4">
              <div className="relative flex flex-col lg:flex-row lg:items-center bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-4 lg:px-10 lg:py-7 shadow-2xl focus-within:border-indigo-500 transition-all">
                <div className="flex items-center flex-1 mb-4 lg:mb-0">
                  <Search className="text-slate-300 mr-4 shrink-0" size={28} />
                  <input 
                    type="text" 
                    value={query} 
                    onChange={(e) => handleQueryChange(e.target.value)} 
                    placeholder="Knowledge mission..." 
                    className="bg-transparent outline-none text-2xl lg:text-4xl w-full text-slate-800 dark:text-white placeholder-slate-200 font-black tracking-tighter" 
                    autoFocus 
                  />
                </div>
                <div className="flex items-center gap-4 lg:ml-8 lg:pl-8 lg:border-l-2 lg:border-slate-50 dark:lg:border-slate-800">
                  <div className="flex gap-2">
                    <button type="button" onClick={toggleListening} className={`p-3 transition-colors ${isListening ? 'text-rose-500 animate-pulse' : 'text-slate-300 hover:text-rose-500'}`}><Mic size={28} /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-300 hover:text-indigo-500 transition-colors"><ImageIcon size={28} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setSelectedImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                  <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white px-10 py-4 lg:py-5 rounded-2xl font-black transition-all">GO</button>
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-4 mx-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-3xl z-[100] py-4 text-left">
                    {suggestions.map((s, idx) => (
                      <button key={idx} onClick={() => { setQuery(s); handleSearch(undefined, s); }} className="w-full px-10 py-4 text-lg font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-4 transition-colors">
                        <Star size={16} className="text-indigo-400" /> {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="max-w-[1440px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500">
            {activeTab === 'all' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    <div className="shrink-0 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center gap-2 shadow-sm">
                      <Flame className="text-orange-500" size={16} />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{streak} Streak</span>
                    </div>
                    <div className="shrink-0 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center gap-2 shadow-sm">
                      <Trophy className="text-amber-500" size={16} />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">{points} Score</span>
                    </div>
                    <div className="shrink-0 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl flex items-center gap-2 border border-indigo-100 dark:border-indigo-900">
                      <Zap className="text-indigo-500" size={16} />
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Fast Search</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-xl shadow-indigo-100/20 dark:shadow-none relative">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Navigator Synthesis • {mood}
                        </span>
                        <h2 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white leading-tight">{results.topic}</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={playAIExplanation} className={`p-3 rounded-full transition-all ${isReading ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-indigo-600 hover:text-white'}`}>
                          {isReading ? <StopCircle size={24} /> : <Volume2 size={24} />}
                        </button>
                      </div>
                    </div>

                    {results.analogy && (
                      <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 rounded-r-3xl">
                        <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest mb-2 flex items-center gap-2"><Zap size={14} /> Analogy</p>
                        <p className="text-lg text-slate-700 dark:text-amber-100/80 italic font-medium leading-relaxed">"{results.analogy}"</p>
                      </div>
                    )}

                    <div className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-10">
                      {isStoryMode && results.storyMode ? (
                        <div className="italic text-indigo-900 dark:text-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900">
                          {renderTextWithKeyTerms(results.storyMode)}
                        </div>
                      ) : (
                        renderTextWithKeyTerms(results.summary)
                      )}
                    </div>

                    {extraMetaphor && (
                      <div className="mb-10 animate-in zoom-in-95 duration-500">
                        <div className="relative p-8 bg-indigo-600 text-white rounded-[2rem] shadow-2xl overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                              <Lightbulb size={120} />
                           </div>
                           <div className="relative z-10">
                              <h4 className="font-black uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                                 <Sparkles size={14} /> Metaphor Machine Output
                              </h4>
                              <p className="text-2xl lg:text-3xl font-black leading-tight tracking-tight italic">
                                 "{extraMetaphor}"
                              </p>
                              <div className="mt-6 flex items-center gap-3">
                                 <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Star size={20} /></div>
                                 <span className="text-xs font-bold text-white/80">Newly generated creative spark</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-4">
                      {results.experiment && <button onClick={() => setActiveTab('lab')} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg flex items-center justify-center gap-2"><FlaskConical size={20} /> Lab Simulator</button>}
                      <button onClick={() => setActiveTab('tutor')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-700 flex items-center justify-center gap-2"><Brain size={20} /> AI Tutor</button>
                      <button 
                        onClick={handleMetaphorGeneration} 
                        disabled={generatingMetaphor}
                        className="px-8 py-4 bg-fuchsia-600 text-white rounded-2xl text-sm font-black hover:bg-fuchsia-700 disabled:bg-fuchsia-300 transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {generatingMetaphor ? <Loader2 size={20} className="animate-spin" /> : <Lightbulb size={20} />}
                        Metaphor Machine
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white px-2 flex items-center gap-2 uppercase tracking-widest"><Globe size={20} className="text-indigo-600" /> Wikipedia & WikiHow Fusion</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {results.webResults.map((res, i) => (
                        <a key={i} href={res.url} target="_blank" className="group block bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all">
                          <div className="flex items-center gap-2 mb-2">
                            {res.url.includes('wikipedia.org') && <div className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-black text-[10px]">WIKI</div>}
                            {res.url.includes('wikihow.com') && <div className="px-2 py-0.5 bg-green-100 rounded text-green-600 font-black text-[10px]">HOW-TO</div>}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{res.url}</p>
                          </div>
                          <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mb-2">{res.title}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{res.snippet}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  <div className="h-[400px]">
                    <ConceptMap nodes={results.nodes} links={results.links} onNodeClick={(n) => { setQuery(n.name); handleSearch(undefined, n.name); }} />
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-widest"><Brain size={18} className="text-indigo-600" /> Core Terms</h4>
                    <div className="space-y-4">
                      {results.keyTerms.map((kt, i) => (
                        <div key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <button 
                            onClick={() => handleConceptClick(kt.term, kt.definition)}
                            className="block w-full text-left focus:outline-none group"
                          >
                            <span className="block font-black text-indigo-600 dark:text-indigo-400 text-[10px] mb-2 uppercase group-hover:underline">{kt.term}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">{kt.definition}</p>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'tutor' && results.quiz && <QuizComponent questions={results.quiz} onComplete={(s) => { alert(`Quiz complete! Score: ${s}/${results.quiz.length}`); setPoints(p => p + s * 10); }} />}
            {activeTab === 'universe' && (
              <div className="h-[700px] w-full bg-slate-900 rounded-[3rem] overflow-hidden">
                <ConceptMap nodes={results.nodes} links={results.links} isUniverseTab onNodeClick={(n) => { setQuery(n.name); handleSearch(undefined, n.name); }} />
              </div>
            )}
            {activeTab === 'images' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {results.imageResults.map((img, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg group cursor-pointer" onClick={() => handleConceptClick(img.title)}>
                    <div className="aspect-square relative overflow-hidden">
                      <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{img.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {activeBreakdown && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setActiveBreakdown(null)}>
           <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 dark:border-slate-800 relative group animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <button onClick={() => setActiveBreakdown(null)} className="absolute top-6 right-6 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all">
                 <X size={20} />
              </button>
              
              {activeBreakdown.imageUrl && (
                <div className="w-full aspect-video relative">
                   <img src={activeBreakdown.imageUrl} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent" />
                   <div className="absolute bottom-6 left-8">
                      <h3 className="text-3xl lg:text-4xl font-black text-white tracking-tighter uppercase">{activeBreakdown.term}</h3>
                      <div className="flex gap-2 mt-2">
                         <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] text-white font-black tracking-widest uppercase">Concept Visual</span>
                      </div>
                   </div>
                </div>
              )}
              
              <div className="p-8 lg:p-10">
                 {!activeBreakdown.imageUrl && <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">{activeBreakdown.term}</h3>}
                 <div className="flex items-start gap-4 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shrink-0"><Info size={20} /></div>
                    <p className="text-lg font-medium text-indigo-900 dark:text-indigo-200 leading-relaxed">
                       {activeBreakdown.explanation}
                    </p>
                 </div>
                 <div className="mt-8 flex justify-between items-center">
                    <button 
                      onClick={() => {
                        setQuery(activeBreakdown.term);
                        handleSearch(undefined, activeBreakdown.term);
                        setActiveBreakdown(null);
                      }}
                      className="px-6 py-3 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
                    >
                       <Maximize2 size={16} /> Explore Deeply
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {loadingBreakdown && (
        <div className="fixed bottom-10 right-10 z-[110] bg-white dark:bg-slate-800 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300">
           <Loader2 className="animate-spin text-indigo-600" size={24} />
           <span className="font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300">Synthesizing Card...</span>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[200] bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative w-32 h-32 mb-10">
            <div className="absolute inset-0 border-[12px] border-slate-100 dark:border-slate-900 rounded-full"></div>
            <div className="absolute inset-0 border-[12px] border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-indigo-600"><GraduationCap size={48} /></div>
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 text-center">Fusing Knowledge...</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-center max-w-sm">Munhu Mutapa is navigating the academic universe at light speed.</p>
        </div>
      )}

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 py-16 text-center px-4">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 font-black tracking-widest uppercase">
          &copy; 2024 MUNHU MUTAPA &bull; CREATED BY MOREPEACE MANYORA
        </p>
      </footer>
    </div>
  );
};

export default App;