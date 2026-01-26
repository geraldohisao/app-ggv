import React from 'react';

interface Step {
  id: number;
  label: string;
  icon: string;
}

interface CheckinStepIndicatorProps {
  currentStep: 1 | 2;
  onStepClick?: (step: 1 | 2) => void;
  isGovernance?: boolean;
}

const steps: Step[] = [
  { id: 1, label: 'Entrada', icon: '📥' },
  { id: 2, label: 'Formulário', icon: '📝' },
];

export const CheckinStepIndicator: React.FC<CheckinStepIndicatorProps> = ({
  currentStep,
  onStepClick,
  isGovernance = false,
}) => {
  return (
    <div className="w-full px-6 py-3">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-center gap-4">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          const isClickable = onStepClick && step.id < currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <div
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                  isClickable ? 'cursor-pointer hover:bg-slate-50' : ''
                } ${isActive ? 'bg-slate-100' : ''}`}
                onClick={() => isClickable && onStepClick(step.id as 1 | 2)}
              >
                {/* Circle */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all duration-300
                    ${isActive 
                      ? 'bg-slate-900 text-white' 
                      : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                
                {/* Label */}
                <span
                  className={`
                    text-sm font-bold
                    ${isActive 
                      ? 'text-slate-900' 
                      : isCompleted 
                        ? 'text-emerald-600' 
                        : 'text-slate-400'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={`w-12 h-0.5 rounded-full transition-colors ${
                    isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                  }`} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Mobile view - compact */}
      <div className="sm:hidden flex items-center justify-center gap-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`
                    w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-300
                    ${isActive 
                      ? 'bg-slate-900 text-white' 
                      : isCompleted 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-200 text-slate-500'
                    }
                  `}
                >
                  {isCompleted ? '✓' : step.id}
                </div>
                <span className={`text-xs font-bold ${isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div 
                  className={`w-8 h-0.5 rounded-full ${
                    isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                  }`} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default CheckinStepIndicator;
