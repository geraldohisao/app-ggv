import React from 'react';

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export const SelectInput: React.FC<SelectInputProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  required = false,
  placeholder = 'Selecione...',
  className = ''
}) => {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          style={{
            backgroundImage: 'none',
          }}
          className={`
            w-full rounded-2xl px-6 py-4 border-none text-sm font-bold shadow-sm
            appearance-none cursor-pointer transition-all
            focus:ring-2 focus:ring-[#5B5FF5] focus:outline-none
            ${disabled 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}
            ${!value ? 'text-slate-400' : ''}
            [&>option]:rounded-xl [&>option]:py-3 [&>option]:px-4
            [&>option]:bg-white [&>option]:text-slate-700
            [&>option:checked]:bg-indigo-50 [&>option:checked]:text-indigo-900
            [&>option:hover]:bg-slate-50
          `}
        >
          {placeholder && (
            <option value="" disabled className="text-slate-400 bg-white">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              className="text-slate-700 font-semibold py-3 px-4 my-1 hover:bg-slate-50 rounded-xl"
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom Arrow Icon */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          <svg 
            className={`w-4 h-4 transition-colors ${disabled ? 'text-slate-300' : 'text-slate-400'}`} 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Selected option description (if exists) */}
      {selectedOption?.description && (
        <p className="text-[10px] text-slate-400 mt-2 font-semibold ml-1 tracking-wide uppercase">
          {selectedOption.description}
        </p>
      )}
    </div>
  );
};
