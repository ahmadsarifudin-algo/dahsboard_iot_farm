# 🎨 Panduan Developer Skin — IoT Dashboard

Panduan lengkap untuk membuat **Template Pack Skin** custom untuk IoT Data Center Dashboard.

---

## Daftar Isi

1. [Struktur File Skin](#struktur-file-skin)
2. [Manifest (skin.json)](#manifest-skinjson)
3. [CSS Variables](#css-variables)
4. [HTML Templates](#html-templates)
5. [Assets](#assets)
6. [Keamanan & Batasan](#keamanan--batasan)
7. [Troubleshooting](#troubleshooting)

---

## Struktur File Skin

Skin dikemas sebagai file `.zip` dengan struktur berikut:

```
my-skin.zip
├── skin.json          ← Wajib: manifest
├── theme.css          ← Wajib: CSS override
├── widgets/           ← Opsional: HTML templates
│   ├── gauge.html
│   └── stat-card.html
└── assets/            ← Opsional: gambar, font
    ├── logo.svg
    └── bg-pattern.png
```

**Aturan:**
- File `skin.json` dan CSS **wajib** ada
- Total ukuran zip **maksimal 5MB**
- Setiap file individual **maksimal 1MB**
- Path relatif terhadap root zip (tidak boleh `../`)

---

## Manifest (skin.json)

```json
{
  "name": "My Custom Skin",
  "version": "1.0.0",
  "author": "Nama Anda",
  "description": "Deskripsi singkat skin Anda",
  "files": {
    "css": "theme.css",
    "layout": "layout.html",
    "widgets": {
      "gauge": "widgets/gauge.html",
      "stat-card": "widgets/stat-card.html"
    }
  },
  "config": {
    "previewColors": ["#0a0a1a", "#12122a", "#ff2d95", "#00f0ff"],
    "sidebarPosition": "left",
    "headerStyle": "solid",
    "cardStyle": "glass"
  }
}
```

### Field Wajib

| Field | Type | Deskripsi |
|---|---|---|
| `name` | string | Nama skin (max 50 karakter) |
| `files.css` | string | Path ke file CSS utama |

### Field Opsional

| Field | Type | Deskripsi |
|---|---|---|
| `version` | string | Versi semver (misal "1.0.0") |
| `author` | string | Nama creator |
| `description` | string | Deskripsi singkat |
| `files.layout` | string | Path ke template layout HTML |
| `files.widgets` | object | Map nama widget → path HTML template |
| `config.previewColors` | string[] | 4 warna hex untuk preview card di Skin Manager |
| `config.sidebarPosition` | string | `"left"` atau `"right"` |
| `config.headerStyle` | string | `"solid"`, `"transparent"`, `"gradient"` |
| `config.cardStyle` | string | `"default"`, `"glass"`, `"flat"`, `"bordered"` |

---

## CSS Variables

Skin bekerja dengan **meng-override CSS custom properties** yang sudah didefinisikan di dashboard. Ini adalah cara termudah dan teraman untuk mengubah tampilan.

### Contoh Minimal

```css
/* theme.css */
:root {
  --background: #1a0a2e;
  --foreground: #e0d0ff;
  --card: #251540;
  --accent: #a855f7;
}
```

### Daftar Lengkap Variables

Lihat **[CSS_VARIABLES.md](./CSS_VARIABLES.md)** untuk referensi lengkap semua variable yang tersedia.

### Kategori Utama

| Kategori | Variables | Contoh |
|---|---|---|
| **Background** | `--background`, `--surface-1/2/3` | Warna latar utama |
| **Card** | `--card`, `--card-hover` | Warna kartu & hover |
| **Text** | `--text-primary/secondary/muted` | Warna teks |
| **Border** | `--border` | Warna garis pembatas |
| **Accent** | `--accent` | Warna utama (tombol, link) |
| **Status** | `--success`, `--warning`, `--danger` | Warna status indikator |
| **Skin** | `--skin-glow`, `--skin-card-radius` | Efek khusus skin |

### Override Tailwind Classes

Untuk override warna Tailwind classes yang digunakan oleh komponen existing:

```css
/* Override dark background classes */
.bg-dark-500, .bg-dark-400 { background-color: var(--background) !important; }
.bg-dark-300 { background-color: var(--card) !important; }
.bg-dark-200 { background-color: var(--card-hover) !important; }

/* Override text colors */
.text-white { color: var(--text-primary) !important; }
.text-gray-400, .text-gray-300 { color: var(--text-secondary) !important; }
.text-gray-500, .text-gray-600 { color: var(--text-muted) !important; }

/* Override border */
.border-dark-100 { border-color: var(--border) !important; }

/* Override primary/accent color applied to components */
.bg-primary-600 { background-color: var(--accent) !important; }
.text-primary-400, .text-primary-500 { color: var(--accent) !important; }
.bg-primary-500\/20 { background-color: color-mix(in srgb, var(--accent) 20%, transparent) !important; }
```

---

## HTML Templates

Skin dapat menyediakan **HTML template** yang menggantikan widget default. Template menggunakan syntax **Mustache-like**.

### Syntax

| Syntax | Deskripsi |
|---|---|
| `{{variable}}` | Menampilkan nilai variable |
| `{{#if condition}}...{{/if}}` | Blok kondisional |
| `{{#if cond}}...{{#else}}...{{/if}}` | If/else |
| `{{#each items}}...{{/each}}` | Iterasi array |

### Contoh Template Widget

```html
<!-- widgets/stat-card.html -->
<div class="skin-stat-card">
  <div class="stat-icon">
    <svg viewBox="0 0 24 24" width="24" height="24">
      <circle cx="12" cy="12" r="10" fill="var(--accent)" opacity="0.2"/>
    </svg>
  </div>
  <div class="stat-info">
    <span class="stat-label">{{label}}</span>
    <span class="stat-value">{{value}}</span>
  </div>
  {{#if trend}}
  <span class="stat-trend">{{trend}}%</span>
  {{/if}}
</div>
```

### Cara Kerja SkinSlot

Di React, widget dibungkus dengan `<SkinSlot>`:

```tsx
<SkinSlot
  name="stat-card"
  data={{ label: 'Total Devices', value: 42, trend: 5.2 }}
  fallback={<KPICard ... />}
/>
```

Jika skin menyediakan template `stat-card`, template tersebut akan di-render dengan data yang diberikan. Jika tidak, komponen React default (`KPICard`) akan ditampilkan.

---

## Assets

### Gambar

Letakkan gambar di folder `assets/` dalam zip:

```css
/* Referensi gambar dari CSS */
.dashboard-bg {
  background-image: url('./assets/bg-pattern.png');
}
```

> ⚠️ URL eksternal (`https://...`) **diblokir** untuk keamanan. Gunakan hanya file lokal dalam zip.

### Font

```css
@font-face {
  font-family: 'CustomFont';
  src: url('./assets/custom-font.woff2') format('woff2');
}

:root {
  --skin-font-primary: 'CustomFont', sans-serif;
}
```

**Format yang didukung:** `.woff`, `.woff2`, `.ttf`

### Ekstensi File yang Diizinkan

| Kategori | Ekstensi |
|---|---|
| Config | `.json` |
| Styling | `.css` |
| Template | `.html` |
| Gambar | `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp` |
| Font | `.woff`, `.woff2`, `.ttf` |

---

## Keamanan & Batasan

### HTML Sanitization (DOMPurify)

HTML template di-sanitize sebelum di-render. Yang **dihapus otomatis**:

- ❌ `<script>` tags
- ❌ `<iframe>`, `<object>`, `<embed>`
- ❌ `<form>`, `<input>`, `<button>`
- ❌ Event handlers (`onclick`, `onerror`, `onload`, dll)
- ❌ `javascript:` URLs

Yang **diizinkan**:

- ✅ `<div>`, `<span>`, `<p>`, `<h1>`-`<h6>`
- ✅ `<ul>`, `<ol>`, `<li>`, `<a>`, `<img>`
- ✅ `<svg>` dan child elements
- ✅ `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`
- ✅ `class`, `id`, `style`, `data-*` attributes

### CSS Sanitization

Pattern CSS yang **diblokir**:

- ❌ `@import` — tidak boleh load external CSS
- ❌ `expression()` — IE CSS expressions
- ❌ `javascript:` — injection via URL
- ❌ `url(https://...)` — external resource loading
- ❌ `-moz-binding` — XBL binding
- ❌ `behavior:` — IE behavior

### Batasan Ukuran

| Batasan | Limit |
|---|---|
| Total zip | 5 MB |
| Per file | 1 MB |
| Nama skin | 50 karakter |

---

## Troubleshooting

### Skin tidak berubah setelah Apply

- Pastikan CSS variable names **persis sama** (case-sensitive)
- Gunakan `!important` untuk override Tailwind classes
- Clear browser cache dan refresh

### Warna di-override tapi tidak semua komponen berubah

Dashboard menggunakan **Tailwind utility classes** langsung di komponen. Anda perlu override class-class spesifik:

```css
/* Override semua background dark classes */
.bg-dark-500, .bg-dark-400, .bg-dark-300, .bg-dark-200 {
  background-color: var(--background) !important;
}
```

### Upload gagal: "skin.json tidak ditemukan"

- Pastikan `skin.json` ada di **root** zip, bukan dalam subfolder
- ✅ Benar: `skin.zip/skin.json`
- ❌ Salah: `skin.zip/my-skin/skin.json`

### CSS pattern berbahaya ditemukan

Pesan ini muncul jika CSS Anda mengandung pattern yang diblokir. Hapus `@import`, `expression()`, atau URL eksternal dari CSS Anda.

---

## Quick Start

1. Copy salah satu folder dari `examples/`
2. Edit `theme.css` sesuai preferensi warna
3. Zip semua file (skin.json harus di root)
4. Buka dashboard → klik 🎨 Skin Manager di sidebar
5. Drag & drop file `.zip` Anda
6. Klik **Apply** → selesai!

---

*Dibuat untuk IoT Data Center Dashboard v1.0*
