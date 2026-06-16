# CTECH — Blog đánh giá công nghệ

Personal tech review blog by **Vu Xuan Cuong** (Hà Nội, Việt Nam).

Live static demo (Vercel): https://personal-blog-blond-mu.vercel.app

## Chạy local (full features - khuyến khích)

```powershell
# Mở thư mục này và chạy
start.bat
```

Sau đó mở http://localhost:8080

- Admin: http://localhost:8080/admin/login.html (mật khẩu mặc định trong config.json)
- Thành viên: http://localhost:8080/account.html

## Triển khai (Deploy)

### Vercel (static demo - hiện tại)
- Chỉ deploy phần frontend + `data.json` + assets (không có backend).
- Đã kết nối GitHub → push code là auto deploy.

### Full dynamic (admin, save, comment, upload)
Chạy local server hoặc tự host `server.py` (pure Python stdlib, không cần database).

## Cấu trúc dự án

- `index.html`, `posts.html`, `post.html`, `products.html`, ... — Giao diện
- `js/` — Logic client (load data, i18n đa ngôn ngữ, theme, render posts/products)
- `data.json` — Toàn bộ nội dung (posts, profile, services, theme mặc định)
- `themes.json` — Các theme màu
- `i18n/` — Bản dịch (vi, en, ja, ko, zh, ...)
- `server.py` + `*.bat` — Local dev server + tiện ích chạy nhanh (admin, upload, comment, user auth)
- `vercel.json` + `.vercelignore` — Cấu hình deploy static trên Vercel
- `uploads/` — Ảnh upload (demo)

## Lưu ý khi clone

- Chạy `start.bat` (Windows) để khởi động server local đầy đủ.
- `data.json` là nguồn dữ liệu cho cả static và local.
- Secrets (users.json, config.json) không commit.

## Cập nhật nội dung

1. Sửa `data.json` (hoặc dùng giao diện admin khi chạy local).
2. Commit & push lên GitHub.
3. Vercel tự động build & deploy phiên bản static mới.

## Tech stack (static + local)

- Pure HTML + Tailwind (via CDN in some places) + Vanilla JS
- Local: Python http.server + custom API handlers
- Hosting: Vercel (static) + local / self-host cho dynamic

---

Made with ❤️ for sharing honest tech reviews.

Muốn full-stack (admin thật, database, auth mạnh) thì cân nhắc chuyển sang Next.js + Vercel.
