import React, { useRef } from 'react';
import { GGVInteligenciaBrand } from '../ui/BrandLogos';
import { CheckCircleIcon } from '../ui/icons';
import { diagnosticQuestions, type DiagnosticQuestion, type QuestionOption } from '../../data/diagnosticoQuestions.ts';
import { Answers } from '../../types';

const MAX_SCORE_PER_QUESTION = 10;
const MAX_SCORE = diagnosticQuestions.length * MAX_SCORE_PER_QUESTION;

interface QuestionnaireViewProps {
    answers: Answers;
    totalScore: number;
    onSelectAnswer: (questionId: number, score: number) => void;
    onSubmit: () => void;
    error: string | null;
}

export const QuestionnaireView: React.FC<QuestionnaireViewProps> = ({ answers, totalScore, onSelectAnswer, onSubmit, error }) => {
    const allAnswered = Object.keys(answers).length === diagnosticQuestions.length;
    const progressPercentage = (Object.keys(answers).length / diagnosticQuestions.length) * 100;
    const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleAnswerAndScroll = (questionId: number, score: number) => {
        onSelectAnswer(questionId, score);
    };
    const scrollToNextUnanswered = () => {
        const unansweredQuestions = diagnosticQuestions.filter(q => !(q.id in answers));
        if (unansweredQuestions.length > 0) {
            const nextQuestion = unansweredQuestions[0];
            const questionIndex = diagnosticQuestions.findIndex(q => q.id === nextQuestion.id);
            questionRefs.current[questionIndex]?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50" style={{ scrollMarginTop: '100px' }}>
                <div className="text-center mb-4">
                    <GGVInteligenciaBrand className="w-48 mx-auto mb-4" />
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Diagnóstico Comercial</h1>
                    <p className="text-slate-500 mt-2">Responda em qualquer ordem - sem pressa! 🎯</p>
                </div>
                <div className="px-1 py-4">
                    <div className="flex justify-between items-center mb-2 text-sm font-semibold">
                        <span className="text-slate-600">✅ {Object.keys(answers).length} de {diagnosticQuestions.length} respondidas</span>
                        <div className="flex items-center gap-2">
                            <span className="text-blue-800">Pontuação: {totalScore}/{MAX_SCORE}</span>
                            {!allAnswered && (
                                <button
                                    onClick={scrollToNextUnanswered}
                                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full transition-colors text-xs font-medium"
                                >
                                    📍 Próxima
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-blue-800 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
                    <p>{error}</p>
                </div>
            )}

            <div className="space-y-5">
                {diagnosticQuestions.map((q, index) => {
                    const isAnswered = q.id in answers;
                    return (
                        <div 
                            ref={el => { if (el) questionRefs.current[index] = el; }} 
                            key={q.id} 
                            style={{ scrollMarginTop: '120px' }}
                            className={`transition-all duration-300 ${!isAnswered ? 'ring-2 ring-blue-200 ring-opacity-50' : ''}`}
                        >
                            <QuestionCard
                                question={q}
                                questionNumber={index + 1}
                                selectedScore={answers[q.id] as number}
                                onSelectAnswer={(score) => handleAnswerAndScroll(q.id, score)}
                                isAnswered={isAnswered}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-center pt-4">
                <button
                    onClick={onSubmit}
                    disabled={!allAnswered}
                    className="w-full max-w-md bg-blue-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    Finalizar Diagnóstico
                </button>
            </div>
        </div>
    );
};

const QuestionCard: React.FC<{
    question: DiagnosticQuestion;
    questionNumber: number;
    selectedScore?: number;
    onSelectAnswer: (score: number) => void;
    isAnswered?: boolean;
}> = ({ question, questionNumber, selectedScore, onSelectAnswer, isAnswered = false }) => {

    const highlightText = (text: string, highlight: string) => {
        if (!highlight) return text;
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <strong key={i} className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded-md">{part}</strong>
                    ) : (
                        part
                    )
                )}
            </>
        );
    };

    return (
        <div className={`bg-white p-6 rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl ${
            isAnswered 
                ? 'border-green-200 bg-green-50/30' 
                : 'border-slate-200/80 border-l-4 border-l-blue-400'
        }`}>
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-start gap-3">
                <span className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center font-bold text-sm mt-0.5 ${
                    isAnswered 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-900 text-white'
                }`}>
                    {isAnswered ? '✓' : questionNumber}
                </span>
                <span>{highlightText(question.text, question.highlight)}</span>
            </h3>
            <div className="space-y-3">
                {question.options.map(option => (
                    <OptionButton
                        key={option.score}
                        option={option}
                        isSelected={selectedScore === option.score}
                        onClick={() => onSelectAnswer(option.score)}
                    />
                ))}
            </div>
        </div>
    );
};

const OptionButton: React.FC<{
    option: QuestionOption;
    isSelected: boolean;
    onClick: () => void;
}> = ({ option, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${isSelected
                ? 'bg-blue-900 text-white border-blue-900 shadow-md scale-101'
                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-800 hover:bg-blue-50'
            }`}
    >
        <div className="flex justify-between items-center">
            <span className="font-bold">{option.text}</span>
            {isSelected && <CheckCircleIcon className="w-6 h-6 text-white" />}
        </div>
        <p className={`text-sm mt-1 ${isSelected ? 'text-blue-200' : 'text-slate-500'}`}>{option.description}</p>
    </button>
);
