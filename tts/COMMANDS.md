# TTS Server Commands

## Starting the Server

```bash
cd tts
./venv/bin/python server.py
```

The server starts on `http://127.0.0.1:8031` (configurable via `SERVER` in `client.py`).

On first run it loads the ChatterboxTTS model onto GPU and computes conditionals from `sydney.wav` (saved to `conditionals.pt` for subsequent runs).

---

## Health Check

```bash
curl http://127.0.0.1:8031/health
```

Returns `{"status": "ok", "device": "cuda"}`.

---

## HTTP Synthesis

```bash
curl -X POST http://127.0.0.1:8031/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world."}' \
  -o output.wav
```

### SynthesizeRequest Parameters

| Parameter | Type | Default | Range | Description |
|---|---|---|---|---|
| `text` | string | *(required)* | — | The text to synthesize |
| `quality_preset` | string | `"balanced"` | `"natural"`, `"balanced"`, `"expressive"` | Quality preset (see below) |
| `sentence_pause_ms` | int | `140` | 0–500 | Pause between sentences in milliseconds |
| `exaggeration` | float | *from preset* | 0.1–1.5 | Speech exaggeration level |
| `cfg_weight` | float | *from preset* | 0.1–1.5 | Classifier-free guidance weight |
| `temperature` | float | *from preset* | 0.3–1.5 | Sampling temperature |
| `repetition_penalty` | float | *from preset* | 1.0–2.0 | Repetition penalty |
| `top_p` | float | *from preset* | 0.5–1.0 | Nucleus sampling threshold |
| `min_p` | float | *from preset* | 0.01–0.5 | Minimum probability threshold |

Any parameter not specified uses its preset default. Explicit values override the preset.

### Quality Presets

| Preset | exaggeration | cfg_weight | temperature | repetition_penalty | top_p | min_p |
|---|---|---|---|---|---|---|
| `natural` | 0.35 | 0.72 | 0.58 | 1.2 | 0.92 | 0.10 |
| `balanced` | 0.45 | 0.62 | 0.64 | 1.2 | 0.93 | 0.09 |
| `expressive` | 0.70 | 0.45 | 0.78 | 1.15 | 0.95 | 0.07 |

Examples:

```bash
# Natural quality
curl -X POST http://127.0.0.1:8031/synthesize -H "Content-Type: application/json" \
  -d '{"text": "Hello world.", "quality_preset": "natural"}' -o output.wav

# Expressive with custom temperature
curl -X POST http://127.0.0.1:8031/synthesize -H "Content-Type: application/json" \
  -d '{"text": "Hello world.", "quality_preset": "expressive", "temperature": 0.85}' -o output.wav
```

---

## Socket.IO Synthesis (streaming)

The server also emits events for incremental chunk synthesis:

**Client emits:**
- `synthesize` — `{text, quality_preset, ...params}`

**Server responds on the same socket with:**
- `synthesis_started` — `{chunks, sample_rate, quality_preset}`
- `chunk_started` — `{index, text}` (per chunk)
- `audio_chunk` — `{index, audio: bytes}` (per chunk)
- `chunk_done` — `{index}` (per chunk)
- `synthesis_done` — `{chunks}`
- `synthesis_error` — `{detail}` (on failure)

```bash
tts/venv/bin python client.py "Hello world."
```

### Client CLI Arguments

```bash
python client.py [natural|balanced|expressive] <text>
python client.py socketio [natural|balanced|expressive] <text>
```

| Positional | Default | Description |
|---|---|---|
| `natural`, `balanced`, `expressive` | `expressive` | Quality preset |
| `<text>` | `"Hello, this is a test..."` | Text to synthesize |

Omit all arguments to use the default text with `expressive` preset and HTTP transport. Prefix with `socketio` (or `io`) to use the streaming Socket.IO transport instead of HTTP.

---

## Known Issues

- No error message from the server when the text is empty, it just fails silently.
- No error message from the server when an invalid quality preset is used, it just fails silently with a non-informative error.
