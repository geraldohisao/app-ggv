import React, { useState, useRef } from 'react';

interface MiniAudioPlayerProps {
  audioUrl: string;
  duration: number;
  callId: string;
}

export default function MiniAudioPlayer({ audioUrl, duration, callId }: MiniAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = async (e: React.MouseEvent) => {
    // Parar propagação do evento para não abrir detalhes da chamada
    e.stopPropagation();
    e.preventDefault();
    
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  return (
    <div 
      className="flex items-center gap-1"
      onClick={(e) => {
        // Parar propagação em todo o container do mini player
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onEnded={handleEnded}
        onCanPlay={handleCanPlay}
      />
      
      {/* Botão Play/Pause Simples */}
      <button
        onClick={togglePlay}
        disabled={isLoading}
        className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 shadow-sm hover:shadow-md"
        title={isPlaying ? `Pausar áudio (${formatTime(duration)})` : `Reproduzir áudio (${formatTime(duration)})`}
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
        ) : isPlaying ? (
          <div className="flex gap-0.5">
            <div className="w-1 h-3 bg-white rounded-sm"></div>
            <div className="w-1 h-3 bg-white rounded-sm"></div>
          </div>
        ) : (
          <div className="w-0 h-0 border-l-[5px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
        )}
      </button>
      
      {/* Duração pequena */}
      <span className="text-xs text-slate-500 font-medium">
        {formatTime(duration)}
      </span>
    </div>
  );
}
