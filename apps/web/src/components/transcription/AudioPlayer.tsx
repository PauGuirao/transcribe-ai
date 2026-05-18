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
import { AudioPlayerProps, AudioPlayerRef } from '@/types';

export function AudioPlayer({ audioId, className, onRef, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Reset local state when the audio source changes so we don't briefly show
  // the previous file's duration / playback position.
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferedPercent(0);
    setIsBuffering(false);
    setIsLoading(true);
    setError(null);
  }, [audioId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Debounce the "Buffering…" label so brief (<300ms) stalls don't flash.
    let bufferingTimer: number | null = null;
    const scheduleBufferingOn = () => {
      if (bufferingTimer != null) return;
      bufferingTimer = window.setTimeout(() => {
        setIsBuffering(true);
        bufferingTimer = null;
      }, 300);
    };
    const cancelBuffering = () => {
      if (bufferingTimer != null) {
        window.clearTimeout(bufferingTimer);
        bufferingTimer = null;
      }
      setIsBuffering(false);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);
      onTimeUpdate?.(t);
      // If the playhead is advancing, by definition we're not buffering.
      // This guards against `playing`/`canplay` events that some browsers
      // skip after a brief `waiting`.
      cancelBuffering();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      cancelBuffering();
    };

    const handleError = () => {
      setError('Failed to load audio file');
      setIsLoading(false);
      cancelBuffering();
    };

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleWaiting = () => {
      // Only treat as "buffering" if we're actively playing — otherwise
      // `waiting` during seek-while-paused or initial metadata load is noise.
      if (!audio.paused) scheduleBufferingOn();
    };
    const handleStalled = () => {
      if (!audio.paused) scheduleBufferingOn();
    };
    const handlePlaying = cancelBuffering;
    const handleCanPlay = cancelBuffering;
    const handlePause = cancelBuffering;

    const handleProgress = () => {
      const dur = audio.duration;
      if (!dur || !isFinite(dur) || audio.buffered.length === 0) return;
      const end = audio.buffered.end(audio.buffered.length - 1);
      setBufferedPercent(Math.min(100, (end / dur) * 100));
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('progress', handleProgress);

    return () => {
      cancelBuffering();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('progress', handleProgress);
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
    if (audio && duration && value && value.length > 0) {
      const percentage = Math.max(0, Math.min(100, value[0]));
      const newTime = (percentage / 100) * duration;
      
      // Ensure the new time is within valid bounds
      const clampedTime = Math.max(0, Math.min(duration, newTime));
      
      console.log('Seeking to:', { percentage, newTime: clampedTime, duration });
      
      try {
        audio.currentTime = clampedTime;
        setCurrentTime(clampedTime);
      } catch (error) {
        console.error('Error seeking audio:', error);
      }
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
    if (audio && audio.duration) {
      audio.currentTime = Math.min(Math.max(0, time), audio.duration);
      setCurrentTime(audio.currentTime);
    }
  }, []);

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
    <div className="rounded-xl border border-neutral-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <audio
        ref={audioRef}
        src={`/api/audio/${audioId}/file`}
        preload="metadata"
      />

      <div className="flex items-center gap-3">
        {/* Time + buffering indicator */}
        <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-neutral-600">
          <span className="font-medium text-neutral-900">{formatTime(currentTime)}</span>
          <span className="text-neutral-300">/</span>
          <span>{formatTime(duration)}</span>
          {isBuffering && (
            <span
              className="ml-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-amber-600"
              role="status"
              aria-live="polite"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
              Buffering
            </span>
          )}
        </div>

        {/* Transport controls */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipBackward}
            disabled={isLoading}
            className="h-9 w-9 text-neutral-700 hover:bg-neutral-100"
            title="Retroceder 10s"
            aria-label="Retroceder 10 segundos"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="h-10 w-10 rounded-full bg-neutral-900 text-white shadow-sm hover:bg-neutral-800"
            title={isPlaying ? "Pausa" : "Reproducir"}
            aria-label={isPlaying ? "Pausa" : "Reproducir"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={skipForward}
            disabled={isLoading}
            className="h-9 w-9 text-neutral-700 hover:bg-neutral-100"
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
            className="h-9 w-9 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
            title="Reiniciar"
            aria-label="Reiniciar"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Playback rate */}
        <div className="shrink-0">
          <label htmlFor="rate" className="sr-only">Velocidad</label>
          <select
            id="rate"
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            disabled={isLoading}
            className="h-8 cursor-pointer rounded-md border border-neutral-200 bg-white px-2 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-300"
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

        {/* Progress (flex grows) — slider + buffered-range overlay */}
        <div className="relative mx-1 flex-1">
          {/* Buffered-range indicator behind the slider track */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-300/70 transition-[width] duration-300 ease-out"
            style={{ width: `${bufferedPercent}%` }}
          />
          <Slider
            value={[progressPercentage]}
            onValueChange={handleSeek}
            onValueCommit={handleSeek}
            max={100}
            step={0.1}
            disabled={isLoading || !duration}
            aria-label="Progreso"
            className={cn(
              "[&>span:first-child]:h-1.5 [&>span:first-child]:rounded-full [&>span:first-child]:bg-neutral-200",
              "[&>span:first-child>span]:bg-neutral-900",
              "[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border [&_[role=slider]]:border-neutral-300 [&_[role=slider]]:bg-white [&_[role=slider]]:shadow-sm",
            )}
          />
        </div>

        {/* Volume — collapsed by default, expands on hover */}
        <div className="group/vol relative flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-9 w-9 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            title={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
            aria-label={isMuted || volume === 0 ? "Activar sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          {/* Hover-expanding volume slider — keeps the audio bar tight by default. */}
          <div
            className={cn(
              "ml-1 overflow-hidden transition-[width,opacity] duration-200 ease-out",
              "w-0 opacity-0 group-hover/vol:w-24 group-hover/vol:opacity-100 group-focus-within/vol:w-24 group-focus-within/vol:opacity-100",
            )}
          >
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              aria-label="Volumen"
              className={cn(
                "[&>span:first-child]:h-1 [&>span:first-child]:rounded-full [&>span:first-child]:bg-neutral-200",
                "[&>span:first-child>span]:bg-neutral-900",
                "[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border [&_[role=slider]]:border-neutral-300 [&_[role=slider]]:bg-white",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  </div>
);

}