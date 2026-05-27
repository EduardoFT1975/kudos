/**
 * KUDOS · Capsule Engine · Provider barrel.
 *
 * Re-exports the real production HTTP clients · no stubs.
 * Each provider lives in its own file with its real fetch + retry + polling.
 *
 *   claude.ts    · Anthropic Messages API (story + shot list + VTT)
 *   flux.ts      · Replicate FLUX 1.1 [pro] (hero stills)
 *   kling.ts     · PiAPI Kling 2.1 Master (image-to-video, async + polling)
 *   cartesia.ts  · Cartesia Sonic-2 TTS (narration)
 *   music.ts     · Local Epidemic Sound library (mood lookup)
 *   ffmpeg.ts    · child_process ffmpeg (concat + mix + subs + thumb)
 *   r2.ts        · Cloudflare R2 via AWS SigV4 (no SDK)
 *
 * The orchestrator imports from this barrel, so swapping individual
 * providers (e.g. Kling → Runway) is a single-file edit.
 */
export { callClaudeStory }    from "./claude";
export { callFluxImage }      from "./flux";
export { callKlingVideo }     from "./kling";
export { callCartesiaVoice }  from "./cartesia";
export { callMusicSelect }    from "./music";
export { callFfmpegCompose }  from "./ffmpeg";
export { callR2Upload }       from "./r2";
