import React, { useState, useRef, useEffect } from 'react';

interface TaskQuickAddProps {
  onAdd: (title: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

export const TaskQuickAdd: React.FC<TaskQuickAddProps> = ({
  onAdd,
  placeholder = 'Adicionar nova tarefa...',
  disabled = false,
}) => {
  const [value, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    const trimmedValue = value.trim();
    
    if (!trimmedValue || isLoading || disabled) {
      return;
    }

    setIsLoading(true);
    try {
      await onAdd(trimmedValue);
      setValue('');
    } catch (error) {
      console.error('Erro ao adicionar task:', error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setValue('');
      inputRef.current?.blur();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className={`
        flex items-center gap-3 bg-white rounded-2xl border-2 px-4 py-3 transition-all
        ${isFocused ? 'border-indigo-400 shadow-lg shadow-indigo-100' : 'border-slate-100 hover:border-slate-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        {/* Ícone de adicionar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0
          ${isFocused || value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}
        `}>
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 font-medium"
          autoComplete="off"
        />

        {/* Botão de enviar (visível quando tem texto) */}
        {value.trim() && (
          <button
            type="submit"
            disabled={isLoading || disabled}
            className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <span>Adicionar</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-indigo-500 px-1.5 py-0.5 rounded font-normal">
              Enter
            </kbd>
          </button>
        )}
      </div>

      {/* Dica de atalho */}
      {isFocused && !value && (
        <p className="absolute -bottom-6 left-4 text-xs text-slate-400">
          Pressione <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Enter</kbd> para adicionar
        </p>
      )}
    </form>
  );
};

export default TaskQuickAdd;
