# 🐳 Panduan Pengoperasian Docker & Security Hardening - Readoo AI

Panduan lengkap ini menjelaskan cara menjalankan aplikasi **Readoo AI** menggunakan **Docker & Docker Compose** secara aman, efisien, dan siap produksi (*production-ready*).

---

## 🔒 1. Panduan Keamanan Produksi (Security Hardening)

Sebelum menjalankan aplikasi di lingkungan server/produksi, lakukan langkah-langkah pengamanan berikut:

### A. Ubah Kredensial Default & Secret Key
Buka atau buat berkas `.env` di direktori utama (*root*) dan perbarui nilai default:
```env
# 1. Kunci Enkripsi (Gunakan Fernet Key baru)
# Jalankan di python: from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
ENCRYPTION_KEY=GantiDenganFernetKeyUnikAnda===

# 2. Kredensial Akun Admin & Demo Produksi
ADMIN_USERNAME=admin_readoo
ADMIN_PASSWORD=SangatRahas1a!Pass321
DEMO_USERNAME=user_demo
DEMO_PASSWORD=UserRahas1a!Pass321
```

### B. Proteksi Fitur Keamanan yang Sudah Terpasang:
- **Non-Root User**: Kontainer backend berjalan di bawah user non-root `appuser` (UID 1000) untuk mencegah eskalasi hak akses kontainer.
- **HTTP Security Headers**: Server web Nginx otomatis menyuntikkan header proteksi:
  - `X-Frame-Options: SAMEORIGIN` (Mencegah serangan Clickjacking).
  - `X-Content-Type-Options: nosniff` (Mencegah MIME sniffing).
  - `X-XSS-Protection: 1; mode=block` (Proteksi dari XSS).
  - `Referrer-Policy: strict-origin-when-cross-origin`.
- **.dockerignore**: Memastikan berkas sensitif seperti `.env`, `.git`, `.venv`, dan `data/*.db` tidak bocor ke dalam image Docker.

---

## 🚀 2. Cara Menjalankan Aplikasi dengan Docker Compose

### Persyaratan:
- Docker Desktop / Docker Engine (v20.10+)
- Docker Compose (v2.0+)

### Langkah Jalankan Server:

1. **Jalankan Perintah Build & Run**:
   ```bash
   docker-compose up -d --build
   ```

2. **Cek Status Kontainer**:
   ```bash
   docker-compose ps
   ```
   *Output yang diharapkan:*
   - `readoo-backend` (Port 5000) -> Status: `healthy`
   - `readoo-frontend` (Port 80 & 3000) -> Status: `running`
   - `readoo-redis` (Port 6379) -> Status: `healthy`

3. **Akses Aplikasi melalui Browser**:
   - Web UI Aplikasi: `http://localhost` (atau `http://localhost:3000`)
   - Backend API Health Check: `http://localhost:5000/api/health`

---

## 📁 3. Persistent Data & Mounting Volume

Seluruh data transaksi dan aset disimpan secara aman di host melalui mounting volume:

| Path Host | Path Kontainer | Fungsi |
| :--- | :--- | :--- |
| `./backend/data` | `/app/data` | Menyimpan database SQLite (`readoo.db`), indeks FAISS, dan cache model |
| `./backend/data/uploads` | `/app/data/uploads` | Menyimpan berkas model 3D Avatar (`.vrm`) & gambar yang diunggah admin |
| `redis-data` (Docker Volume) | `/data` | Menyimpan cache in-memory Redis |

---

## 🛠️ 4. Perintah Manajemen Docker yang Berguna

- **Melihat Log Server secara Real-time**:
  ```bash
  docker-compose logs -f backend
  ```

- **Memberhentikan Seluruh Servis**:
  ```bash
  docker-compose down
  ```

- **Restart Servis Backend**:
  ```bash
  docker-compose restart backend
  ```

- **Membersihkan Image & Container Lama**:
  ```bash
  docker system prune -f
  ```
