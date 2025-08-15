import React from 'react';
import { GGVInteligenciaBrand } from '../../ui/BrandLogos';
import { CompanyData } from '../../../types';

interface CoverTabProps {
    companyData: CompanyData;
    specialistName?: string;
}

export const CoverTab: React.FC<CoverTabProps> = ({ companyData, specialistName }) => (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-blue-900 via-teal-700 to-teal-500 text-white w-full max-w-4xl shadow-2xl no-break">
            {/* Logo GGV Inteligência no topo (negativo) */}
            <div className="mb-8">
                <GGVInteligenciaBrand className="w-56 mx-auto filter brightness-0 invert contrast-125" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Diagnóstico Comercial</h1>
            <p className="text-2xl mt-2 text-teal-200">Raio-X do Setor de Vendas</p>
            <p className="text-lg mt-4 text-teal-100 font-medium">Inteligência em Vendas</p>
            
            <div className="mt-12 bg-white/15 p-6 rounded-xl backdrop-blur-sm border border-white/30">
                <p className="text-2xl font-bold">{companyData.companyName}</p>
                <p className="mt-2 text-teal-100">{companyData.activityBranch}{companyData.activitySector ? ` • ${companyData.activitySector}` : ''} • {companyData.salesChannels.join(' / ')}</p>
                <p className="mt-1 text-teal-100">Equipe de vendas: {companyData.salesTeamSize}</p>
            </div>
            
            <div className="flex justify-between items-center mt-12 text-sm text-teal-200/80">
                <span>Especialista: {specialistName || '—'}</span>
                <span>Data: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>
        </div>
    </div>
);
