import React from 'react';
import { Badge, Card } from '../widgets';
import { Alignment } from '../../../types/ggv-talent';
import { UsersIcon } from '../../ui/icons';

interface AlignmentsProps {
  alignments: Alignment[];
}

export const TalentAlignmentsView: React.FC<AlignmentsProps> = ({ alignments }) => {
  return (
    <Card title="Alinhamentos" icon={<UsersIcon className="w-5 h-5" />}>
      <div className="space-y-3">
        {alignments.map((al) => (
          <div key={al.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone="muted">{al.category}</Badge>
                <span className="text-xs text-slate-500">{al.date}</span>
              </div>
              <Badge tone={al.criticality === 'HIGH' ? 'danger' : al.criticality === 'MEDIUM' ? 'info' : 'muted'}>
                {al.criticality === 'HIGH' ? 'Em andamento' : al.criticality === 'MEDIUM' ? 'Em andamento' : 'Resolvido'}
              </Badge>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">{al.topic}</p>
            <p className="text-sm text-slate-700">{al.notes}</p>
          </div>
        ))}
        {alignments.length === 0 && <p className="text-sm text-slate-600">Nenhum alinhamento registrado.</p>}
      </div>
    </Card>
  );
};



