import { CSSProperties, ReactNode } from "react";
import { SelfHostedVideo, type VideoTrack } from "./VideoSelfHosted";

export type { VideoTrack } from "./VideoSelfHosted";

/* ============================================================
   Video — single component fronting three sources: YouTube embed,
   Vimeo embed, and self-hosted video files. URL parsing at render
   time picks the right shape: a YouTube or Vimeo URL becomes an
   iframe with the right embed parameters; anything else delegates
   to SelfHostedVideo, a small client component that layers a
   branded play button overlay on the native <video> element until
   the user starts playback.

   The iframe path stays server-renderable; only the self-hosted
   path crosses into the client.

   `tracks` (WebVTT captions) only reaches the self-hosted branch;
   the platform players carry their own captions. It is unrelated to
   `caption`, which is a visible figcaption under the frame.
   ============================================================ */

type VideoAspect = "16x9" | "4x3" | "1x1" | "21x9";

export interface VideoProps {
  src: string;
  aspect?: VideoAspect;
  poster?: string;
  caption?: string;
  title?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  /**
   * WebVTT text tracks for self-hosted files, rendered as <track> children of
   * the <video>. YouTube and Vimeo embeds ignore it and carry their own
   * platform captions. Unrelated to `caption`, which is a visible figcaption
   * below the frame. Captions are only reachable through the native control
   * surface, so a non-empty list coerces `controls` on, overriding
   * controls={false}; a track with `default` shows without user action. An
   * absolute track URL sets crossOrigin="anonymous" on the <video>, which puts
   * the video file itself in CORS mode: a cross-origin video host must then
   * send Access-Control-Allow-Origin or the clip fails to load.
   */
  tracks?: VideoTrack[];
}

const aspectRatioMap: Record<VideoAspect, string> = {
  "16x9": "16 / 9",
  "4x3": "4 / 3",
  "1x1": "1 / 1",
  "21x9": "21 / 9",
};

// Extract a YouTube video id from any of the URL shapes the platform uses:
// youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>,
// youtube.com/shorts/<id>. Returns null when no id can be parsed.
function parseYouTubeId(src: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Vimeo URLs are simpler: vimeo.com/<id> or player.vimeo.com/video/<id>.
function parseVimeoId(src: string): string | null {
  const patterns = [
    /(?:vimeo\.com\/)(?!video\/)(\d+)/,
    /(?:player\.vimeo\.com\/video\/)(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = src.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function Video({
  src,
  aspect = "16x9",
  poster,
  caption,
  title,
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  tracks,
}: VideoProps) {
  // Autoplay requires muted on every modern browser; force it so the iframe
  // actually plays rather than silently failing.
  const effectiveMuted = autoplay ? true : muted;

  const youTubeId = parseYouTubeId(src);
  const vimeoId = youTubeId ? null : parseVimeoId(src);

  const frameStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: aspectRatioMap[aspect],
    borderRadius: "var(--component-radius)",
    overflow: "hidden",
    background: "var(--background-positive-secondary)",
  };

  const mediaStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: 0,
  };

  const iframeTitle = title ?? "Video player";

  let media: ReactNode;
  if (youTubeId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      mute: effectiveMuted ? "1" : "0",
      loop: loop ? "1" : "0",
      controls: controls ? "1" : "0",
      ...(loop ? { playlist: youTubeId } : {}),
    });
    media = (
      <iframe
        src={`https://www.youtube.com/embed/${youTubeId}?${params.toString()}`}
        title={iframeTitle}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={mediaStyle}
      />
    );
  } else if (vimeoId) {
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      muted: effectiveMuted ? "1" : "0",
      loop: loop ? "1" : "0",
      controls: controls ? "1" : "0",
    });
    media = (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoId}?${params.toString()}`}
        title={iframeTitle}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={mediaStyle}
      />
    );
  } else {
    media = (
      <SelfHostedVideo
        src={src}
        poster={poster}
        controls={controls}
        autoplay={autoplay}
        loop={loop}
        muted={effectiveMuted}
        title={title}
        tracks={tracks}
      />
    );
  }

  if (caption) {
    return (
      <figure style={figureStyle}>
        <div style={frameStyle}>{media}</div>
        <figcaption style={captionStyle}>{caption}</figcaption>
      </figure>
    );
  }

  return <div style={frameStyle}>{media}</div>;
}

const figureStyle: CSSProperties = {
  margin: 0,
  display: "flex",
  flexDirection: "column",
  // gap owns the frame/caption spacing (the parent is already flex); a caption
  // margin was doing gap's job (audit).
  gap: "var(--space-xs)",
};

const captionStyle: CSSProperties = {
  fontFamily: "var(--font-code)",
  fontSize: "var(--type-xs)",
  color: "var(--text-positive-tertiary)",
  textAlign: "center",
  maxWidth: "var(--measure-prose)", // was 60ch: the reading measure (pass 4, 27 Aug 2026)
  marginInline: "auto",
};
