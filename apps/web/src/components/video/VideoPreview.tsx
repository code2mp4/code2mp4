'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * VideoPreview — sandboxed player for HyperFrames compositions and rendered MP4s.
 *
 * Modes:
 *   "design"   — <hyperframes-player> web component (timeline, seek, GSAP playback)
 *   "rendered" — <video> tag for final MP4
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'hyperframes-player': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          srcdoc?: string;
          controls?: boolean;
          muted?: boolean;
          autoplay?: boolean;
          loop?: boolean;
          width?: number;
          height?: number;
          ref?: React.Ref<HyperframesPlayerElement>;
        },
        HTMLElement
      >;
    }
  }
}

interface HyperframesPlayerElement extends HTMLElement {
  play(): void;
  pause(): void;
  seek(time: number): void;
  currentTime: number;
  duration: number;
  paused: boolean;
  ready: boolean;
  muted: boolean;
  loop: boolean;
}

export interface VideoPreviewProps {
  html?: string;
  mp4Url?: string;
  mode?: 'design' | 'rendered';
  duration?: number;
  onRenderReady?: (url: string) => void;
}

export function VideoPreview({
  html,
  mp4Url,
  mode = 'design',
  duration = 10,
  onRenderReady,
}: VideoPreviewProps) {
  const playerRef = useRef<HyperframesPlayerElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [playing, setPlaying] = useState(false);

  // Handle player ready
  const handleReady = useCallback(() => {
    setReady(true);
    if (playerRef.current) {
      setTotalDuration(playerRef.current.duration || duration);
    }
  }, [duration]);

  // Listen for timeupdate from player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onReady = () => handleReady();
    const onTime = () => setCurrentTime(player.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    player.addEventListener('ready', onReady);
    player.addEventListener('timeupdate', onTime);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onEnded);

    return () => {
      player.removeEventListener('ready', onReady);
      player.removeEventListener('timeupdate', onTime);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onEnded);
    };
  }, [handleReady]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        if (playerRef.current?.ready) {
          if (playerRef.current.paused) playerRef.current.play();
          else playerRef.current.pause();
        } else if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSeek = useCallback((pct: number) => {
    const t = pct * totalDuration;
    setCurrentTime(t);
    if (playerRef.current?.ready) {
      playerRef.current.seek(t);
    } else if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
  }, [totalDuration]);

  const handleTogglePlay = useCallback(() => {
    if (playerRef.current?.ready) {
      if (playerRef.current.paused) playerRef.current.play();
      else playerRef.current.pause();
    } else if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  }, []);

  const pct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div style={styles.root}>
      {/* Preview area */}
      <div style={styles.viewport}>
        {mode === 'rendered' && mp4Url ? (
          <video
            ref={videoRef}
            src={mp4Url}
            controls
            style={styles.media}
            onLoadedMetadata={() => {
              if (videoRef.current) setTotalDuration(videoRef.current.duration);
              onRenderReady?.(mp4Url);
            }}
            onTimeUpdate={() => {
              if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        ) : html ? (
          <hyperframes-player
            ref={playerRef as React.Ref<HyperframesPlayerElement>}
            srcdoc={html}
            controls={false}
            muted={true}
            style={styles.media}
          />
        ) : (
          <div style={styles.empty}>
            <span style={{ fontSize: 40 }}>🎬</span>
            <p style={{ color: 'var(--muted)', marginTop: 12 }}>Preview area</p>
          </div>
        )}
      </div>

      {/* Timeline controls */}
      {(html || mp4Url) && (
        <div style={styles.controls}>
          <button onClick={handleTogglePlay} style={styles.ctrlBtn} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '⏸' : '▶'}
          </button>

          <span style={styles.timeCode}>
            {fmt(currentTime)} / {fmt(totalDuration)}
          </span>

          <div
            style={styles.scrubber}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              handleSeek((e.clientX - rect.left) / rect.width);
            }}
          >
            <div style={{ ...styles.scrubFill, width: `${pct}%` }} />
            <div style={{ ...styles.scrubHandle, left: `${pct}%` }} />
          </div>

          <span style={styles.durLabel}>{fmt(totalDuration)}</span>

          <span style={styles.modeLabel}>
            {mode === 'rendered' ? 'MP4' : 'HF Player'}
          </span>
        </div>
      )}
    </div>
  );
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  },
  viewport: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 0, position: 'relative',
  },
  media: {
    width: '100%', height: '100%', border: 'none', objectFit: 'contain' as const,
  },
  empty: {
    textAlign: 'center' as const, color: 'var(--muted)',
  },
  controls: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 16px', background: 'var(--surface)',
    borderTop: '1px solid var(--border)', flexShrink: 0,
    height: 40,
  },
  ctrlBtn: {
    background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer',
    fontSize: 14, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 'var(--radius-sm)',
  },
  timeCode: {
    color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 70,
  },
  scrubber: {
    flex: 1, height: 4, background: 'var(--border)', borderRadius: 2,
    cursor: 'pointer', position: 'relative',
  },
  scrubFill: {
    height: '100%', background: 'var(--accent)', borderRadius: 2,
    transition: 'width 0.1s linear',
  },
  scrubHandle: {
    position: 'absolute', top: -4, width: 12, height: 12,
    borderRadius: '50%', background: 'var(--accent)',
    transform: 'translateX(-50%)',
    transition: 'left 0.1s linear',
    pointerEvents: 'none',
  },
  durLabel: {
    color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 11, minWidth: 50, textAlign: 'right',
  },
  modeLabel: {
    color: 'var(--muted)', fontSize: 9, fontFamily: 'var(--font-mono)',
    background: 'var(--surface-hover)', padding: '2px 6px', borderRadius: 'var(--radius-xs)',
  },
};
