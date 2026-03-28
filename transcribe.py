#!/usr/bin/env python3
"""
Baixa vídeos do Google Drive, transcreve com Whisper em paralelo
e faz upload das transcrições de volta para a mesma pasta.

Dependências:
    pip install openai-whisper gdown google-api-python-client google-auth-httplib2 google-auth-oauthlib

Na primeira execução abrirá o navegador para autorizar o acesso ao Google Drive.
O token fica salvo em token.json para reutilização.

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

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

FOLDER_ID = "1E1JTO-HrQgdAA1nkzql1gScWmKgrY2Ld"
FOLDER_URL = f"https://drive.google.com/drive/folders/{FOLDER_ID}"
DOWNLOAD_DIR = "videos"
TRANSCRIPTIONS_DIR = "transcricoes"

SCOPES = ["https://www.googleapis.com/auth/drive.file"]
TOKEN_FILE = "token.json"
CREDENTIALS_FILE = "credentials.json"

VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".flv", ".wmv", ".m4v", ".mpg", ".mpeg"}
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"}


# ─── Google Drive auth ─────────────────────────────────────────────────────────

def get_drive_service():
    creds = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                print(
                    "\nARQUIVO credentials.json NAO ENCONTRADO.\n"
                    "Acesse https://console.cloud.google.com/apis/credentials\n"
                    "crie um OAuth 2.0 Client ID (tipo 'Desktop app') e baixe o JSON\n"
                    "salvando-o como 'credentials.json' na mesma pasta deste script.\n"
                )
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return build("drive", "v3", credentials=creds)


# ─── Download ──────────────────────────────────────────────────────────────────

def download_folder():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    print("Baixando arquivos da pasta do Google Drive...")
    gdown.download_folder(FOLDER_URL, output=DOWNLOAD_DIR, quiet=False)
    print(f"Download concluido em: {DOWNLOAD_DIR}/\n")


# ─── Transcription ─────────────────────────────────────────────────────────────

def get_media_files(directory):
    supported = VIDEO_EXTENSIONS | AUDIO_EXTENSIONS
    files = []
    for fname in os.listdir(directory):
        ext = os.path.splitext(fname)[1].lower()
        if ext in supported:
            files.append(os.path.join(directory, fname))
    return sorted(files)


def transcribe_worker(args):
    """Processo paralelo: carrega modelo e transcreve um arquivo."""
    filepath, model_name, transcriptions_dir, worker_id, index, total = args

    filename = os.path.basename(filepath)
    name_without_ext = os.path.splitext(filename)[0]
    output_path = os.path.join(transcriptions_dir, f"{name_without_ext}.txt")

    print(f"[Worker {worker_id}] ({index}/{total}) Iniciando: {filename}")
    try:
        model = whisper.load_model(model_name)
        result = model.transcribe(filepath, verbose=False)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(result["text"].strip())
        print(f"[Worker {worker_id}] Concluido: {filename} -> {output_path}")
        return (filename, output_path, True, None)
    except Exception as e:
        print(f"[Worker {worker_id}] ERRO em {filename}: {e}")
        return (filename, None, False, str(e))


def transcribe_files_parallel(model_name="medium", num_workers=None):
    os.makedirs(TRANSCRIPTIONS_DIR, exist_ok=True)
    media_files = get_media_files(DOWNLOAD_DIR)

    if not media_files:
        print(f"Nenhum arquivo de video/audio encontrado em '{DOWNLOAD_DIR}/'.")
        return []

    cpu_count = multiprocessing.cpu_count()
    if num_workers is None:
        num_workers = min(cpu_count, len(media_files), 4)

    total = len(media_files)
    print(f"Encontrados {total} arquivo(s).")
    print(f"Modelo: {model_name} | Workers paralelos: {num_workers}\n")

    task_args = [
        (filepath, model_name, TRANSCRIPTIONS_DIR, (i % num_workers) + 1, i + 1, total)
        for i, filepath in enumerate(media_files)
    ]

    with multiprocessing.Pool(processes=num_workers) as pool:
        results = pool.map(transcribe_worker, task_args)

    successes = [(name, path) for name, path, ok, _ in results if ok]
    failures = [(name, err) for name, _, ok, err in results if not ok]

    print(f"\n{'='*50}")
    print(f"Transcrições concluídas: {len(successes)}/{total}")
    if failures:
        print(f"Erros ({len(failures)}):")
        for name, err in failures:
            print(f"  - {name}: {err}")

    return [path for _, path in successes]


# ─── Upload ────────────────────────────────────────────────────────────────────

def upload_transcriptions(txt_files):
    if not txt_files:
        print("Nenhuma transcrição para fazer upload.")
        return

    print(f"\nFazendo upload de {len(txt_files)} transcrição(ões) para o Google Drive...")
    service = get_drive_service()

    for txt_path in txt_files:
        filename = os.path.basename(txt_path)
        file_metadata = {
            "name": filename,
            "parents": [FOLDER_ID],
        }
        media = MediaFileUpload(txt_path, mimetype="text/plain", resumable=True)

        # Sobrescreve se já existir
        existing = (
            service.files()
            .list(
                q=f"name='{filename}' and '{FOLDER_ID}' in parents and trashed=false",
                fields="files(id, name)",
            )
            .execute()
            .get("files", [])
        )

        if existing:
            file_id = existing[0]["id"]
            service.files().update(fileId=file_id, media_body=media).execute()
            print(f"  Atualizado: {filename}")
        else:
            service.files().create(body=file_metadata, media_body=media, fields="id").execute()
            print(f"  Enviado:    {filename}")

    print("\nUpload concluido!")


# ─── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    model_name = sys.argv[1] if len(sys.argv) > 1 else "medium"
    num_workers = int(sys.argv[2]) if len(sys.argv) > 2 else None

    download_folder()
    txt_files = transcribe_files_parallel(model_name, num_workers)
    upload_transcriptions(txt_files)
