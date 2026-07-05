# Readoo AI

[![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Flask](https://img.shields.io/badge/Flask-3.0-black?logo=flask)](https://flask.palletsprojects.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**Readoo AI** adalah platform asisten AI cerdas berbasis **Retrieval-Augmented Generation (RAG)** dengan dukungan multi-modal — teks, suara, dan avatar 3D (VRM). Mendukung berbagai LLM provider (Groq, OpenAI, Gemini, DeepSeek, Ollama, OpenRouter) melalui LiteLLM, serta STT/TTS untuk interaksi suara.

---

## ✨ Fitur Unggulan

| Fitur | Deskripsi |
|---|---|
| **🤖 RAG Pipeline** | FAISS semantic search + BM25 keyword search + Reciprocal Rank Fusion (RRF) + CrossEncoder reranker (opsional) |
| **🎤 Speech-to-Text** | OpenAI Whisper (lokal) atau Groq Cloud API, auto-detect provider |
| **🔊 Text-to-Speech** | Edge-TTS (online gratis) atau Supertonic (lokal ONNX) dengan konfigurasi suara via Admin UI |
| **💬 Streaming Chat** | Server-Sent Events (SSE) — respons real-time seperti ChatGPT |
| **🧑 3D Avatar** | Mode chat dengan avatar VRM 3D dan synthesizer speech (TTS) untuk lipsync |
| **📚 Dataset Kustom** | Upload CSV/Excel → pilih kolom embedding & display → auto-embedding → siap ditanyakan |
| **📄 Import File** | Dukungan format CSV, XLSX, XLS — preview sebelum import |
| **🌐 Multi-Provider LLM** | Groq, OpenAI, Gemini, DeepSeek, Ollama, OpenRouter — konfigurasi dinamis via Admin UI |
| **🔄 Auto-Detect Models** | Deteksi model dari provider secara otomatis via API (dengan fallback list bawaan) |
| **🔐 API Key Enkripsi** | API key LLM disimpan terenkripsi (Fernet) di database |
| **🔑 Manajemen User** | Role-based (admin/user), CRUD user, update role, change password |
| **🌙 Dark/Light Mode** | Toggle di seluruh halaman |
| **⚡ Redis Cache** | Rate limiting, session store, dan caching terdistribusi (dengan fallback in-memory) |

---

## 🏗️ Arsitektur Real

```
Readoo/
├── backend/                          # Python Flask API
│   ├── main.py                       # Entry point (Waitress WSGI, 16 threads)
│   └── app/
│       ├── __init__.py               # Flask app factory (create_app)
│       ├── api/                      # REST API endpoints (blueprint /api)
│       │   ├── __init__.py           # Blueprint registration
│       │   ├── auth.py               # Register, login, logout, forgot-password, change-password
│       │   ├── chat.py               # Chat text/stream/avatar + sessions CRUD + title update
│       │   ├── voice.py              # STT (transcribe) + TTS endpoints + serve audio
│       │   ├── middleware.py         # require_auth decorator (role-based) + require_rate_limit
│       │   └── admin/
│       │       ├── collections.py    # CRUD collections, rebuild FAISS, add/delete documents
│       │       ├── dataset.py        # Upload CSV/Excel (preview), import, export JSON
│       │       ├── settings.py       # System settings, health check, user management (CRUD + role)
│       │       └── llm.py            # Test LLM connection, detect models, TTS test
│       ├── core/                     # Konfigurasi inti
│       │   ├── config.py             # Settings dari environment (.env), load_dotenv
│       │   ├── logging.py            # Setup logging format
│       │   ├── security.py           # bcrypt (password hash), Fernet (API key encrypt/decrypt)
│       │   └── validators.py         # Pydantic validators (Register, Login, Chat, TTS, LLM, dll)
│       ├── infrastructure/           # Layer infrastruktur
│       │   ├── database.py           # Inisialisasi SQLite + schema (6 tabel) + seed users
│       │   ├── cache.py              # Cache abstraction (RedisCache + MemoryCache), rate limiter, session store
│       │   ├── vector_store.py       # FAISS IndexIDMap + BM25 kustom + RRF + CrossEncoder reranker
│       │   ├── stt_client.py         # STT (Whisper lokal / Groq API) + auto device detection
│       │   └── tts_client.py         # TTS (Edge-TTS async / Supertonic lokal) + dynamic config reload
│       ├── repositories/             # Data access layer (SQLite)
│       │   ├── __init__.py           # Export semua repository
│       │   ├── user_repository.py    # CRUD users
│       │   ├── session_repository.py # CRUD sessions, active session count
│       │   ├── chat_repository.py    # CRUD chat messages & sessions
│       │   ├── settings_repository.py# Get/save settings by key
│       │   └── collection_repository.py # CRUD collections & documents, stats, active collection
│       └── services/                 # Business logic layer
│           ├── chat_service.py       # Chat orchestration: RAG pipeline, LLM call, session management
│           └── speech_service.py     # STT/TTS orchestration
├── frontend/                         # React SPA (Vite + TypeScript + Tailwind)
│   ├── index.html
│   ├── vite.config.ts                # Dev server + API proxy
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx                  # Entry point React
│   │   ├── App.tsx                   # Routing + ProtectedRoute + role-based guard
│   │   ├── index.css                 # Tailwind directives + custom styles
│   │   ├── types/index.ts            # TypeScript interfaces (User, ChatMessage, ChatItem, dll)
│   │   ├── services/api.ts           # API client (auth, chat, voice, admin modules)
│   │   ├── hooks/useAuth.ts          # Auth state management (login, logout, token)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── ChatPage.tsx          # Main chat: text mode + 3D avatar mode, change password modal
│   │   │   └── AdminPage.tsx         # Dashboard admin
│   │   └── components/
│   │       ├── ThemeToggle.tsx
│   │       ├── ui/                   # Button, Input, Modal, dll.
│   │       ├── chat/                 # Sidebar, ChatBubble, ItemCard, AudioRecorder, VrmAvatar
│   │       └── admin/                # Komponen admin panel
├── tests/                            # Pytest test suite
│   ├── test_auth.py
│   └── test_validators.py
├── docker-compose.yml                # Orchestration (backend + frontend + redis)
├── Dockerfile (backend & frontend)
├── nginx.conf (frontend)
├── run_Readoo.bat
└── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis (opsional, untuk cache terdistribusi)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

cp ../.env.example ../.env
# Edit .env — set GROQ_API_KEY atau provider lain

pip install -r requirements.txt
python main.py
```

Server berjalan di `http://localhost:5000`

### Frontend Setup (Development)

```bash
cd frontend
npm install
npm run dev
```

Akses di `http://localhost:3000`

### Docker Deployment

```bash
docker-compose up -d
```

---

## 🔑 Akun Demo

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin` | `admin` |
| **User** | `user` | `user` |

---

## 📋 API Reference (Lengkap)

### Authentication
| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Registrasi user baru | - |
| POST | `/api/auth/login` | Login → return token, role, nama_lengkap | - |
| POST | `/api/auth/logout` | Logout (hapus session) | User |
| POST | `/api/auth/forgot-password` | Mock forgot-password (log ke console) | - |
| POST | `/api/auth/change-password` | Ganti password (old + new) | User |

### Chat
| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/chat/text` | Chat dengan RAG → reply + items | User |
| POST | `/api/chat/stream` | Streaming chat (SSE) → chunks + items | User |
| POST | `/api/chat/avatar` | Chat mode 3D avatar → speech_text + items | User |
| GET | `/api/chat/sessions` | Daftar session user | User |
| GET | `/api/chat/sessions/:id/messages` | Pesan dalam session | User |
| DELETE | `/api/chat/sessions/:id` | Hapus session | User |
| POST | `/api/chat/sessions/:id/title` | Update judul session | User |

### Voice
| Method | Endpoint | Deskripsi | Auth |
|---|---|---|---|
| POST | `/api/transcribe` | STT (upload audio .webm) → text | User |
| POST | `/api/tts` | TTS (text → audio_url) | User |
| GET | `/api/audio/:file` | Serve file audio (MP3/WAV) | - |

### Admin — Collections
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/admin/collections` | Daftar semua koleksi (dengan doc_count) |
| POST | `/api/admin/collections/active/:id` | Aktifkan koleksi |
| DELETE | `/api/admin/collections/:id` | Hapus koleksi + FAISS index |
| POST | `/api/admin/collections/rebuild/:id` | Rebuild FAISS index dari database |
| GET | `/api/admin/collections/:id/documents` | Lihat semua dokumen dalam koleksi |
| POST | `/api/admin/collections/:id/documents` | Tambah dokumen individual (incremental) |
| DELETE | `/api/admin/documents/:id` | Hapus dokumen individual (incremental) |

### Admin — Dataset
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/admin/dataset/upload` | Upload CSV/XLSX/XLS → preview + headers |
| POST | `/api/admin/dataset/import` | Import dataset → embedding → collection |
| GET | `/api/admin/dataset/export/:id` | Export collection sebagai JSON |

### Admin — Settings & System
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/admin/settings` | Lihat semua pengaturan (API key di-mask) |
| POST | `/api/admin/settings` | Simpan pengaturan (API key dienkripsi) |
| GET | `/api/admin/stats` | Statistik sistem (users, collections, documents, sessions) |
| GET | `/api/admin/health` | Health check (database + vector store) |

### Admin — User Management
| Method | Endpoint | Deskripsi |
|---|---|---|
| GET | `/api/admin/user-management` | Daftar semua user |
| DELETE | `/api/admin/user-management/:id` | Hapus user |
| POST | `/api/admin/user-management/:id/role` | Update role user (user/admin) |

### Admin — LLM & TTS
| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/admin/llm/test-connection` | Test koneksi ke LLM provider |
| POST | `/api/admin/llm/detect-models` | Auto-detect model dari provider (dengan fallback) |
| POST | `/api/admin/tts/test` | Test sintesis suara TTS kustom |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
python -m pytest ../tests/ -v

# Dengan coverage
python -m pytest ../tests/ --cov=app -v
```

---

## ⚙️ Konfigurasi Lingkungan

Buat file `.env` dari template `.env.example`:

```env
# Server
PORT=3000
PYTHON_HOST=127.0.0.1
PYTHON_PORT=5000

# Keamanan
ENCRYPTION_KEY=your_fernet_key_here

# LLM Provider (groq | openai | gemini | deepseek | ollama | openrouter)
LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-3.5-turbo

# RAG
EMBEDDING_MODEL=paraphrase-multilingual-MiniLM-L12-v2
USE_RERANKER=false
RERANKER_MODEL=jinaai/jina-reranker-v2-base-multilingual
RERANK_THRESHOLD=0.45

# TTS
TTS_PROVIDER=edge-tts
TTS_VOICE=id-ID-GadisNeural
TTS_RATE=+0%
SUPERTONIC_VOICE=W1

# STT
WHISPER_MODEL=base
GROQ_STT_API_KEY=

# Redis (opsional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 🛠️ Tech Stack (Lengkap)

### Backend
- **Framework**: Flask 3.0 (dengan flask-cors)
- **WSGI Server**: Waitress (multi-threaded, 16 threads)
- **Vector Search**: FAISS (IndexIDMap + IndexFlatL2) + SentenceTransformers
- **Keyword Search**: BM25 (implementasi kustom)
- **Reranker**: CrossEncoder (jinaai/jina-reranker-v2-base-multilingual)
- **LLM Client**: LiteLLM (multi-provider: Groq, OpenAI, Gemini, DeepSeek, Ollama, OpenRouter)
- **STT**: OpenAI Whisper (lokal) atau Groq Cloud API (whisper-large-v3)
- **TTS**: Edge-TTS (async) atau Supertonic (lokal ONNX)
- **Database**: SQLite (6 tabel: users, sessions, collections, documents, settings, chat_history, chat_sessions)
- **Cache**: Redis (dengan fallback in-memory untuk rate limiting & session store)
- **Validasi**: Pydantic v2
- **Keamanan**: bcrypt (password), Fernet/cryptography (API key enkripsi)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 6
- **Bahasa**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4 (dark mode support)
- **Icons**: Lucide React
- **Routing**: React Router 6
- **Avatar**: VRM 3D model with lipsync

---

## 🧠 Alur Lengkap Sistem

### Autentikasi (Session Token)
```
User → POST /api/auth/login (email + password)
  ├── bcrypt.check_password() → validasi
  ├── secrets.token_hex(32) → generate token
  ├── Simpan session ke SQLite (token, user_id, role, created_at)
  └── Return { token, role, nama_lengkap }

Request selanjutnya → header Authorization: Bearer <token>
  ├── require_auth middleware:
  │   ├── Cek Redis cache (key: "session:{token}")
  │   ├── Jika tidak ada → query SQLite sessions table
  │   ├── Set g.user_id, g.user_role dari session
  │   └── Cache session ke Redis (TTL 86400s)
  └── require_rate_limit:
      ├── Cache key: "ratelimit:user_{id}:{window}"
      ├── Counter increment (Redis/Memory)
      └── Jika > limit (default 10/60s) → 429
```

### RAG Pipeline (ChatService.generate_text_response)
```
User Query → POST /api/chat/text
  │
  ├── 1. Cek greeting (regex): "halo", "hai", "pagi", dll.
  │     → Jika ya: balas greeting_message, skip RAG
  │
  ├── 2. RAG Search (vector_store.search, top_k=20)
  │   ├── a. FAISS Semantic Search:
  │   │     - Encode query → SentenceTransformer
  │   │     - FAISS IndexIDMap.search(query_vec, k=20)
  │   │     - Map ID → SQLite documents → metadata
  │   │
  │   ├── b. BM25 Keyword Search:
  │   │     - Tokenize query (lowercase split)
  │   │     - TF-IDF scoring per dokumen (k1=1.5, b=0.75)
  │   │     - Log-based IDF smoothing
  │   │     - Ambil top 20
  │   │
  │   └── c. Reciprocal Rank Fusion (RRF):
  │         - Formula: score += 1/(k + rank), k=60
  │         - Gabung & sort hasil semantic + keyword
  │         - Ambil top 20
  │
  ├── 3. CrossEncoder Reranker (opsional, jika USE_RERANKER=true)
  │   ├── jinaai/jina-reranker-v2-base-multilingual
  │   ├── Score relevansi + boost popularitas (0.01 * log1p(views))
  │   └── Sort & ambil top 5
  │
  ├── 4. Build Context:
  │   ├── Format dokumen: "Item #1: ...", hanya display_cols
  │   └── Jika tidak ada dokumen → "Tidak ada data relevan"
  │
  ├── 5. Build System Prompt:
  │   ├── Asisten: "{assistant_name}, seorang {assistant_job}"
  │   ├── Konteks: hasil RAG
  │   └── Riwayat chat: 2 sesi terakhir
  │
  ├── 6. LLM Completion (via LiteLLM):
  │   ├── Decrypt API key dari database (Fernet)
  │   ├── Panggil litellm.completion() dengan model_string
  │   ├── Provider-specific: ollama → api_base, lainnya → api_key
  │   └── Streaming: litellm.completion(stream=True) → yield chunks
  │
  └── 7. Simpan history + Return { reply, items, session_id }
```

### Dataset Upload & Embedding Flow
```
Upload CSV/XLSX → Admin UI
  │
  ├── 1. Upload → save ke data/uploads/temp_{uuid}.{ext}
  ├── 2. Validasi: format (csv/xlsx/xls), ukuran (max 10MB)
  ├── 3. Parse → pandas.DataFrame
  ├── 4. Preview → return { headers, preview_rows, total_rows }
  │
  └── Import → Admin pilih nama, embedding_cols, display_cols
      ├── 1. add_collection_from_csv():
      │   ├── Deactivate all collections
      │   ├── Insert collection row ke SQLite
      │   ├── Loop setiap baris:
      │   │   ├── Gabung embedding_cols → content string
      │   │   ├── Simpan metadata (semua kolom)
      │   │   └── Insert ke documents table
      │   ├── Encode semua content → embeddings (SentenceTransformer)
      │   ├── Buat FAISS IndexIDMap → save ke disk
      │   └── Load ke memory sebagai active collection
      └── Return { collection_id, document_count }
```

### STT / TTS Flow
```
STT (Speech-to-Text):
  POST /api/transcribe (audio .webm multipart)
    ├── Groq API key available?
    │   ├── Ya: POST ke Groq API (whisper-large-v3, language=id)
    │   └── Tidak: Whisper lokal (model=base, device=cpu/cuda)
    └── Return { text }

TTS (Text-to-Speech):
  POST /api/tts { text }
    ├── Load dynamic config (provider, voice, language dari DB)
    ├── Edge-TTS:
    │   ├── Async edge_tts.Communicate(text, voice, rate)
    │   └── Save → .mp3
    ├── Supertonic:
    │   ├── Load voice style
    │   ├── synthesize(text, voice_style, lang)
    │   └── Save → .wav
    └── Return { audio_url: "/api/audio/{filename}" }
```

---

## 💾 Database Schema (SQLite)

6 tabel + 1 tabel chat:

```sql
-- Users
users(id, nama_lengkap, email UNIQUE, password_hash, role DEFAULT 'user')

-- Sessions
sessions(token PK, user_id FK, role, created_at)

-- Collections (RAG)
collections(id PK, name UNIQUE, embedding_cols JSON, display_cols JSON, active INTEGER, created_at)

-- Documents
documents(id PK, collection_id FK, content TEXT, metadata JSON)

-- Settings (Key-Value)
settings(key PK, value)

-- Chat History
chat_history(id PK, user_id FK, role, content, session_id, created_at)

-- Chat Sessions
chat_sessions(id PK, user_id FK, title DEFAULT 'Chat Baru', created_at, updated_at)
```

---

## 🔐 Keamanan

- **Password**: bcrypt (hash + salt) — `hash_password()` / `check_password()`
- **API Key LLM**: Fernet encryption (symmetric) — `encrypt_api_key()` / `decrypt_api_key()`
- **Fallback default key**: Kunci default untuk development lokal (warning: "DO NOT USE IN PRODUCTION")
- **Session Token**: secrets.token_hex(32) — disimpan di SQLite + cache Redis
- **Rate Limiting**: Per user — default 10 request per 60 detik
- **Role-based Access**: Decorator `@require_auth(role="admin")` — endpoint admin hanya untuk role admin
- **CORS**: flask-cors enabled

---

## 🎯 Fitur-Fitur Detail dari Kode

1. **2 Mode Chat**: "Chatting" (teks + streaming) dan "3D Avatar" (speech + avatar VRM)
2. **Session Management**: Auto-create session, load history, delete, update title
3. **Audio Recording**: Rekam suara dari browser → STT → kirim sebagai pesan
4. **Change Password**: Modal dialog dengan validasi client-side
5. **Dynamic LLM Config**: Provider, model, API key, max_tokens, temperature — semua bisa diubah via Admin UI tanpa restart
6. **Auto-Detect Models**: Panggil API provider (Groq, OpenAI, Gemini, DeepSeek, Ollama) untuk mendeteksi model yang tersedia
7. **TTS Test**: Test suara langsung dari Admin UI dengan provider dan voice kustom
8. **Incremental Document Operations**: Tambah/hapus dokumen individual ke FAISS index tanpa rebuild full
9. **Health Check**: Endpoint `/api/admin/health` — cek status database + vector store
10. **Mock Forgot Password**: Simulasi reset password (log link ke console, tidak kirim email sungguhan)
11. **Akun Demo**: Seed otomatis admin (admin/admin) dan user (user/user) saat pertama kali database dibuat

---

## 📊 Metrics Admin Dashboard

Endpoint `/api/admin/stats` mengembalikan:
- `total_users` — jumlah user terdaftar
- `total_collections` — jumlah koleksi RAG
- `total_documents` — total dokumen di semua koleksi
- `active_sessions` — jumlah session aktif saat ini
- `collections` — detail per koleksi (nama + document_count)

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b feature/fitur-keren`)
3. Commit perubahan (`git commit -m 'feat: tambah fitur keren'`)
4. Push ke branch (`git push origin feature/fitur-keren`)
5. Buka Pull Request

---

## 📄 Lisensi

MIT License — lihat file [LICENSE](LICENSE) untuk detail.

---

## 👨‍💻 Author

**Idhul Rahman** — [GitHub](https://github.com/IdhulRahman)