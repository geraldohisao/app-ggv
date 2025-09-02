import React from 'react';
import { DetailedAIAnalysis, SummaryInsights } from '../../../types';
import { AttentionPointsTab } from './AttentionPointsTab';

interface SalesBottlenecksTabProps {
    scoresByArea: Record<string, { score: number; count: number }>;
    detailedAnalysis: DetailedAIAnalysis | null;
    summaryInsights: SummaryInsights | null;
    isLoading: boolean;
}

export const SalesBottlenecksTab: React.FC<SalesBottlenecksTabProps> = ({ 
    scoresByArea, 
    detailedAnalysis,
    summaryInsights,
    isLoading 
}) => {
    return (
        <AttentionPointsTab 
            scoresByArea={scoresByArea}
            detailedAnalysis={detailedAnalysis}
            summaryInsights={summaryInsights}
            isLoading={isLoading}
        />
    );
};
