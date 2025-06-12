# Fokus Saham Docker Setup

Proyek ini menggunakan Docker untuk menjalankan aplikasi Fokus Saham yang terdiri dari:
- Backend Flask (Python) di port 5000
- Frontend Next.js di port 3000
- Koneksi ke MongoDB lokal

## Prerequisites

1. Docker dan Docker Compose terinstall
2. MongoDB berjalan di mesin lokal (port 27017)

## Struktur Proyek

```
FokusSahamDocker/
├── Backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .dockerignore
├── Fokus Saham/
│   ├── [files Next.js]
│   ├── Dockerfile
│   └── .dockerignore
├── docker-compose.yml
└── README.md
```

## Cara Menjalankan

1. **Pastikan MongoDB lokal berjalan:**
   ```bash
   # Start MongoDB service (Windows)
   net start MongoDB
   
   # Atau jalankan mongod secara manual
   mongod --dbpath "path/to/your/db"
   ```

2. **Build dan jalankan containers:**
   ```bash
   # Di root folder proyek
   docker-compose up --build
   ```

3. **Akses aplikasi:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Environment Variables

### Backend
- `MONGODB_URI`: URI koneksi MongoDB (default: mongodb://host.docker.internal:27017)
- `FLASK_ENV`: Environment Flask (default: production)
- `PORT`: Port backend (default: 5000)

### Frontend
- `NODE_ENV`: Environment Node.js (default: production)
- `NEXT_PUBLIC_API_URL`: URL backend API (default: http://localhost:5000)

## Commands Berguna

```bash
# Build ulang containers
docker-compose build

# Jalankan di background
docker-compose up -d

# Stop containers
docker-compose down

# Lihat logs
docker-compose logs -f

# Masuk ke container backend
docker-compose exec backend bash

# Masuk ke container frontend
docker-compose exec frontend sh
```

## Troubleshooting

### MongoDB Connection Issues
- Pastikan MongoDB berjalan di mesin lokal
- Periksa firewall settings
- Coba ganti `host.docker.internal` dengan IP lokal mesin

### Build Errors
- Hapus cache Docker: `docker system prune -a`
- Update dependencies jika perlu

### Port Already in Use
- Stop services yang menggunakan port 3000 atau 5000
- Atau ubah port mapping di docker-compose.yml
