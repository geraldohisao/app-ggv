import React from 'react';
import { DIAGNOSTIC_AREAS, BENCHMARK_DATA } from '../../../constants';
import { DiagnosticArea } from '../../../types';

interface RadarChartProps {
    scoresByArea: Record<string, { score: number; count: number }>;
}

export const RadarChart: React.FC<RadarChartProps> = ({ scoresByArea }) => {
    const size = 300;
    const center = size / 2;
    const radius = center * 0.8;
    const numAxes = DIAGNOSTIC_AREAS.length;
    const angleSlice = (Math.PI * 2) / numAxes;

    const getPoint = (value: number, index: number) => {
        const angle = angleSlice * index - Math.PI / 2;
        const r = (value / 100) * radius;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
        };
    };

    const axes = DIAGNOSTIC_AREAS.map((area, i) => {
        const endPoint = getPoint(100, i);
        return { name: area, x: endPoint.x, y: endPoint.y };
    });

    const scores = DIAGNOSTIC_AREAS.map(area => {
        const data = scoresByArea[area];
        const score = data?.score ?? 0;
        const maxScore = (data?.count ?? 1) * 10;
        return maxScore > 0 ? (score / maxScore) * 100 : 0;
    });

    const userPoints = scores.map((score, i) => getPoint(score, i));
    const userPath = userPoints.map(p => `${p.x},${p.y}`).join(' ');

    const marketAvgScores = DIAGNOSTIC_AREAS.map(area => BENCHMARK_DATA.marketAverage[area as DiagnosticArea] / 10 * 100);
    const marketAvgPoints = marketAvgScores.map((score, i) => getPoint(score, i));
    const marketAvgPath = marketAvgPoints.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <div className="flex justify-center items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background circles */}
                {[25, 50, 75, 100].map(val => (
                    <circle key={val} cx={center} cy={center} r={(val / 100) * radius} fill="none" stroke="#e2e8f0" strokeWidth="1" />
                ))}

                {/* Axes */}
                {axes.map((axis, i) => (
                    <g key={axis.name}>
                        <line x1={center} y1={center} x2={axis.x} y2={axis.y} stroke="#cbd5e1" strokeWidth="1" />
                        <text x={axis.x + (axis.x - center) * 0.1} y={axis.y + (axis.y - center) * 0.1} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="bold" fill="#475569">
                            {axis.name}
                        </text>
                    </g>
                ))}

                {/* Market Average Polygon */}
                <polygon points={marketAvgPath} fill="rgba(251, 191, 36, 0.2)" stroke="#d97706" strokeWidth="2" strokeDasharray="4 2" />

                {/* User Score Polygon */}
                <polygon points={userPath} fill="rgba(30, 58, 138, 0.4)" stroke="#1e3a8a" strokeWidth="2" />
                {userPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill="#1e3a8a" />
                ))}
            </svg>
        </div>
    );
};
