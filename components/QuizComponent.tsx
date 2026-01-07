
import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizComponentProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

const QuizComponent: React.FC<QuizComponentProps> = ({ questions, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleAnswer = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
    setShowExplanation(true);
    if (index === questions[currentStep].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      onComplete(score);
    }
  };

  const question = questions[currentStep];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-100 max-w-2xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
          QUESTION {currentStep + 1} OF {questions.length}
        </span>
        <span className="text-sm font-medium text-slate-400">Score: {score}</span>
      </div>
      
      <h3 className="text-xl font-bold text-slate-800 mb-6">{question.question}</h3>
      
      <div className="space-y-3 mb-6">
        {question.options.map((option, idx) => (
          <button
            key={idx}
            disabled={showExplanation}
            onClick={() => handleAnswer(idx)}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
              showExplanation
                ? idx === question.correctAnswer
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                  : idx === selectedOption
                  ? "border-rose-500 bg-rose-50 text-rose-900"
                  : "border-slate-100 text-slate-400"
                : "border-slate-100 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-sm font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              {option}
            </div>
          </button>
        ))}
      </div>

      {showExplanation && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className={`p-4 rounded-xl mb-6 ${
            selectedOption === question.correctAnswer ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}>
            <p className="text-sm font-semibold mb-1">
              {selectedOption === question.correctAnswer ? "Correct!" : "Not quite..."}
            </p>
            <p className="text-sm opacity-90">{question.explanation}</p>
          </div>
          <button
            onClick={nextQuestion}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
          >
            {currentStep === questions.length - 1 ? "Finish Quiz" : "Next Question"}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizComponent;
