
import React from 'react';

interface ProgressBarProps {
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  const safePercentage = Math.min(100, Math.max(0, percentage));

  const getColor = () => {
    if (safePercentage >= 100) return 'bg-green-500';
    if (safePercentage >= 75) return 'bg-orange-400';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full transition-all duration-500 ${getColor()}`}
        style={{ width: `${safePercentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
