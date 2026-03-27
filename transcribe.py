#!/usr/bin/env python3
"""
Script para baixar vídeos do Google Drive e transcrever com Whisper em paralelo.

Dependências:
    pip install openai-whisper gdown

Uso:
    python3 transcribe.py [modelo] [num_workers]

Exemplos:
    python3 transcribe.py                  # medium, workers automático
    python3 transcribe.py medium 4         # medium com 4 workers paralelos
    python3 transcribe.py large 2          # large com 2 workers paralelos
"""

import os
import sys
import multiprocessing
import gdown
import whisper

FOLDER_ID = "1E1JTO-HrQgdAA1nkzql1gScWmKgrY2Ld"
FOLDER_URL = f"https://drive.google.com/drive/folders/{FOLDER_ID}"
DOWNLOAD_DIR = "videos"
TRANSCRIPTIONS_DIR = "transcricoes"

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v", ".mpg", ".mpeg"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}


def download_folder():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    print("Baixando arquivos da pasta do Google Drive...")
    gdown.download_folder(FOLDER_URL, output=DOWNLOAD_DIR, quiet=False)
    print(f"Download concluido em: {DOWNLOAD_DIR}/")


def get_media_files(directory):
    supported = VIDEO_EXTENSIONS | AUDIO_EXTENSIONS
    files = []
    for fname in os.listdir(directory):
        ext = os.path.splitext(fname)[1].lower()
        if ext in supported:
            files.append(os.path.join(directory, fname))
    return sorted(files)


def transcribe_worker(args):
    """Executado em cada processo paralelo: carrega o modelo e transcreve um arquivo."""
    filepath, model_name, transcriptions_dir, worker_id, total = args

    filename = os.path.basename(filepath)
    name_without_ext = os.path.splitext(filename)[0]
    output_path = os.path.join(transcriptions_dir, f"{name_without_ext}.txt")

    print(f"[Worker {worker_id}] ({total[0]}/{total[1]}) Iniciando: {filename}")

    try:
        model = whisper.load_model(model_name)
        result = model.transcribe(filepath, verbose=False)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(result["text"].strip())
        print(f"[Worker {worker_id}] Concluido: {filename} -> {output_path}")
        return (filename, True, None)
    except Exception as e:
        print(f"[Worker {worker_id}] ERRO em {filename}: {e}")
        return (filename, False, str(e))


def transcribe_files_parallel(model_name="medium", num_workers=None):
    os.makedirs(TRANSCRIPTIONS_DIR, exist_ok=True)
    media_files = get_media_files(DOWNLOAD_DIR)

    if not media_files:
        print(f"Nenhum arquivo de video/audio encontrado em '{DOWNLOAD_DIR}/'.")
        return

    # Limita workers pela quantidade de arquivos e CPUs disponíveis
    cpu_count = multiprocessing.cpu_count()
    if num_workers is None:
        num_workers = min(cpu_count, len(media_files), 4)

    print(f"\nEncontrados {len(media_files)} arquivo(s).")
    print(f"Modelo: {model_name} | Workers paralelos: {num_workers}\n")

    total = len(media_files)
    task_args = [
        (filepath, model_name, TRANSCRIPTIONS_DIR, i + 1, (i + 1, total))
        for i, filepath in enumerate(media_files)
    ]

    with multiprocessing.Pool(processes=num_workers) as pool:
        results = pool.map(transcribe_worker, task_args)

    successes = sum(1 for _, ok, _ in results if ok)
    failures = [(name, err) for name, ok, err in results if not ok]

    print(f"\n{'='*50}")
    print(f"Concluido: {successes}/{total} transcrições salvas em '{TRANSCRIPTIONS_DIR}/'.")
    if failures:
        print(f"\nErros ({len(failures)}):")
        for name, err in failures:
            print(f"  - {name}: {err}")


if __name__ == "__main__":
    model_name = sys.argv[1] if len(sys.argv) > 1 else "medium"
    num_workers = int(sys.argv[2]) if len(sys.argv) > 2 else None

    download_folder()
    transcribe_files_parallel(model_name, num_workers)
