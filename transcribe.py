#!/usr/bin/env python3
"""
Script para baixar vídeos do Google Drive e transcrever com Whisper.

Dependências:
    pip install openai-whisper gdown

Uso:
    python3 transcribe.py
"""

import os
import sys
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
    print(f"Baixando arquivos da pasta do Google Drive...")
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


def transcribe_files(model_name="base"):
    os.makedirs(TRANSCRIPTIONS_DIR, exist_ok=True)
    media_files = get_media_files(DOWNLOAD_DIR)

    if not media_files:
        print(f"Nenhum arquivo de video/audio encontrado em '{DOWNLOAD_DIR}/'.")
        return

    print(f"\nCarregando modelo Whisper '{model_name}'...")
    model = whisper.load_model(model_name)

    print(f"\nEncontrados {len(media_files)} arquivo(s) para transcrever.\n")

    for i, filepath in enumerate(media_files, 1):
        filename = os.path.basename(filepath)
        name_without_ext = os.path.splitext(filename)[0]
        output_path = os.path.join(TRANSCRIPTIONS_DIR, f"{name_without_ext}.txt")

        print(f"[{i}/{len(media_files)}] Transcrevendo: {filename}")

        try:
            result = model.transcribe(filepath, verbose=False)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(result["text"].strip())
            print(f"  -> Salvo em: {output_path}")
        except Exception as e:
            print(f"  -> ERRO ao transcrever {filename}: {e}")

    print(f"\nPronto! Transcricoes salvas em '{TRANSCRIPTIONS_DIR}/'.")


if __name__ == "__main__":
    model_name = sys.argv[1] if len(sys.argv) > 1 else "base"

    download_folder()
    transcribe_files(model_name)
