import React from 'react';

// General Form Styling Constants
export const formLabelClass = "block text-sm font-medium text-slate-700 mb-1.5";
export const formInputClass = "w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-800 focus:border-blue-800 disabled:bg-slate-100 disabled:cursor-not-allowed";
export const formTextareaClass = `${formInputClass} resize-y`;

// FormGroup Component
export const FormGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={className}>{children}</div>
);

// FormInput Component
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    name: string;
    label: string;
    error?: string;
}
export const FormInput: React.FC<FormInputProps> = ({ id, label, error, required, ...props }) => (
    <FormGroup>
        <label htmlFor={id} className={formLabelClass}>{label}{required && ' *'}</label>
        <input
            id={id}
            required={required}
            className={`${formInputClass} ${error ? 'border-red-500' : 'border-slate-300'}`}
            {...props}
        />
        {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
    </FormGroup>
);

// FormattedInputField Component (for currency/percentage)
interface FormattedInputProps extends Omit<FormInputProps, 'value' | 'onChange' | 'type'> {
    value: string; // Raw numeric string
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; // Expects raw numeric string
    formatType: 'currency' | 'percentage';
}
export const FormattedInputField: React.FC<FormattedInputProps> = ({ label, name, value, onChange, formatType, ...props }) => {
    const formatForDisplay = (val: string): string => {
        if (val === null || val === undefined || val === '') return '';
        
        if (formatType === 'currency') {
            // Remove any non-numeric characters and format with thousands separator
            const cleanVal = val.replace(/[^0-9]/g, '');
            if (cleanVal === '') return '';
            
            // Add thousands separator (dots) every 3 digits from right
            const formatted = cleanVal.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return 'R$ ' + formatted;
        }
        
        if (formatType === 'percentage') {
            // For percentage, allow decimal values
            const cleanVal = val.replace(/[^0-9.,]/g, '');
            if (cleanVal === '') return '';
            
            // Format with thousands separator if needed
            const parts = cleanVal.split(/[.,]/);
            const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            const decimalPart = parts[1] ? ',' + parts[1] : '';
            
            return integerPart + decimalPart + '%';
        }
        
        return val;
    };

    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let rawValue: string;
        
        if (formatType === 'currency') {
            // For currency, only allow digits
            rawValue = e.target.value.replace(/[^0-9]/g, '');
        } else if (formatType === 'percentage') {
            // For percentage, allow digits, comma and dot for decimals
            rawValue = e.target.value.replace(/[^0-9.,]/g, '');
            // Ensure only one decimal separator
            const parts = rawValue.split(/[.,]/);
            if (parts.length > 2) {
                rawValue = parts[0] + '.' + parts.slice(1).join('');
            }
        } else {
            rawValue = e.target.value.replace(/[^0-9]/g, '');
        }
        
        // Create a synthetic event to pass up, containing only the raw numeric value
        const syntheticEvent = {
            target: {
                name: name,
                value: rawValue,
            }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
    };

    // Allow clearing with Backspace/Delete when the suffix/prefix is focused
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (formatType !== 'percentage' && formatType !== 'currency') return;
        const displayValue = formatForDisplay(value);
        const input = e.currentTarget;
        const selStart = input.selectionStart ?? 0;
        const selEnd = input.selectionEnd ?? 0;

        // Only intercept when there is no selection (caret only)
        const hasSelection = selEnd > selStart;
        if (hasSelection) return;

        // If caret is at end and user presses Backspace, remove last digit of raw value
        const atEnd = selStart === displayValue.length;
        if (e.key === 'Backspace' && atEnd) {
            e.preventDefault();
            const newRaw = (value || '').slice(0, -1);
            const syntheticEvent = {
                target: { name, value: newRaw }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
            return;
        }

        // If caret at start and user presses Delete, also remove first digit of raw value
        const atStart = selStart === 0;
        if (e.key === 'Delete' && atStart) {
            e.preventDefault();
            const newRaw = (value || '').slice(1);
            const syntheticEvent = {
                target: { name, value: newRaw }
            } as unknown as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        }
    };

    return (
        <FormGroup>
            <label htmlFor={name} className={formLabelClass}>{label}</label>
            <input
                id={name}
                name={name}
                value={formatForDisplay(value)}
                onChange={handleLocalChange}
                onKeyDown={handleKeyDown}
                className={formInputClass}
                {...props}
            />
        </FormGroup>
    );
};

// FormSelect Component
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    id: string;
    name: string;
    label: string;
    error?: string;
}
export const FormSelect: React.FC<FormSelectProps> = ({ id, label, error, required, children, ...props }) => (
    <FormGroup>
        <label htmlFor={id} className={formLabelClass}>{label}{required && ' *'}</label>
        <select
            id={id}
            required={required}
            className={`${formInputClass} ${error ? 'border-red-500' : 'border-slate-300'}`}
            {...props}
        >
            {children}
        </select>
        {error && <p className="text-red-600 text-xs mt-1.5">{error}</p>}
    </FormGroup>
);

// FormCheckbox Component
interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
}
export const FormCheckbox: React.FC<FormCheckboxProps> = ({ id, label, ...props }) => (
    <div className="flex items-center">
        <input
            id={id}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-800 focus:ring-blue-800"
            {...props}
        />
        <label htmlFor={id} className="ml-2 block text-sm text-slate-800">{label}</label>
    </div>
);
