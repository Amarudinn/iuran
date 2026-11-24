# Rules for Gemini 4 Neon (Frontier-Grade Engineering Protocol)

Setiap respon, penalaran, dan aksi pemrograman dalam proyek ini wajib mematuhi standar frontier berikut untuk mencapai performa setara Claude Opus 5.5 dan GPT-6 Astra:

---

## 1. Dynamic Thinking & Depth Calibration
- Manfaatkan mode penalaran (*Thinking Mode*) secara proporsional sesuai kompleksitas:
  - **Routine/Atomic Task:** Gunakan penalaran cepat (*medium/high*) untuk eksekusi langsung tanpa bertele-tele.
  - **Architectural / Multi-file / Debugging Rumit:** Aktifkan kedalaman penalaran maksimal (*xhigh thinking*) untuk memetakan dependensi, potensi regresi, dan *edge cases* sebelum menulis satu baris kode pun.

## 2. Invariant Mapping & Anti-Regression (Standar Opus 5.5)
- **Cek Dependensi & Caller Graph Terlebih Dahulu:** Sebelum memodifikasi fungsi atau modul yang sudah ada, telusuri file mana saja yang mengimpor atau memanggil fungsi tersebut.
- **Strict Invariant Preservation:** Dilarang merusak atau mengubah *signature*, perilaku eksisting, atau dependensi lain di luar ruang lingkup tugas tanpa persetujuan eksplisit.
- **Pre-Commit Self-Diff:** Selalu evaluasi perubahan kode secara mandiri (*mental git diff*). Pastikan hanya baris yang relevan yang berubah dan tidak ada logika penting yang terhapus secara tidak sengaja.

## 3. Strict Zero-Elision Policy (Kualitas Produksi Mutlak)
- **DILARANG KERAS MENGGUNAKAN PLACEHOLDER:**
  - ❌ `// TODO: tambahkan validasi...`
  - ❌ `// implementasi logic di sini`
  - ❌ `/* sisa kode tetap sama */`
- Seluruh kode, fungsi, skema, dan blok penanganan error (*try-catch*, *null/undefined guards*, validasi input) harus ditulis **100% lengkap, fungsional, dan siap langsung dijalankan (production-ready)**.

## 4. Contract-First & Strict Typing
- Jangan menulis implementasi sebelum kontrak data terkunci:
  - **TypeScript:** Gunakan interface/types eksplisit, strict generics, type guards. Dilarang menggunakan `any` atau type casting serampangan (`as any`).
  - **Python:** Gunakan type hints (`typing`) lengkap atau Pydantic models.
  - **Go/Rust/C#:** Tentukan struct dan signature fungsi di awal.
- Buat modul modular dan terisolasi dengan prinsip *Single Responsibility* (< 150 baris per file).

## 5. High-Frequency Verification Loop
- Manfaatkan kecepatan generasi Gemini 4 Neon (~110 tok/s) untuk melakukan verifikasi mandiri sebelum menyerahkan hasil:
  1. Periksa validitas sintaks dan kelengkapan import.
  2. Pastikan penanganan *edge cases* (koneksi putus, nilai null, race conditions).
  3. Setiap selesai membuat/mengubah kode, sertakan satu baris perintah terminal (PowerShell/Bash) yang siap di-*copy-paste* oleh pengguna untuk menguji atau memverifikasi hasilnya seketika.
