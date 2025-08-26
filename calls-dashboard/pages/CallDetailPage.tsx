import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../constants';
import AiAssistant from '../components/AiAssistant';

export default function CallDetailPage() {
  const { id } = useParams();
  const call = CALLS.find((c) => c.id === id);

  if (!call) {
    return (
      <div className="p-6">
        <div className="bg-white border border-slate-200 rounded p-6">
          <div className="text-slate-700">Chamada não encontrada.</div>
          <Link to="/calls" className="text-indigo-600 text-sm">Voltar para lista</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Detalhes da Chamada</h2>
          <p className="text-sm text-slate-600">{call.company} • {call.dealCode}</p>
        </div>
        <Link to="/calls" className="text-sm text-slate-600 hover:text-slate-900">Voltar</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <img className="w-10 h-10 rounded-full" src={call.sdr.avatarUrl} alt="avatar" />
              <div>
                <div className="font-medium text-slate-800">{call.sdr.name}</div>
                <div className="text-xs text-slate-500">{DATE_FORMATTER.format(new Date(call.date))} • {TIME_FORMATTER.format(new Date(call.date))}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Duração</div>
                <div className="font-semibold">{secondsToHuman(call.durationSec)}</div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-semibold capitalize">{call.status}</div>
              </div>
              <div>
                <div className="text-slate-500">Nota</div>
                <div className="font-semibold">{typeof call.score === 'number' ? call.score : 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="mb-2 font-medium text-slate-800">Áudio da chamada</div>
            <audio controls className="w-full">
              <source src={`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`} type="audio/mpeg" />
              Seu navegador não suporta o elemento de áudio.
            </audio>
          </div>
        </div>

        <div className="space-y-4">
          <AiAssistant call={call} />
        </div>
      </div>
    </div>
  );
}


