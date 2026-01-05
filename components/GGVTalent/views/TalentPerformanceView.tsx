import React from 'react';
import { Badge, Card, ProgressBar } from '../widgets';
import { PerformanceAssessment } from '../../../types/ggv-talent';
import { PresentationChartLineIcon } from '../../ui/icons';

interface PerformanceProps {
  assessments: PerformanceAssessment[];
}

export const TalentPerformanceView: React.FC<PerformanceProps> = ({ assessments }) => {
  const latest = assessments[0];
  const trend = assessments.length > 1 ? assessments[0].totalScore - assessments[assessments.length - 1].totalScore : 0;

  return (
    <div className="space-y-4">
      <Card title="Performance GGV" icon={<PresentationChartLineIcon className="w-5 h-5" />} badge={latest ? <Badge tone="success">{latest.totalScore} pts</Badge> : null}>
        {latest ? (
          <div className="space-y-2 text-sm text-slate-800">
            <p className="font-semibold">Score atual {latest.period}</p>
            <ProgressBar value={latest.totalScore} color="bg-emerald-500" />
            <p className="text-xs text-slate-500">Técnico {latest.technicalScore} · Comportamental {latest.behavioralScore}</p>
            <p className="text-xs text-emerald-700 font-semibold">{trend >= 0 ? `+${trend.toFixed(1)} pts vs anterior` : `${trend.toFixed(1)} pts vs anterior`}</p>
            <div className="mt-2 text-xs text-slate-600">
              <p>Feedback IA (placeholder): “Ótimo desempenho técnico e comportamental. Continue focando na qualidade do código.”</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Nenhum registro de performance.</p>
        )}
      </Card>

      <Card title="Histórico de Ciclos">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-600">
                <th className="py-2 pr-3">Período</th>
                <th className="py-2 pr-3">Score Final</th>
                <th className="py-2 pr-3">Técnico</th>
                <th className="py-2 pr-3">Comportamental</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map((a) => (
                <tr key={a.id} className="border-t border-slate-200 text-slate-800">
                  <td className="py-2 pr-3">{a.period}</td>
                  <td className="py-2 pr-3">
                    <Badge tone="muted">{a.totalScore} pts</Badge>
                  </td>
                  <td className="py-2 pr-3">{a.technicalScore} pts</td>
                  <td className="py-2 pr-3">{a.behavioralScore} pts</td>
                </tr>
              ))}
              {assessments.length === 0 && (
                <tr>
                  <td className="py-3 text-slate-600" colSpan={4}>
                    Nenhum ciclo registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

