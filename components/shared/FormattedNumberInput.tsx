import React, { useState, useEffect, useRef } from 'react';

interface FormattedNumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
  decimalScale?: number;
  name?: string;
}

export const FormattedNumberInput: React.FC<FormattedNumberInputProps> = ({
  value,
  onChange,
  prefix = '',
  suffix = '',
  placeholder = '0',
  className = '',
  decimalScale = 2,
  name
}) => {
  // Formata número para string de exibição (pt-BR)
  const formatValue = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '';
    return val.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimalScale,
    });
  };

  const [displayValue, setDisplayValue] = useState(formatValue(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincroniza valor externo com display
  useEffect(() => {
    // Só atualiza se o input não estiver focado para não atrapalhar digitação
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(formatValue(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;

    // Remove caracteres não numéricos exceto vírgula
    inputValue = inputValue.replace(/[^\d,]/g, '');

    // Se estiver vazio
    if (inputValue === '') {
      setDisplayValue('');
      onChange(null);
      return;
    }

    // Trata vírgula
    const parts = inputValue.split(',');
    if (parts.length > 2) {
      inputValue = parts[0] + ',' + parts.slice(1).join('');
    }

    // Se usuário está digitando vírgula ou decimais, não formata milhar ainda para não atrapalhar
    if (inputValue.includes(',')) {
      setDisplayValue(inputValue);

      // Atualiza valor pai
      const numberString = inputValue.replace(/\./g, '').replace(',', '.');
      const val = parseFloat(numberString);
      if (!isNaN(val)) onChange(val);
      return;
    }

    // Se é só inteiro, formata com pontos de milhar
    const rawValue = parseInt(inputValue.replace(/\./g, ''), 10);
    if (!isNaN(rawValue)) {
      const formatted = rawValue.toLocaleString('pt-BR');
      setDisplayValue(formatted);
      onChange(rawValue);
    } else {
      setDisplayValue(inputValue);
    }
  };

  const handleBlur = () => {
    // Ao sair, formata bonitinho
    setDisplayValue(formatValue(value));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Seleciona tudo ao focar para facilitar substituição
    e.target.select();
  };

  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        ref={inputRef}
        name={name}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={`${className} ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-6' : ''}`}
      />
      {suffix && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
};

