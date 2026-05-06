import sys

import requests
import socketio

SERVER = "http://127.0.0.1:8031"
OUTPUT_PATH = "output.wav"


def synthesize(text: str, quality_preset: str = "expressive"):
    print(f"Synthesizing: {text!r}")
    resp = requests.post(
        f"{SERVER}/synthesize",
        json={"text": text, "quality_preset": quality_preset},
        timeout=120,
    )
    resp.raise_for_status()
    with open(OUTPUT_PATH, "wb") as f:
        f.write(resp.content)
    print(f"Saved {len(resp.content) / 1024:.1f} KB -> {OUTPUT_PATH}")


def synthesize_socketio(text: str, quality_preset: str = "expressive"):
    payload = {"text": text, "quality_preset": quality_preset}
    sio = socketio.Client()
    chunk_count = 0

    @sio.event
    def connect():
        print("Connected to Socket.IO server")
        sio.emit("synthesize", payload)

    @sio.on("synthesis_started")
    def on_synthesis_started(data):
        print(f"Streaming {data['chunks']} chunk(s) with preset={data['quality_preset']}")

    @sio.on("chunk_started")
    def on_chunk_started(data):
        print(f"Generating chunk {data['index']}: {data['text']}")

    @sio.on("audio_chunk")
    def on_audio_chunk(data):
        nonlocal chunk_count
        chunk_count += 1
        output_path = f"output_{chunk_count:03d}.wav"
        with open(output_path, "wb") as f:
            f.write(data["audio"])
        print(f"Saved chunk {chunk_count} -> {output_path}")

    @sio.on("synthesis_done")
    def on_synthesis_done(data):
        print(f"Done streaming {data['chunks']} chunk(s)")
        sio.disconnect()

    @sio.on("synthesis_error")
    def on_synthesis_error(data):
        print(f"Error: {data['detail']}")
        sio.disconnect()

    sio.connect(SERVER)
    sio.wait()


if __name__ == "__main__":
    args = [arg for arg in sys.argv[1:] if arg.strip()]
    use_socketio = False
    preset = "expressive"

    if args and args[0] in {"socketio", "io"}:
        use_socketio = True
        args = args[1:]

    if len(args) >= 2 and args[0] in {"natural", "balanced", "expressive"}:
        preset = args[0]
        args = args[1:]

    text = " ".join(args) or "Hello, this is a test of the Chatterbox TTS server."
    if use_socketio:
        synthesize_socketio(text, quality_preset=preset)
    else:
        synthesize(text, quality_preset=preset)
