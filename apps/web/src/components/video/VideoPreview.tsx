/**
 * VideoPreview — sandboxed iframe player for HyperFrames compositions.
 *
 * Two modes:
 *   1. "design" — renders the HTML directly in iframe (static preview)
 *   2. "playback" — renders with playback controls, timeline scrubber
 *
 * This component is the video equivalent of Open Design's sandboxed
 * `<artifact>` iframe preview.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface VideoPreviewProps {
  /** HTML content of the composition */
  html?: string;
  /** URL to a rendered MP4 (after render completes) */
  mp4Url?: string;
  /** Which preview mode */
  mode?: 'design' | 'playback' | 'rendered';
  /** Total duration in seconds (for timeline scrubber) */
  duration?: number;
  /** Called when the rendered MP4 is ready */
  onRenderReady?: (url: string) => void;
}

export function VideoPreview({
  html,
  mp4Url,
  mode = 'design',
  duration = 10,
  onRenderReady,
}: VideoPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{
    frame: number;
    totalFrames: number;
  } | null>(null);

  // When HTML changes, reload the design iframe
  useEffect(() => {
    if (html && iframeRef.current && mode === 'design') {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [html, mode]);

  // Timeline keyboard controls (space = play/pause, ← → = scrub)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (mode !== 'playback') return;
      if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        setCurrentTime((t) => Math.max(0, t - 0.1));
      } else if (e.key === 'ArrowRight') {
        setCurrentTime((t) => Math.min(duration, t + 0.1));
      }
    },
    [mode, duration],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Playback loop
  useEffect(() => {
    if (!playing || mode !== 'playback') return;
    const interval = setInterval(() => {
      setCurrentTime((t) => {
        const next = t + 0.05;
        return next >= duration ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing, mode, duration]);

  const progressPercent = (currentTime / duration) * 100;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0d0d0d',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {/* Preview area */}
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        {mode === 'rendered' && mp4Url ? (
          <video
            src={mp4Url}
            controls
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onLoadedMetadata={() => onRenderReady?.(mp4Url)}
          />
        ) : (
          <iframe
            ref={iframeRef}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'transparent',
            }}
            sandbox="allow-scripts allow-same-origin"
            title="Video preview"
          />
        )}

        {/* Render progress overlay */}
        {renderProgress && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '8px 16px',
              background: 'rgba(0,0,0,0.8)',
              color: '#fff',
              fontSize: 12,
              fontFamily: 'monospace',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Rendering...</span>
            <span>
              Frame {renderProgress.frame}/{renderProgress.totalFrames}
            </span>
          </div>
        )}
      </div>

      {/* Timeline controls */}
      {mode === 'playback' && (
        <div
          style={{
            height: 40,
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#1a1a1a',
            borderTop: '1px solid #333',
          }}
        >
          {/* Play/Pause */}
          <button
            onClick={() => setPlaying(!playing)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 16,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '⏸' : '▶'}
          </button>

          {/* Time display */}
          <span
            style={{
              color: '#999',
              fontFamily: 'monospace',
              fontSize: 12,
              minWidth: 80,
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          {/* Scrubber */}
          <div
            style={{
              flex: 1,
              height: 4,
              background: '#333',
              borderRadius: 2,
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              setCurrentTime(pct * duration);
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: '#58a6ff',
                borderRadius: 2,
                transition: playing ? 'none' : 'width 0.1s',
              }}
            />
          </div>

          {/* Duration */}
          <span
            style={{
              color: '#666',
              fontFamily: 'monospace',
              fontSize: 12,
              minWidth: 50,
              textAlign: 'right',
            }}
          >
            {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}
