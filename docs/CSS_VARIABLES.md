# 📋 CSS Variables Reference — Skin System

Daftar lengkap semua CSS custom properties yang tersedia untuk di-override oleh skin.

---

## Core Colors

| Variable | Default (Dark) | Deskripsi |
|---|---|---|
| `--background` | `#0d1321` | Background utama halaman |
| `--foreground` | `#f1f5f9` | Warna teks utama |
| `--card` | `#151c2c` | Background card/panel |
| `--card-hover` | `#1a2234` | Background card saat hover |
| `--border` | `#1e293b` | Warna border/garis |
| `--muted` | `#64748b` | Warna teks/elemen muted |
| `--accent` | `#0ea5e9` | Warna aksen utama (brand color) |

---

## Status Colors

| Variable | Default | Deskripsi |
|---|---|---|
| `--success` | `#22c55e` | Status sukses / online |
| `--warning` | `#f59e0b` | Status warning |
| `--danger` | `#ef4444` | Status error / critical |

---

## Surface Layers

| Variable | Default | Deskripsi |
|---|---|---|
| `--surface-1` | `#111827` | Surface layer 1 (deep) |
| `--surface-2` | `#1a2234` | Surface layer 2 (mid) |
| `--surface-3` | `#151c2c` | Surface layer 3 (top) |

---

## Text Colors

| Variable | Default | Deskripsi |
|---|---|---|
| `--text-primary` | `#f1f5f9` | Teks utama (heading, label) |
| `--text-secondary` | `#94a3b8` | Teks sekunder (deskripsi) |
| `--text-muted` | `#64748b` | Teks muted (hint, placeholder) |

---

## Skin Extended Variables

Variables tambahan yang diperkenalkan oleh skin system:

| Variable | Default | Deskripsi |
|---|---|---|
| `--skin-glow` | `0 0 20px rgba(14,165,233,0.15)` | Box-shadow efek glow pada card |
| `--skin-card-radius` | `12px` | Border-radius default card |
| `--skin-font-primary` | `'Inter', system-ui, sans-serif` | Font family utama |

---

## Tailwind Class → CSS Variable Mapping

Dashboard menggunakan Tailwind utility classes. Berikut mapping untuk override:

### Background

| Tailwind Class | Mapped Variable | Digunakan Untuk |
|---|---|---|
| `bg-dark-500` | `--background` | Background halaman |
| `bg-dark-400` | `--background` | Background sidebar/header |
| `bg-dark-300` | `--card` | Background card |
| `bg-dark-200` | `--card-hover` | Background card hover |

### Text

| Tailwind Class | Mapped Variable | Digunakan Untuk |
|---|---|---|
| `text-white` | `--text-primary` | Judul, label utama |
| `text-gray-300/400` | `--text-secondary` | Deskripsi |
| `text-gray-500/600` | `--text-muted` | Hint, placeholder |

### Border

| Tailwind Class | Mapped Variable |
|---|---|
| `border-dark-100` | `--border` |

### Accent (Primary)

| Tailwind Class | Mapped Variable |
|---|---|
| `bg-primary-600` | `--accent` |
| `text-primary-400/500` | `--accent` |
| `bg-primary-500/20` | `--accent` (20% opacity) |
| `border-primary-600/30` | `--accent` (30% opacity) |

---

## Contoh Override Lengkap

```css
:root {
  /* Core */
  --background: #1a0a2e;
  --foreground: #e8d5ff;
  --card: #251540;
  --card-hover: #2e1d50;
  --border: #3d2a60;
  --muted: #8b7aaa;
  --accent: #a855f7;
  
  /* Status */
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  
  /* Surfaces */
  --surface-1: #180830;
  --surface-2: #201040;
  --surface-3: #251540;
  
  /* Text */
  --text-primary: #f0e5ff;
  --text-secondary: #b8a5d5;
  --text-muted: #8b7aaa;
  
  /* Skin extras */
  --skin-glow: 0 0 25px rgba(168, 85, 247, 0.2);
  --skin-card-radius: 16px;
}

/* Tailwind overrides */
.bg-dark-500, .bg-dark-400 { background-color: var(--background) !important; }
.bg-dark-300 { background-color: var(--card) !important; }
.bg-dark-200 { background-color: var(--card-hover) !important; }
.border-dark-100 { border-color: var(--border) !important; }
.text-white { color: var(--text-primary) !important; }
.text-gray-400, .text-gray-300 { color: var(--text-secondary) !important; }
.text-gray-500, .text-gray-600 { color: var(--text-muted) !important; }

/* Primary/Accent colors */
.bg-primary-600 { background-color: var(--accent) !important; }
.text-primary-400, .text-primary-500 { color: var(--accent) !important; }
.bg-primary-500\/20 { background-color: rgba(168, 85, 247, 0.2) !important; }
.border-primary-600\/30 { border-color: rgba(168, 85, 247, 0.3) !important; }
```

---

*Lihat juga: [SKIN_GUIDE.md](./SKIN_GUIDE.md) untuk panduan lengkap*
