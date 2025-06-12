# Fokus Saham - API Data Saham

## Ikhtisar
Fokus Saham adalah aplikasi web yang menyediakan data keuangan dan pasar saham melalui API REST. Aplikasi ini mengambil data dari koleksi MongoDB dan menyajikannya melalui endpoint Flask, sehingga dapat diakses oleh aplikasi frontend seperti React.

## Arsitektur Sistem

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│             │     │             │     │                 │
│  MongoDB    │────▶│  Flask API  │────▶│  Client (React) │
│  Database   │     │  Server     │     │  Application    │
│             │     │             │     │                 │
└─────────────┘     └─────────────┘     └─────────────────┘
```

## Struktur Database MongoDB

Aplikasi ini terhubung ke instans MongoDB yang berjalan di `localhost:27017` dan menggunakan database `stock_data`.

### Koleksi:
- `dataUmum`: Berita keuangan umum
- `beritaTicker`: Berita khusus untuk ticker saham
- `lapkeu2024q1`: Laporan keuangan Q1 2024
- `lapkeu2024q2`: Laporan keuangan Q2 2024
- `lapkeu2024q3`: Laporan keuangan Q3 2024
- `lapkeu2024q4`: Laporan keuangan Q4 2024
- `daily_aggregation_ticker`: Data saham harian yang dikelompokkan berdasarkan ticker
- `monthly_aggregation_ticker`: Data saham bulanan yang dikelompokkan berdasarkan ticker
- `yearly_aggregation_ticker`: Data saham tahunan yang dikelompokkan berdasarkan ticker

## Endpoint API

### Data Berita
- **GET `/api/beritaUmum`**: Mengambil berita keuangan umum
- **GET `/api/beritaTicker`**: Mengambil berita khusus untuk ticker saham

### Laporan Keuangan
- **GET `/api/lapkeuQ1/2024`**: Mengambil laporan keuangan Q1 2024
- **GET `/api/lapkeuQ2/2024`**: Mengambil laporan keuangan Q2 2024
- **GET `/api/lapkeuQ3/2024`**: Mengambil laporan keuangan Q3 2024
- **GET `/api/lapkeuQ4/2024`**: Mengambil laporan keuangan Q4 2024

### Data Saham
- **GET `/api/daily/<ticker>/<column>`**: Mengambil data harian untuk ticker dan kolom tertentu
- **GET `/api/monthly/<ticker>/<column>`**: Mengambil data bulanan untuk ticker dan kolom tertentu
- **GET `/api/yearly/<ticker>/<column>`**: Mengambil data tahunan untuk ticker dan kolom tertentu

## Alur Aplikasi

1. **Pengumpulan Data**: Data dikumpulkan dan disimpan dalam koleksi MongoDB 
2. **Server API**: Aplikasi Flask terhubung ke MongoDB dan mengekspos endpoint REST
3. **Pengambilan Data**:
   - Ketika endpoint API dipanggil, aplikasi melakukan kueri ke koleksi MongoDB yang relevan
   - Data diambil berdasarkan parameter seperti simbol ticker dan nama kolom
   - Untuk data saham, agregasi waktu yang berbeda (harian, bulanan, tahunan) ditangani oleh koleksi terpisah
4. **Pemformatan Respons**:
   - Data yang diambil diformat menjadi JSON
   - Informasi tanggal/waktu disertakan berdasarkan tingkat agregasi
   - Penanganan kesalahan diterapkan untuk kasus seperti ticker yang tidak ditemukan atau kesalahan server
5. **Konsumsi Klien**: Data dapat dikonsumsi oleh aplikasi frontend melalui endpoint API yang diaktifkan CORS

## Penanganan Kesalahan

Aplikasi ini menyertakan penanganan kesalahan untuk berbagai skenario:
- Error 404 ketika ticker yang diminta tidak ditemukan
- Error 500 untuk masalah server internal
- Pencatatan error terperinci untuk tujuan debugging

## Pengaturan dan Eksekusi

Untuk menjalankan aplikasi:

```bash
python app.py
```

Ini akan memulai server Flask di localhost:5000 dengan mode debugging diaktifkan.

## Persyaratan

- Python 3.x
- Flask
- PyMongo
- Flask-CORS

## Catatan Pengembangan

- CORS diaktifkan untuk mengizinkan akses dari domain yang berbeda (misalnya, frontend React)
- Pencatatan debug diaktifkan untuk membantu pemecahan masalah
- Aplikasi ini dirancang untuk bekerja dengan struktur data MongoDB yang spesifik untuk pasar keuangan

## Alur Web Dashboard

Web dashboard Fokus Saham dibangun menggunakan Next.js dan menyediakan antarmuka pengguna yang interaktif untuk melihat data saham. Berikut adalah alur kerja dashboard:

1. **Inisialisasi Aplikasi**: 
   - Aplikasi Next.js dimuat dengan konfigurasi Tailwind CSS (`tailwind.config.ts`)
   - Theme provider diinisialisasi di `components/theme-provider.tsx` untuk mendukung tema terang dan gelap
   - Layout utama (`app/layout.tsx`) mengatur struktur dasar halaman dengan font Inter

2. **Konfigurasi Komponen**:
   - `app/page.tsx` bertindak sebagai halaman utama yang mengintegrasikan semua komponen UI
   - Definisi tipe data (`DailyData`, `MonthlyData`, `YearlyData`, `FinancialData`) yang sesuai dengan struktur MongoDB
   - Komponen sidebar (`components/ui/sidebar.tsx`) menyediakan navigasi responsif dengan status yang disimpan dalam cookie
   - Komponen chart (`components/ui/chart.tsx`) menyediakan wrapper untuk Recharts

3. **Interaksi dengan API**:
   - Dashboard mengambil data dari endpoint API Flask melalui axios
   - URL API (http://localhost:5000) didefinisikan dalam konfigurasi aplikasi
   - Data dari berbagai koleksi MongoDB (berita, laporan keuangan, data saham) dipanggil melalui endpoint yang sesuai
   - Data dummy disediakan untuk fallback ketika API tidak tersedia

4. **Pengolahan dan Visualisasi Data**:
   - Data diproses menggunakan hooks React (`useState`, `useEffect`)
   - Library Plotly.js (diimpor secara dinamis) digunakan untuk visualisasi data kompleks
   - Format data disesuaikan untuk visualisasi (harian, bulanan, tahunan)
   - Penggunaan komponen UI seperti Card, Table, dan Tabs untuk menampilkan informasi terstruktur

5. **Respons dan Adaptasi**:
   - Hook `useIsMobile` mendeteksi ukuran layar untuk layout responsif
   - Sidebar dapat dikolapskan untuk mengoptimalkan ruang pada layar kecil
   - Sheet component digunakan untuk navigasi mobile yang lebih baik
   - State aplikasi disimpan untuk mempertahankan pengalaman pengguna antar sesi

## Fitur Web Dashboard

### Komponen UI
Dashboard menggunakan berbagai komponen UI termasuk:

- **Tata Letak & Navigasi**:
  - Sidebar responsif untuk navigasi utama
  - Breadcrumb untuk navigasi hierarkis
  - Layout responsif yang beradaptasi dengan ukuran layar

- **Visualisasi Data**:
  - Grafik interaktif untuk menampilkan tren harga saham
  - Tabel data untuk menampilkan informasi saham terperinci
  - Kartu ringkasan untuk metrik kunci dan statistik

- **Input & Kontrol**:
  - Dropdown dan select untuk memilih ticker saham
  - Kalendar dan date picker untuk memfilter data berdasarkan rentang waktu
  - Slider untuk menyesuaikan parameter visualisasi

- **Notifikasi & Umpan Balik**:
  - Indikator loading untuk operasi asinkron

### Fitur Utama

1. **Monitor Portofolio**:
   - Tampilan portofolio saham pengguna
   - Pelacakan performa saham    

2. **Analisis Teknikal**:
   - Grafik candlestick untuk analisis pola harga
   - Indikator teknikal (Moving Average, RSI, MACD)
   - Alat pembanding untuk membandingkan beberapa saham

3. **Informasi Fundamental**:
   - Akses ke laporan keuangan perusahaan
   - Analisis rasio keuangan
   - Informasi dividen dan pendapatan perusahaan

4. **Berita & Pengumuman**:
   - Feed berita terkait saham
   - Pengumuman perusahaan dan siaran pers
   - Integrasi analisis sentimen berita

5. **Personalisasi**:
   - Tema terang dan gelap yang dapat disesuaikan