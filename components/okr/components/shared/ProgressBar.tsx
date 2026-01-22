interface ProgressBarProps {
  percentage: number;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  color = 'blue',
  showLabel = true,
  className = '',
}) => {
  const colorClasses = {
    green: 'bg-emerald-500',
    yellow: 'bg-amber-500',
    red: 'bg-rose-500',
    blue: 'bg-[#5B5FF5]',
    gray: 'bg-slate-400',
  };

  const bgColor = colorClasses[color];
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`${bgColor} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clampedPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};
