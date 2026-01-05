import React, { useState } from 'react';
import { StrategicMap, Motor, Objective, KPI, Role } from '../../types';

interface StrategicMapBuilderProps {
  initialMap: StrategicMap;
  onBack: () => void;
  contextData?: string;
}

const StrategicMapBuilder: React.FC<StrategicMapBuilderProps> = ({ 
  initialMap, 
  onBack,
  contextData 
}) => {
  const [map, setMap] = useState<StrategicMap>(initialMap);
  const [activeSection, setActiveSection] = useState<string>('identity');

  const handleSave = () => {
    // Aqui vamos salvar no Supabase
    console.log('Salvando mapa:', map);
    alert('Mapa estratégico salvo com sucesso!');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Mapa Estratégico</h1>
                <p className="text-sm text-slate-500">Planejamento Corporativo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                🔄 Novo Contexto
              </button>
              <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                ← Meus Mapas
              </button>
              <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                🖨️
              </button>
              <button className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                ↻
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3 space-y-6">
            {/* Identidade */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <h2 className="font-bold text-slate-900">IDENTIDADE</h2>
              </div>
              <p className="text-sm text-slate-600">
                Fundamentos estratégicos que norteiam a operação.
              </p>
            </div>

            {/* Estratégias */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                <h2 className="font-bold text-slate-900">ESTRATÉGIAS</h2>
              </div>
              <p className="text-sm text-slate-600">
                Motores de crescimento e iniciativas.
              </p>
            </div>
          </div>

          {/* Main Area */}
          <div className="col-span-9 space-y-6">
            {/* Department Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={map.company_name || 'Departamento X'}
                  onChange={(e) => setMap({ ...map, company_name: e.target.value })}
                  className="text-3xl font-bold text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-2 py-1 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                📅 DATA:
                <input
                  type="date"
                  value={map.date}
                  onChange={(e) => setMap({ ...map, date: e.target.value })}
                  className="px-3 py-1 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Identity Section */}
            <div className="grid grid-cols-3 gap-4">
              <IdentityCard
                title="MISSÃO"
                value={map.mission}
                onChange={(value) => setMap({ ...map, mission: value })}
              />
              <IdentityCard
                title="VISÃO"
                value={map.vision}
                onChange={(value) => setMap({ ...map, vision: value })}
              />
              <IdentityCard
                title="VALORES"
                value={map.values?.join('\n')}
                onChange={(value) => setMap({ ...map, values: value.split('\n').filter(v => v.trim()) })}
              />
            </div>

            {/* Motors Section */}
            <div className="grid grid-cols-3 gap-4">
              <MotorCard title="MOTOR 1" />
              <MotorCard title="MOTOR 2" />
              <MotorCard title="MOTOR 3" />
            </div>

            {/* Objectives Section */}
            <div className="grid grid-cols-3 gap-4">
              <ObjectiveCard 
                title="OBJETIVO 1"
                subtitle="Aumentar a Satisfação do Cliente"
              />
              <ObjectiveCard 
                title="OBJETIVO 2"
                subtitle="Melhorar Eficiência Operacional"
              />
              <ObjectiveCard 
                title="OBJETIVO 3"
                subtitle="Expandir Base de Clientes"
              />
            </div>

            {/* Execution Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <h2 className="font-bold text-slate-900">EXECUÇÃO</h2>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-semibold text-slate-600 mb-3">LEGENDA</div>
                <div className="flex gap-6 text-sm text-slate-600 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Papel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>Responsabilidade</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Métrica</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <RoleCard title="Gerente" />
                  <RoleCard title="Coordenador" />
                </div>
              </div>
            </div>

            {/* Rituals Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-lg">📅</span>
                </div>
                <h2 className="font-bold text-slate-900">RITUAIS</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Cadência de gestão e acompanhamento.
              </p>

              <div className="grid grid-cols-6 gap-4">
                {['DIÁRIO', 'SEMANAL', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'].map((freq) => (
                  <div key={freq} className="text-center">
                    <div className="text-xs font-semibold text-slate-500 mb-2">{freq}</div>
                    <div className="space-y-2">
                      <div className="bg-slate-50 rounded-lg p-3 text-xs">
                        <button className="text-slate-400 hover:text-blue-600">+ Adicionar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleSave}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-lg"
              >
                💾 Salvar Versão ({map.company_name || 'Departamento X'} - {map.date})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const IdentityCard: React.FC<{ 
  title: string; 
  value?: string;
  onChange: (value: string) => void;
}> = ({ title, value, onChange }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-slate-200 hover:border-blue-300 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
        {title}
      </span>
      <button className="text-slate-400 hover:text-red-500">✕</button>
    </div>
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={title}
      className="w-full h-20 text-sm text-slate-700 resize-none outline-none"
    />
  </div>
);

const MotorCard: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-slate-200">
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-bold text-slate-600">● {title}</span>
      <button className="text-slate-400 hover:text-red-500">✕</button>
    </div>
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">●</span>
        <input
          type="text"
          placeholder="Estratégia 1"
          className="flex-1 outline-none text-slate-700"
        />
        <button className="text-slate-400 hover:text-red-500 text-xs">✕</button>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">●</span>
        <input
          type="text"
          placeholder="Estratégia 2"
          className="flex-1 outline-none text-slate-700"
        />
        <button className="text-slate-400 hover:text-red-500 text-xs">✕</button>
      </div>
      <button className="text-xs text-slate-400 hover:text-blue-600 mt-2">+ Adicionar</button>
    </div>
  </div>
);

const ObjectiveCard: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200">
    <div className="border-b-4 border-slate-900 px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold bg-slate-900 text-white px-3 py-1 rounded-full">
          {title}
        </span>
        <button className="text-slate-400 hover:text-red-500">✕</button>
      </div>
      <div className="text-sm font-semibold text-slate-900 mt-2">{subtitle}</div>
    </div>
    <div className="p-4 space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">INDICADOR (KPI)</span>
          <span className="text-slate-500">FREQ.</span>
          <span className="text-slate-500">META</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">NPS</span>
          <span className="text-slate-600">Mensal</span>
          <span className="font-semibold text-slate-900">75</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">CSAT</span>
          <span className="text-slate-600">Semanal</span>
          <span className="font-semibold text-slate-900">4.5/5</span>
        </div>
      </div>
      <button className="text-xs text-slate-400 hover:text-blue-600">+ Adicionar KPI</button>
    </div>
  </div>
);

const RoleCard: React.FC<{ title: string }> = ({ title }) => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="text-xs text-slate-500 mb-1">PAPEL</div>
        <div className="font-bold text-slate-900">{title}</div>
      </div>
      <button className="text-slate-400 hover:text-red-500">✕</button>
    </div>
    
    <div className="space-y-3">
      <div>
        <div className="text-xs text-slate-500 mb-1">RESPONSABILIDADE</div>
        <textarea 
          placeholder="Coordenar"
          className="w-full text-sm text-slate-700 outline-none resize-none h-12"
        />
      </div>
      
      <div>
        <div className="text-xs text-slate-500 mb-2">MÉTRICA</div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-700">NPS</span>
          <span className="font-semibold">&gt; 75</span>
        </div>
      </div>
      
      <button className="text-xs text-slate-400 hover:text-blue-600">+ Add Métrica (1/5)</button>
    </div>
  </div>
);

export default StrategicMapBuilder;

