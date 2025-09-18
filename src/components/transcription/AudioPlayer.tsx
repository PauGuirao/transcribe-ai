'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  audioId: string;
  className?: string;
  onRef?: (ref: AudioPlayerRef) => void;
}

export interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

export function AudioPlayer({ audioId, className, onRef }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [audioId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      setError('Failed to play audio');
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (audio && duration) {
      const newTime = (value[0] / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10);
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(duration, audio.currentTime + 10);
    }
  };

  const resetAudio = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      if (isPlaying) {
        setIsPlaying(false);
        audio.pause();
      }
    }
  };

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio && duration) {
      audio.currentTime = Math.min(Math.max(0, time), duration);
      setCurrentTime(audio.currentTime);
    }
  }, [duration]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && !isPlaying) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        setError('Failed to play audio');
      }
    }
  }, [isPlaying]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Expose methods to parent component
  useEffect(() => {
    if (onRef) {
      onRef({ seekTo, play, pause });
    }
  }, [onRef, seekTo, play, pause]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="p-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
  <div className={cn("w-full", className)}>
    <div className="rounded-xl border bg-card/70 backdrop-blur p-4 shadow-sm">
      <audio
        ref={audioRef}
        src={`/api/audio/${audioId}/file`}
        preload="metadata"
      />

      <div className="flex items-center gap-4">
        {/* Time */}
        <div className="min-w-[110px] text-sm text-muted-foreground tabular-nums">
          <span className="font-medium">{formatTime(currentTime)}</span>
          <span className="mx-1">/</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={skipBackward}
            disabled={isLoading}
            className="h-9 w-9"
            title="Retroceder 10s"
            aria-label="Retroceder 10 segundos"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="h-11 w-11 rounded-full bg-black text-white hover:bg-black/90"
            title={isPlaying ? "Pausa" : "Reproducir"}
            aria-label={isPlaying ? "Pausa" : "Reproducir"}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={skipForward}
            disabled={isLoading}
            className="h-9 w-9"
            title="Avanzar 10s"
            aria-label="Avanzar 10 segundos"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={resetAudio}
            disabled={isLoading}
            className="h-9 w-9"
            title="Reiniciar"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2">
          <label htmlFor="rate" className="sr-only">Velocidad</label>
          <select
            id="rate"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            disabled={isLoading}
            className="h-8 rounded-md border bg-background px-2 text-xs font-medium"
            title="Velocidad de reproducción"
          >
            <option value={0.5}>0.5×</option>
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
            <option value={1.25}>1.25×</option>
            <option value={1.5}>1.5×</option>
            <option value={2}>2×</option>
          </select>
        </div>

        {/* Progress (flex grows) */}
        <div className="mx-2 flex-1">
          <Slider
            value={[progressPercentage]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            disabled={isLoading || !duration}
            aria-label="Progreso"
            className={cn(
              // track
              "[&>span:first-child]:h-2 [&>span:first-child]:rounded-full [&>span:first-child]:bg-muted",
              // range (filled)
              "[&>span:first-child>span]:bg-black",
              // thumb
              "[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border [&_[role=slider]]:border-border [&_[role=slider]]:bg-background"
            )}
          />
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8"
            title={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
            aria-label={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </Button>
          <div className="w-24">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              aria-label="Volumen"
              className={cn(
                "[&>span:first-child]:h-1.5 [&>span:first-child]:rounded-full [&>span:first-child]:bg-muted",
                "[&>span:first-child>span]:bg-black",
                "[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border [&_[role=slider]]:border-border [&_[role=slider]]:bg-background"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

}