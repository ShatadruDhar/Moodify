import argparse
import json
import subprocess
import sys
from pathlib import Path

import librosa
import numpy as np


def run_json(command):
    result = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def analyze_track(file_path):
    metadata = run_json([
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration:format_tags=title,artist",
        "-of", "json", str(file_path),
    ])["format"]
    tags = {key.lower(): value for key, value in metadata.get("tags", {}).items()}
    duration = float(metadata["duration"])
    sample_start = max(0, duration / 2 - 15)
    decoded = subprocess.run([
        "ffmpeg", "-v", "error", "-ss", f"{sample_start:.3f}",
        "-i", str(file_path), "-t", "30", "-vn", "-ac", "1",
        "-ar", "22050", "-f", "f32le", "pipe:1",
    ], capture_output=True, check=True)
    samples = np.frombuffer(decoded.stdout, dtype="<f4")
    if samples.size < 22050 * 5:
        raise RuntimeError(f"Could not decode enough audio from {file_path.name}")

    sample_rate = 22050
    hop_length = 512
    rms = librosa.feature.rms(y=samples, frame_length=2048, hop_length=hop_length)[0]
    onset = librosa.onset.onset_strength(y=samples, sr=sample_rate, hop_length=hop_length)
    tempo = librosa.feature.tempo(
        onset_envelope=onset,
        sr=sample_rate,
        hop_length=hop_length,
        aggregate=np.median,
    )
    centroid = librosa.feature.spectral_centroid(
        y=samples,
        sr=sample_rate,
        hop_length=hop_length,
    )[0]
    return {
        "filename": file_path.name,
        "title": tags.get("title", file_path.stem).strip() or file_path.stem,
        "artist": tags.get("artist", "").strip(),
        "durationSeconds": round(duration, 1),
        "tempoBpm": float(np.median(tempo)),
        "energyDb": float(20 * np.log10(max(float(np.mean(rms)), 1e-8))),
        "brightnessHz": float(np.median(centroid)),
    }


def percentile_ranks(records, key):
    values = np.asarray([record[key] for record in records], dtype=float)
    return np.asarray([np.mean(values <= value) for value in values])


def main():
    parser = argparse.ArgumentParser(
        description="Create a local-only, low-confidence mood draft for MP3 files."
    )
    parser.add_argument("songs_dir", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "local-songs.json",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace the existing local manifest at the selected output path.",
    )
    args = parser.parse_args()
    songs_dir = args.songs_dir.resolve()
    if not songs_dir.is_dir():
        raise ValueError(f"Songs directory does not exist: {songs_dir}")
    if args.output.exists() and not args.overwrite:
        raise FileExistsError(
            f"Refusing to overwrite {args.output}. Move it aside or choose --output."
        )

    files = sorted(songs_dir.glob("*.mp3"))
    if not files:
        raise ValueError(f"No MP3 files found directly in {songs_dir}")

    records = []
    for index, file_path in enumerate(files, start=1):
        records.append(analyze_track(file_path))
        if index % 20 == 0 or index == len(files):
            print(f"Analyzed {index}/{len(files)} tracks", file=sys.stderr)

    tempo_rank = percentile_ranks(records, "tempoBpm")
    energy_rank = percentile_ranks(records, "energyDb")
    brightness_rank = percentile_ranks(records, "brightnessHz")
    surprise_score = 0.4 * tempo_rank + 0.35 * energy_rank + 0.25 * brightness_rank
    surprise_threshold = np.quantile(surprise_score, 0.8)

    for index, record in enumerate(records):
        upbeat_score = 0.55 * energy_rank[index] + 0.45 * tempo_rank[index]
        if surprise_score[index] >= surprise_threshold:
            mood = "surprised"
            note = "Tentative high-arousal suggestion from relative audio features"
        elif upbeat_score >= 0.5:
            mood = "happy"
            note = "Tentative upbeat suggestion from relative tempo and energy"
        else:
            mood = "sad"
            note = "Tentative lower-energy suggestion from relative tempo and energy"

        record.update({
            "mood": mood,
            "moodNote": note,
            "reviewStatus": "heuristic - review locally",
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    counts = {
        mood: sum(record["mood"] == mood for record in records)
        for mood in ("happy", "sad", "surprised")
    }
    print(json.dumps({
        "manifest": str(args.output.resolve()),
        "songs": len(records),
        "draftMoodCounts": counts,
        "note": "All mood assignments are heuristic and should be reviewed.",
    }, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Local song analysis failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
