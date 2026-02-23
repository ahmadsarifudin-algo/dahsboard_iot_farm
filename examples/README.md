# 🎨 Contoh Skin Templates

3 contoh skin siap pakai untuk IoT Data Center Dashboard.

## Daftar Skin

| # | Nama | Deskripsi | Preview |
|---|---|---|---|
| 01 | **Starter Minimal** | Template dasar, tinggal edit warna | 🟢 Biru standar |
| 02 | **Ocean Breeze** | Tema laut biru-cyan + efek wave | 🔵 Biru laut |
| 03 | **Sunset Warm** | Tema hangat oranye-emas + gradient sunset | 🟠 Oranye |

## Cara Pakai

### Manual (Zip Sendiri)

1. Copy folder salah satu skin (misal `02-ocean-breeze`)
2. Edit `theme.css` sesuai keinginan
3. Select semua file dalam folder → Compress ke `.zip`
   ```
   skin.json     ← harus di root zip
   theme.css
   ```
4. Buka dashboard → klik **🎨 Skin Manager** di sidebar
5. Drag & drop file `.zip` → klik **Apply**

### Tip: Bikin Skin Baru

1. Copy folder `01-starter-minimal` sebagai template
2. Edit `skin.json` → ubah `name`, `author`, `description`, dan `previewColors`
3. Edit `theme.css` → ubah semua CSS variables
4. Zip dan upload!

## Struktur Setiap Skin

```
skin-name/
├── skin.json    ← Manifest (wajib)
└── theme.css    ← CSS override (wajib)
```

## Dokumentasi Lengkap

- [📖 Panduan Developer Skin](../docs/SKIN_GUIDE.md)
- [📋 CSS Variables Reference](../docs/CSS_VARIABLES.md)
