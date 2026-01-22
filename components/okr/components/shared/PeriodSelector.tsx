import React, { useState, useEffect } from 'react';

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  onPeriodChange: (startDate: string, endDate: string) => void;
}

interface Quarter {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

const getQuartersForYear = (year: number): Quarter[] => [
  { id: `Q1-${year}`, label: `Q1-${year}`, startDate: `${year}-01-01`, endDate: `${year}-03-31` },
  { id: `Q2-${year}`, label: `Q2-${year}`, startDate: `${year}-04-01`, endDate: `${year}-06-30` },
  { id: `Q3-${year}`, label: `Q3-${year}`, startDate: `${year}-07-01`, endDate: `${year}-09-30` },
  { id: `Q4-${year}`, label: `Q4-${year}`, startDate: `${year}-10-01`, endDate: `${year}-12-31` },
];

const formatDateRange = (start: string, end: string): string => {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  return `${months[startDate.getMonth()]} ${startDate.getDate()} - ${months[endDate.getMonth()]} ${endDate.getDate()}`;
};

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ startDate, endDate, onPeriodChange }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);
  
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Detectar período atual baseado nas datas
  const detectCurrentPeriod = (): { year: number; quarter: string | null } => {
    if (!startDate || !endDate) return { year: currentYear, quarter: null };
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const year = start.getFullYear();
    
    // Verificar se é um ano completo
    if (start.getMonth() === 0 && start.getDate() === 1 && 
        end.getMonth() === 11 && end.getDate() === 31 &&
        start.getFullYear() === end.getFullYear()) {
      return { year, quarter: null };
    }
    
    // Verificar se é um trimestre
    const quarters = getQuartersForYear(year);
    for (const q of quarters) {
      if (startDate === q.startDate && endDate === q.endDate) {
        return { year, quarter: q.id };
      }
    }
    
    return { year, quarter: null };
  };

  const currentPeriod = detectCurrentPeriod();

  useEffect(() => {
    if (currentPeriod.year) {
      setExpandedYear(currentPeriod.year);
    }
  }, []);

  const handleYearSelect = (year: number) => {
    onPeriodChange(`${year}-01-01`, `${year}-12-31`);
    setIsOpen(false);
  };

  const handleQuarterSelect = (quarter: Quarter) => {
    onPeriodChange(quarter.startDate, quarter.endDate);
    setIsOpen(false);
  };

  const toggleYear = (year: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedYear(expandedYear === year ? null : year);
  };

  // Formatar label do período selecionado
  const getSelectedLabel = (): string => {
    if (!startDate || !endDate) return 'Selecione o período';
    
    const { year, quarter } = currentPeriod;
    
    if (quarter) {
      return quarter;
    }
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    // Verificar se é ano completo
    if (start.getMonth() === 0 && start.getDate() === 1 && 
        end.getMonth() === 11 && end.getDate() === 31) {
      return `${start.getFullYear()}`;
    }
    
    return `${formatDateRange(startDate, endDate)} ${start.getFullYear()}`;
  };

  return (
    <div className="relative">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
        Período do Ciclo *
      </label>
      
      {/* Botão de seleção */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 rounded-xl px-4 py-3 border-none text-sm font-semibold text-left flex items-center justify-between hover:bg-slate-100 transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="text-slate-800">{getSelectedLabel()}</span>
        </div>
        <svg 
          className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden max-h-80 overflow-y-auto">
          {years.map(year => {
            const quarters = getQuartersForYear(year);
            const isExpanded = expandedYear === year;
            const isYearSelected = currentPeriod.year === year && !currentPeriod.quarter;
            
            return (
              <div key={year}>
                {/* Linha do Ano */}
                <div 
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                    isYearSelected ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div 
                    className="flex-1 flex items-center gap-3"
                    onClick={() => handleYearSelect(year)}
                  >
                    <span className={`font-bold ${isYearSelected ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {year}
                    </span>
                    <span className="text-xs text-slate-400">
                      Jan 1 - Dez 31
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleYear(year, e)}
                    className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <svg 
                      className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Trimestres */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100">
                    {quarters.map(quarter => {
                      const isQuarterSelected = currentPeriod.quarter === quarter.id;
                      
                      return (
                        <div
                          key={quarter.id}
                          onClick={() => handleQuarterSelect(quarter)}
                          className={`flex items-center justify-between px-4 py-2.5 pl-8 cursor-pointer hover:bg-indigo-50 transition-colors ${
                            isQuarterSelected ? 'bg-indigo-100' : ''
                          }`}
                        >
                          <span className={`font-semibold text-sm ${isQuarterSelected ? 'text-indigo-600' : 'text-slate-700'}`}>
                            {quarter.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDateRange(quarter.startDate, quarter.endDate)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Backdrop para fechar */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
