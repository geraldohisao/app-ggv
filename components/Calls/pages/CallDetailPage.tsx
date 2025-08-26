import React, { useEffect, useState } from 'react';
import { CALLS, DATE_FORMATTER, TIME_FORMATTER, secondsToHuman } from '../../../calls-dashboard/constants';
import AiAssistant from '../../../calls-dashboard/components/AiAssistant';
import { fetchCallDetails } from '../../../services/callsService';

export default function CallDetailPage({ callId }: { callId: string }) {
  const local = CALLS.find((c) => c.id === callId);
  const [call, setCall] = useState<any>(local);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchCallDetails(callId);
        if (data) setCall({ ...local, ...data });
        // tenta pegar url assinada via função
        const res = await fetch(`/api/calls/signed-audio?callId=${callId}`);
        if (res.ok) {
          const j = await res.json();
          if (j?.url) setSignedUrl(j.url);
        } else if (data?.recording_url) {
          setSignedUrl(data.recording_url);
        }
      } catch {
        // mantém fallback local
      }
    };
    run();
  }, [callId]);
  if (!call) return <div className="text-slate-600">Chamada não encontrada.</div>;
  return (
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
            <source src={signedUrl || `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`} type="audio/mpeg" />
            Seu navegador não suporta o elemento de áudio.
          </audio>
        </div>
      </div>
      <div className="space-y-4">
        <AiAssistant call={call} />
      </div>
    </div>
  );
}


