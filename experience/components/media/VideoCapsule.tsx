"use client";

/**
 * KUDOS . VideoCapsule . Real <video> playback with poster fallback.
 *
 * Drop a local file at /public/capsules/<id>.mp4 and pass its path as
 * `videoSrc` to enable real playback. With no videoSrc, the component
 * renders a poster with ken-burns motion and treats the play badge as
 * a visual affordance.
 *
 * Hook contract (intentional · no external deps):
 *   - props.videoSrc        optional local path (e.g. "/capsules/coliseo.mp4")
 *   - props.posterUrl       poster image · always rendered as <video poster>
 *   - props.duration        "0:15" badge string
 *   - props.aspectRatio     CSS aspect-ratio string · default "16/10"
 *   - props.autoPlayOnView  true → IntersectionObserver triggers muted autoplay
 *   - props.objectPosition  CSS object-position · default "center"
 *   - props.children        absolute-positioned overlays (chips, gradients…)
 *
 * No store / route / hook contracts touched.
 */
import * as React from "react";
import { Icon } from "@/design-system/v2";

export interface VideoCapsuleProps {
  posterUrl: string;
  videoSrc?: string;
  duration?: string;
  aspectRatio?: string;
  autoPlayOnView?: boolean;
  controls?: boolean;
  objectPosition?: string;
  rounded?: number;
  ariaLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function VideoCapsule({
  posterUrl,
  videoSrc,
  duration,
  aspectRatio = "16/10",
  autoPlayOnView = false,
  controls = false,
  objectPosition = "center",
  rounded,
  ariaLabel,
  className,
  children,
}: VideoCapsuleProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [showOverlay, setShowOverlay] = React.useState(true);

  // IntersectionObserver-driven autoplay (muted) for hero capsules
  React.useEffect(() => {
    if (!autoPlayOnView || !videoSrc) return;
    const node = wrapRef.current;
    const vid = videoRef.current;
    if (!node || !vid) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > 0.5) {
          vid.muted = true;
          vid.play().then(() => {
            setPlaying(true);
            setShowOverlay(false);
          }).catch(() => { /* autoplay blocked · keep poster · user can click to play */ });
        } else {
          vid.pause();
          setPlaying(false);
          setShowOverlay(true);
        }
      }
    }, { threshold: [0, 0.5, 1] });
    io.observe(node);
    return () => io.disconnect();
  }, [autoPlayOnView, videoSrc]);

  // Sync state to native <video> events (handles browser-initiated play/pause,
  // playsinline OS controls, autoplay success/failure paths).
  // P13 · INSTRUMENTED · removes when bug confirmed.
  React.useEffect(() => {
    const vid = videoRef.current;
    console.info("[KUDOS] VideoCapsule mount · videoSrc =", videoSrc, "· vid =", !!vid);
    if (!vid || !videoSrc) return;
    const onPlay  = () => { console.info("[KUDOS] VIDEO_PLAY",  videoSrc); setPlaying(true);  setShowOverlay(false); };
    const onPause = () => { console.info("[KUDOS] VIDEO_PAUSE", videoSrc); setPlaying(false); setShowOverlay(true);  };
    const onEnded = () => { console.info("[KUDOS] VIDEO_ENDED", videoSrc); setPlaying(false); setShowOverlay(true);  };
    const onWaiting        = () => console.info("[KUDOS] VIDEO_WAITING",       videoSrc);
    const onCanPlay        = () => console.info("[KUDOS] VIDEO_CANPLAY",       videoSrc, "· readyState =", vid.readyState);
    const onLoadedMetadata = () => console.info("[KUDOS] VIDEO_LOADEDMETADATA", videoSrc, "· duration =", vid.duration);
    const onError          = () => console.error("[KUDOS] VIDEO_ERROR",        videoSrc, "· error =", vid.error);
    vid.addEventListener("play",            onPlay);
    vid.addEventListener("pause",           onPause);
    vid.addEventListener("ended",           onEnded);
    vid.addEventListener("waiting",         onWaiting);
    vid.addEventListener("canplay",         onCanPlay);
    vid.addEventListener("loadedmetadata",  onLoadedMetadata);
    vid.addEventListener("error",           onError);
    return () => {
      vid.removeEventListener("play",            onPlay);
      vid.removeEventListener("pause",           onPause);
      vid.removeEventListener("ended",           onEnded);
      vid.removeEventListener("waiting",         onWaiting);
      vid.removeEventListener("canplay",         onCanPlay);
      vid.removeEventListener("loadedmetadata",  onLoadedMetadata);
      vid.removeEventListener("error",           onError);
    };
  }, [videoSrc]);

  const togglePlay = (e: React.MouseEvent | React.SyntheticEvent) => {
    const vid = videoRef.current;
    console.info("[KUDOS] togglePlay ENTERED · videoSrc =", videoSrc, "· vidRef.current =", !!vid, "· eventType =", e.type, "· target =", (e.target as HTMLElement)?.tagName);
    if (!videoSrc || !vid) {
      console.warn("[KUDOS] togglePlay EARLY-RETURN · videoSrc =", videoSrc, "· vid =", !!vid);
      return;
    }
    console.info("[KUDOS] togglePlay preventDefault + stopPropagation · defaultPrevented BEFORE =", e.defaultPrevented);
    e.preventDefault();
    e.stopPropagation();
    console.info("[KUDOS] togglePlay defaultPrevented AFTER =", e.defaultPrevented, "· vid.paused =", vid.paused, "· vid.ended =", vid.ended, "· readyState =", vid.readyState);
    if (vid.paused || vid.ended) {
      console.info("[KUDOS] togglePlay calling vid.play()");
      const p = vid.play();
      console.info("[KUDOS] vid.play() returned · is promise =", p && typeof p.then === "function");
      if (p && typeof p.then === "function") {
        p.then(() => {
          console.info("[KUDOS] vid.play() RESOLVED");
          setPlaying(true);
          setShowOverlay(false);
        }).catch((err) => {
          console.error("[KUDOS] vid.play() REJECTED ·", err?.name, "·", err?.message, "·", err);
          setPlaying(false);
          setShowOverlay(true);
        });
      }
    } else {
      console.info("[KUDOS] togglePlay calling vid.pause()");
      vid.pause();
      setPlaying(false);
      setShowOverlay(true);
    }
  };

  // Force a clean local stacking context so child z-indexes can never be
  // re-ordered by an ancestor (e.g. transformed parent / will-change).
  const wrapStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio,
    overflow: "hidden",
    borderRadius: rounded,
    background: "#0E0828",
    isolation: "isolate",
  };

  // P13.1 · render-time state snapshot · proves what the DOM actually sees
  console.info(
    "[KUDOS] RENDER · videoSrc =", videoSrc,
    "· playing =", playing,
    "· showOverlay =", showOverlay,
    "· posterOpacity =", playing ? 0 : 1,
    "· videoOpacity =", playing ? 1 : 0,
    "· posterDisplay =", playing ? "none" : "block",
  );

  const mediaStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition,
  };

  const posterFallback: React.CSSProperties = {
    ...mediaStyle,
    backgroundImage: `url("${posterUrl}")`,
    backgroundSize: "cover",
    backgroundPosition: objectPosition,
    backgroundRepeat: "no-repeat",
  };

  return (
    <div
      ref={wrapRef}
      className={`kudos-video-capsule kudos-media ${className ?? ""}`}
      style={wrapStyle}
      aria-label={ariaLabel}
    >
      {/* 1. POSTER · painted FIRST (bottom layer) · HARD-REMOVED when playing
            to eliminate every stacking-context / paint-order edge case. */}
      <div
        aria-hidden
        className={`kudos-media-cover ${playing ? "" : "kudos-kenburns"}`}
        style={{
          ...posterFallback,
          zIndex: 1,
          opacity: playing ? 0 : 1,
          display: playing ? "none" : "block",
          transition: "opacity 220ms ease",
          pointerEvents: "none",
        }}
      />

      {/* 2. VIDEO · painted SECOND (on top of poster when playing)
            · z=10 so it always wins paint order in this stacking context. */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterUrl}
          muted
          playsInline
          loop
          preload="metadata"
          controls={controls}
          style={{
            ...mediaStyle,
            zIndex: 10,
            opacity: playing ? 1 : 0,
            transition: "opacity 220ms ease",
            pointerEvents: "none",
            background: "transparent",
          }}
          aria-hidden={!playing}
        />
      ) : null}

      {/* 3. PAUSE OVERLAY · full-surface invisible click target when playing
            · lets user click anywhere to pause without losing link nav when paused */}
      {playing && videoSrc ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Pausar capsula"
          style={PAUSE_OVERLAY}
        />
      ) : null}

      {/* 4. DURATION BADGE · only visible when not playing */}
      {duration && !playing ? (
        <span style={PLAY_BADGE}>
          <Icon name="play" size={10} />
          <span>{duration}</span>
        </span>
      ) : null}

      {/* 5. CENTER PLAY BUTTON · always rendered, fades out when playing
            · stays clickable when paused (videoSrc → real play) */}
      <button
        type="button"
        onPointerDown={(e) => console.info("[KUDOS] PLAY_BUTTON_POINTERDOWN · target =", (e.target as HTMLElement)?.tagName, "· videoSrc =", videoSrc)}
        onClickCapture={(e) => console.info("[KUDOS] PLAY_BUTTON_CLICKCAPTURE · phase = capture · videoSrc =", videoSrc, "· defaultPrevented =", e.defaultPrevented)}
        onClick={(e) => { console.info("[KUDOS] PLAY_BUTTON_CLICK · phase = bubble · defaultPrevented BEFORE togglePlay =", e.defaultPrevented); togglePlay(e); }}
        aria-label={videoSrc ? (playing ? "Pausar capsula" : "Reproducir capsula") : "Reproducir capsula"}
        style={{
          ...PLAY_BTN,
          opacity: playing ? 0 : 1,
          pointerEvents: playing ? "none" : (videoSrc ? "auto" : "none"),
          ...(videoSrc ? {} : { cursor: "default", opacity: playing ? 0 : 0.85 }),
        }}
        className={videoSrc ? "kudos-play-pulse" : ""}
      >
        <Icon name="play" size={22} />
      </button>

      {children}
    </div>
  );
}

const PLAY_BADGE: React.CSSProperties = {
  position: "absolute",
  top: 12, left: 12,
  zIndex: 3,
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "5px 10px",
  borderRadius: 999,
  background: "rgba(10,6,18,0.82)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--kudos-ink, #F2F2F7)",
  fontSize: 11,
  fontWeight: 500,
  fontFamily: "var(--kudos-font-body)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  pointerEvents: "none",
};

const PLAY_BTN: React.CSSProperties = {
  position: "absolute",
  top: "50%", left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 12,
  width: 64, height: 64,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.22)",
  border: "2px solid rgba(255,255,255,0.42)",
  color: "#fff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(6px) saturate(140%)",
  WebkitBackdropFilter: "blur(6px) saturate(140%)",
  boxShadow: "0 14px 32px -10px rgba(0,0,0,0.55)",
  transition: "transform 180ms cubic-bezier(0.2,0.8,0.2,1), background 180ms",
};

const PAUSE_OVERLAY: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 11,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  padding: 0,
  margin: 0,
};
