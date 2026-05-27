# KUDOS Capsule Engine · Architecture (P23)

> Premium short-form AI capsule generation infrastructure.
> Production-grade. No mocks. No stubs. No fallback theatre.

---

## 1. Architecture · the 7 components

```
                       BRAIN (editorial-brain.ts)
                              │ BrainDecision[]
                              ▼
            ┌────────────────────────────────────┐
            │     capsule-orchestrator.ts        │  top-level coordinator
            └────────────┬───────────────────────┘
                         │ per-tier pipeline
   ┌─────────────────────┼─────────────────────────────┐
   ▼                     ▼                             ▼
┌──────────┐    ┌────────────────┐         ┌──────────────────┐
│ STORY    │ ─► │ VISUAL PROMPT  │ ─────►  │ QC · pre-render  │  (LLM-judge)
│ DIRECTOR │    │ ENGINE         │         │  score script    │  reject → reroll
└────┬─────┘    └────────┬───────┘         └────────┬─────────┘
     │                   │                          │ pass
     │ shotPlan          │ promptBundle             ▼
     ▼                   ▼               ┌────────────────────┐
                                         │ VIDEO ORCHESTRATOR │  Kling/Runway/Pika/Luma
                                         │   per-shot calls   │  consistency · reroll
                                         └────────┬───────────┘
                                                  │ shot mp4s + still hero
                                                  ▼
                ┌─────────────────────┐  ┌──────────────────┐
                │  VOICE ENGINE       │  │  SOUND DESIGN    │
                │ Cartesia · personas │  │  music + SFX     │
                └────────┬────────────┘  └────────┬─────────┘
                         │ voice.wav             │ score.wav + sfx.wav
                         └────────┬──────────────┘
                                  ▼
                       ┌──────────────────────┐
                       │     COMPOSITOR       │  ffmpeg graph
                       │   final mp4 + vtt    │  branding · thumbnail
                       └──────────┬───────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │  QC · post-render    │  vision frames + heuristic
                       │  score capsule       │  reject → reroll N times
                       └──────────┬───────────┘
                                  │ pass
                                  ▼
                       ┌──────────────────────┐
                       │   STORAGE (R2/CDN)   │  + Postgres row
                       └──────────┬───────────┘
                                  │ shipped
                                  ▼
                          KUDOS HOME FEED
                                  │
                              48h later
                                  ▼
                       ┌──────────────────────┐
                       │  QC · engagement     │  watch-through + share
                       │  retroactive score   │  feeds future calibration
                       └──────────────────────┘
```

### Component responsibilities

| Module | Inputs | Outputs | External calls |
|---|---|---|---|
| `story-director.ts` | `BrainDecision`, POI context | `ShotPlan` (hook · escalation · wonder · meaning · close), narrative arc, sources | Claude |
| `visual-prompt-engine.ts` | `ShotPlan` + POI era + style | `PromptBundle` (image/video prompts per shot, palette anchors, motion grammar) | Claude (refinement only) |
| `video-orchestrator.ts` | `PromptBundle`, tier | per-shot `.mp4` + hero `.png` | Kling, Runway, Pika, Luma, FLUX (multi-provider) |
| `voice-engine.ts` | script + language + persona | `voice.wav` + VTT timing | Cartesia (primary), ElevenLabs (fallback) |
| `sound-design.ts` | `musicMood`, scene atmospherics | `score.wav`, `sfx.wav` | Music library API, ElevenLabs SFX |
| `compositor.ts` | all assets above | final `.mp4`, `.vtt`, `.png` thumb, `metadata.json` | local ffmpeg, ImageMagick |
| `qc-engine.ts` | script (pre), video frames (post), engagement (retro) | quality score 0-100 + verdict + reroll hints | Claude vision, ffprobe heuristic |

---

## 2. Provider strategy · multi-provider video abstraction

Single `VideoProvider` interface; concrete adapters per vendor. Selection is policy-driven, not call-site.

```ts
interface VideoProvider {
  id: "kling" | "runway" | "pika" | "luma";
  generate(input: VideoGenInput): Promise<VideoGenOutput>;
  capabilities: {
    max_duration_s: number;
    supports_image_to_video: boolean;
    supports_text_to_video: boolean;
    supports_camera_control: boolean;
    cost_per_second_usd: number;
    avg_latency_s: number;
    quality_rank: number;     // 0-100, editor-curated
  };
}
```

**Selection policy (in order):**

1. **Tier-specific preference**: Tier1 LEGEND → Kling 2.1 or Runway Gen-3 (highest quality_rank). Tier2 → Pika or Luma (cheaper). Tier3 → no video (image + ken-burns).
2. **Capability filter**: shot needs camera_control? Filter to providers that support it.
3. **Cost budget**: remaining daily budget vs `cost_per_second × shot_duration × n_shots`. Downgrade provider if over.
4. **Health check**: provider's last-hour error rate. If > 30%, skip to next.
5. **Reroll on different provider**: first attempt Provider A, on QC reject reroll on Provider B (provider diversity beats same-provider retry).

**Fallback chain** (Tier1 example):
`Kling-2.1 → Runway-Gen-3 → Luma-Dream → Pika-1.0 → FLUX-still+ken-burns → skip`

---

## 3. Cost model

### Per-tier budget envelope (USD per capsule)

| Tier | Target | Hard cap | Story | Stills | Video | Voice | Music | Compose | QC |
|---|---|---|---|---|---|---|---|---|---|
| Tier1 LEGEND (60s) | $1.30 | $1.80 | $0.02 | $0.10 | $1.00 | $0.10 | $0.05 | $0.00 | $0.03 |
| Tier2 ICONIC (30s) | $0.20 | $0.30 | $0.01 | $0.05 | $0.10 | $0.03 | $0.00 | $0.00 | $0.01 |
| Tier3 IMPORTANT (15s) | $0.07 | $0.10 | $0.01 | $0.03 | $0.00 | $0.02 | $0.00 | $0.00 | $0.01 |
| Tier4 LONGTAIL | $0.00 | $0.00 | local | local | — | — | — | — | none |

### Daily / monthly governor

* `budget_today_usd` — hard daily cap (default $50)
* `budget_month_usd` — monthly cap (default $500), sliding window
* `spent_month_usd` — read from Postgres aggregate
* Brain queues in priority order; orchestrator stops when `spent + estimated_cost > min(daily_cap, remaining_monthly)`
* On exhaustion: downgrade Tier1→Tier2 before rejecting (P17 governor behavior preserved)

### Soft signals

* Per-provider monthly spend tracking (e.g. "switch from Kling to Runway if Kling > 60% of monthly video spend")
* Cost-per-1k-views post-publish · feeds engagement-based QC

---

## 4. Retry logic

### Per-call retry (provider boundary)

`retry.ts::withRetry` — exponential backoff with jitter:

```
delay_ms = min(MAX_DELAY, BASE * 2^attempt) * (0.5 + Math.random() * 0.5)
```

* `BASE = 500ms`, `MAX_DELAY = 30s`
* HTTP 429 honors `Retry-After` header
* HTTP 5xx retried up to 5 times
* HTTP 4xx (except 408, 425, 429) fails immediately
* Network/timeout retried up to 3 times

### Per-stage retry (capsule boundary)

* Each pipeline stage (story, prompt, video[n], voice, music, compose, qc) is **idempotent** keyed by `(capsule_id, stage_name)`
* Successful stage outputs cached on disk and in Postgres `capsule_stages` table
* Resuming a failed capsule replays from the first non-cached stage
* On reroll-after-QC-reject: only the rejected shot is re-generated (others reused)

### Reroll limits

* Per-shot: 2 rerolls before tier downgrade
* Per-capsule: 1 full reroll cycle before rejection
* On final rejection: capsule status = `qc_failed`, surfaced to manual review

---

## 5. Quality scoring system (4-layer stack)

Two pre-publish gates + two post-publish signals.

### Layer 1 · Pre-render: LLM-as-judge (script + storyboard)

Claude scores the story BEFORE any image/video money is spent.

Rubric (0-10 each):
* `hook_strength` — does the first sentence create curiosity?
* `narrative_arc` — hook → escalation → wonder → meaning → close all present?
* `factual_grounding` — sources cited? Claims defensible?
* `voice_distinctiveness` — does this sound like KUDOS or generic?
* `visual_concretness` — shot prompts paint specific images, not vague vibes?
* `emotional_payoff` — meaning earned by close?

Reject if any single score < 4 OR total < 36/60. Reroll script before rendering.

### Layer 2 · Post-render: Heuristic (deterministic ffprobe + audio)

Pure signal analysis, no AI:
* `motion_intensity` (optical-flow average) — > 5 px/frame on avg
* `scene_change_rate` — between 0.3 and 2.0 cuts/sec
* `black_frame_pct` — < 2%
* `audio_lufs` — -16 LUFS ± 2 (mobile-feed normalized)
* `voice_overlap_with_music` — voice peaks > music peaks by 6dB
* `subtitle_drift_ms` — < 200ms vs voice waveform alignment

Hard rejects: anything that violates a "must" threshold.

### Layer 3 · Post-render: Claude vision (frame sampling)

Sample N=5 frames at semantic moments (hook, escalation peak, wonder, meaning, close). Send to Claude multimodal with rubric:

* `composition_quality` 0-10 — rule of thirds, depth, focal clarity
* `motion_quality` 0-10 — smooth, no morphing artifacts (compare adjacent frames)
* `narrative_coherence` 0-10 — does frame match shot intent in `ShotPlan`?
* `brand_premium` 0-10 — does this look like KUDOS or generic stock?

Reject if total < 28/40 OR any < 5.

### Layer 4 · Post-publish: engagement-based learned signal

After 48h of feed exposure:

```
engagement_quality_score =
    0.40 * watch_through_rate
  + 0.25 * share_rate
  + 0.20 * save_rate
  + 0.15 * (positive_comments / total_comments)
```

Used for:
* Retroactive scoring (calibrate vision rubric)
* Future Engine 3 momentum signal (high-engagement capsules → POI rises faster)
* A/B testing reroll thresholds (does stricter QC actually improve engagement?)

### Final score blending (pre-publish gate)

```
quality_gate_score =
    0.20 * llm_judge_total / 60
  + 0.40 * heuristic_pass_rate
  + 0.40 * vision_total / 40

publish if score >= 0.70 AND no hard-reject
```

---

## 6. Rendering pipeline

Single ffmpeg graph composition. Stages:

```
1. Concatenate shot mp4s        (concat demuxer, lossless)
2. Mix voice over video         (acopy + amix)
3. Mix music UNDER voice        (sidechain compressor on music when voice present)
4. Add SFX cues                 (specific timestamps from sound-design output)
5. Burn-in subtitles            (force_style="Helvetica,28,outline=1,shadow=1")
6. Add KUDOS bug                (overlay PNG, bottom-right, 96px, opacity 0.7)
7. Generate thumbnail           (frame at 30% mark, sharpened, captioned)
8. Output: 1080x1920 vertical mp4 (target 6-12 Mbps), .vtt sidecar, .png thumb
```

Parallelism:
* Shot generation: parallel across shots (rate-limited by provider)
* Voice + music + thumbnail: parallel
* Final compose: serial (single ffmpeg invocation)

---

## 7. Async queue design

Brain → queue → workers.

* **Queue layer**: Postgres `capsule_jobs` table with `(status, priority_score, scheduled_for)` index. No external queue dep for v1; migrate to Redis/SQS later.
* **Worker pool**: per-tier concurrency limits
  * Tier1: 2 concurrent (video providers are slow + expensive)
  * Tier2: 4 concurrent
  * Tier3: 8 concurrent
  * Tier4: 16 concurrent (cheap)
* **Priority lanes**: brain emits `priority_score`; workers pull `ORDER BY priority_score DESC, scheduled_for ASC`
* **Dead letter queue**: 3 hard failures → move to `capsule_jobs_dead` for manual review
* **Idempotency**: `SELECT FOR UPDATE SKIP LOCKED` prevents two workers grabbing same job
* **Heartbeat**: workers update `worker_last_heartbeat` every 30s; orphaned jobs (no heartbeat 5min) returned to queue

---

## 8. Storage & CDN design

* **Source of truth**: Cloudflare R2 bucket `kudos-capsules`
* **CDN**: Cloudflare CDN in front of R2, signed URL on every fetch
* **Key naming**: `{tier}/{poi_id}/{capsule_id}/{asset}.{ext}`
  * `tier1_legend/coliseo/cap-coliseo-v3/video.mp4`
  * `tier1_legend/coliseo/cap-coliseo-v3/thumb.png`
  * `tier1_legend/coliseo/cap-coliseo-v3/voice.wav`
  * `tier1_legend/coliseo/cap-coliseo-v3/metadata.json`
* **Content-Type**: explicit per asset; video must be `video/mp4` for iOS inline playback
* **Cache headers**: `Cache-Control: public, max-age=86400, immutable` (capsules are content-addressed by `capsule_id`)
* **Retention**: LEGEND never deleted. ICONIC kept 1 year. IMPORTANT 90 days. LONGTAIL 30 days (then archived to cold storage).
* **Signed URLs**: 1-hour expiry for video, 24h for thumbs (thumbs are CDN-cacheable, video has stricter abuse model)

---

## 9. Failure recovery

### Capsule-level

* `capsule_id` is stable across all retries → idempotent
* `capsule_stages` table tracks `(capsule_id, stage_name, status, output_blob, attempt)`
* On worker restart: scan WIP rows, resume from latest cached stage
* On full failure: capsule moved to dead queue with full stage history for manual debug

### Provider-level

* Each provider client wraps fetch with `withRetry`; surfaces structured errors
* Provider health table updates on every call (error_rate, p50_latency, p99_latency)
* Circuit breaker: provider with > 50% error rate for last 5min is "tripped" for 60s before retry

### Asset-level

* All assets staged to local `/tmp` first
* On compose success: upload to R2 with `If-None-Match: *` (prevent overwrite if already exists)
* On upload failure: retry 3× then move to dead queue with assets retained locally

### Cost-leak guard

* Per-stage cost recorded BEFORE downstream call
* If actual spend > 1.5× estimated → halt capsule, alert
* Daily budget guard: hard stop at 110% of daily cap (10% slack for in-flight)

---

## 10. Demo execution flow

For Coliseo LEGEND, 60s capsule, May 26:

```
T+0     Brain emits BrainDecision · capsule_id=cap-coliseo-2025-05-26
T+0     capsule-orchestrator pulls from queue · acquires worker
T+1     story-director.plan()  → callClaude → ShotPlan (5 shots, hook + 4)
T+8     qc-engine.judgeScript() → LLM judge 52/60 · PASS
T+8     visual-prompt-engine.build() → 5 image_prompts + 5 video_prompts + palette
T+10    video-orchestrator: dispatches 5 parallel shot jobs
        - shot 1 → Kling 2.1 (180s) → cap-shot-1.mp4 ($0.20)
        - shot 2 → Kling 2.1 (180s) → cap-shot-2.mp4 ($0.20)
        - shot 3 → Runway Gen-3 (210s) → cap-shot-3.mp4 ($0.20) [Kling rate-limited]
        - shot 4 → Kling 2.1 (180s) → cap-shot-4.mp4 ($0.20)
        - shot 5 → Kling 2.1 (180s) → cap-shot-5.mp4 ($0.20)
T+200   voice-engine.synth() → Cartesia → voice.wav ($0.10)
T+205   sound-design.score() → music.wav + sfx.wav ($0.05)
T+220   compositor.compose() → ffmpeg graph → final.mp4 + thumb.png + .vtt
T+235   qc-engine.judgeRendered() →
        - heuristic: motion 7.2, lufs -15.8, scene_rate 0.9 · PASS
        - vision: 32/40 (composition 8, motion 8, narrative 9, brand 7) · PASS
        - quality_gate_score = 0.82 · PUBLISH
T+240   r2.upload() → signed URLs returned
T+241   Postgres capsule_rows inserted, status=ready
T+241   Brain feed_composer pulls capsule on next cycle, shown in home feed
T+48h   engagement aggregator updates engagement_quality_score retroactively
```

Total: ~4 minutes wall, $1.15 actual vs $1.30 estimated.

---

## File map

```
lib/capsule-engine/
├── ARCHITECTURE.md                          ← this doc
├── capsule-orchestrator.ts                  ← top-level (replaces P16 orchestrator.ts)
├── story-director.ts                        ← FULLY BUILT (P23)
├── visual-prompt-engine.ts                  ← typed skeleton (P23)
├── video-orchestrator.ts                    ← typed skeleton w/ multi-provider iface (P23)
├── voice-engine.ts                          ← typed skeleton (P23)
├── sound-design.ts                          ← typed skeleton (P23)
├── compositor.ts                            ← typed skeleton (P23)
├── qc-engine.ts                             ← FULLY BUILT (P23)
├── providers/                               ← from P16 · provider clients
│   ├── claude.ts                            ← real Anthropic Messages API
│   ├── flux.ts                              ← real Replicate FLUX
│   ├── kling.ts                             ← real PiAPI Kling 2.1
│   ├── cartesia.ts                          ← real Cartesia Sonic-2
│   ├── music.ts                             ← Epidemic Sound library
│   ├── ffmpeg.ts                            ← local ffmpeg wrapper
│   ├── r2.ts                                ← AWS SigV4 to Cloudflare R2
│   └── index.ts                             ← barrel
├── editorial-brain.ts                       ← from earlier passes
├── feed-composer.ts                         ← from earlier passes
├── engine-0..3-*.ts, engine-{a,b,c}-*.ts    ← from earlier passes
├── orchestrator.ts                          ← P16 LEGACY · being superseded by capsule-orchestrator
├── tier-router.ts                           ← cost governor
└── retry.ts                                 ← exp backoff w/ jitter
```

P16 `orchestrator.ts` stays in-tree as a reference during transition; `capsule-orchestrator.ts` is the new entry point and delegates to the 7 named modules.
