import React, { useState, useRef, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder = 'Selecione uma data',
  min,
  max,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincronizar mês inicial com valor atual
  useEffect(() => {
    if (value) {
      setCurrentMonth(parseISO(value));
    }
  }, []); // Apenas na montagem ou quando abre poderia ser melhor, mas ok

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Gerar dias do calendário
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ptBR });
  const endDate = endOfWeek(monthEnd, { locale: ptBR });
  
  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const formattedDate = value ? format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR }) : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input Display */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full rounded-2xl px-6 py-4 border-none text-sm font-bold shadow-sm cursor-pointer flex items-center justify-between
          transition-all ring-inset
          ${isOpen ? 'ring-2 ring-[#5B5FF5] bg-white' : ''}
          ${disabled 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}
        `}
      >
        <span className={!value ? 'text-slate-400' : 'text-slate-800'}>
          {formattedDate || placeholder}
        </span>
        
        <div className="flex items-center gap-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
          <svg className={`w-5 h-5 ${value ? 'text-[#5B5FF5]' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Dropdown Calendar */}
      {isOpen && !disabled && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-2 p-4 bg-white rounded-3xl shadow-xl border border-slate-100 w-[320px] left-0 md:left-auto md:right-0 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-sm font-black text-slate-800 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase">
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isSelected = value && isSameDay(day, parseISO(value));
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDay = isToday(day);
              const isDisabled = (min && day < parseISO(min)) || (max && day > parseISO(max));

              return (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => !isDisabled && handleDayClick(day, e)}
                  disabled={isDisabled}
                  className={`
                    h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative
                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                    ${isSelected 
                      ? 'bg-[#5B5FF5] text-white shadow-md shadow-indigo-200 scale-105 z-10' 
                      : isDisabled 
                        ? 'opacity-30 cursor-not-allowed' 
                        : 'hover:bg-slate-100'}
                    ${isTodayDay && !isSelected ? 'text-[#5B5FF5] bg-indigo-50' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {isTodayDay && !isSelected && (
                    <span className="absolute bottom-1.5 w-1 h-1 bg-[#5B5FF5] rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 onChange(format(new Date(), 'yyyy-MM-dd'));
                 setIsOpen(false);
               }}
               className="text-xs font-bold text-[#5B5FF5] hover:underline"
             >
               Hoje
             </button>
             <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 setIsOpen(false);
               }}
               className="text-xs font-bold text-slate-400 hover:text-slate-600"
             >
               Fechar
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
