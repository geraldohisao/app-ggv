import React from 'react';
import { DetailedAIAnalysis, SummaryInsights, CompanyData, MaturityResult, MarketSegment } from '../../../types';
import { AttentionPointsTab } from './AttentionPointsTab';

interface SalesBottlenecksTabProps {
    companyData: CompanyData;
    maturity: MaturityResult;
    totalScore: number;
    segment: MarketSegment;
    scoresByArea: Record<string, { score: number; count: number }>;
    detailedAnalysis: DetailedAIAnalysis | null;
    summaryInsights: SummaryInsights | null;
    specialistName?: string;
    isLoading: boolean;
}

export const SalesBottlenecksTab: React.FC<SalesBottlenecksTabProps> = ({ 
    companyData,
    maturity,
    totalScore,
    segment,
    scoresByArea, 
    detailedAnalysis,
    summaryInsights,
    specialistName,
    isLoading 
}) => {
    return (
        <AttentionPointsTab 
            companyData={companyData}
            maturity={maturity}
            totalScore={totalScore}
            segment={segment}
            scoresByArea={scoresByArea}
            detailedAnalysis={detailedAnalysis}
            summaryInsights={summaryInsights}
            specialistName={specialistName}
            isLoading={isLoading}
        />
    );
};
