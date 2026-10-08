# Ăn Đủ — nhật ký calo mỗi ngày

Web app tiếng Việt theo dõi năng lượng và dinh dưỡng hằng ngày: ghi món theo bữa (tìm trong cơ sở dữ liệu, gõ nhanh hoặc nhập tay), xem tổng carb, đạm, béo, chất xơ và kcal, so với mục tiêu tính từ hồ sơ cá nhân (BMI, BMR, TDEE). Đĩa của mỗi ngày đổi màu: **cam = thiếu, xanh = đủ, đỏ = thừa**, kèm lời khuyên (vận động bao nhiêu phút để đốt phần dư, ăn thêm gì khi thiếu).

- **Calo đã tiêu**: trao đổi chất nền (BMR, sinh hoạt nhẹ, tiêu hoá) cộng vận động. Vận động nhập theo km, số bước, số lần (kéo xà, hít đất…), số tầng hoặc phút, kể cả gõ nhanh “chạy bộ 2 km, kéo xà 3x10, HIIT 10 phút”. Có cân bằng năng lượng ăn vào − tiêu hao theo ngày.
- Chạy hoàn toàn offline, dữ liệu lưu trên thiết bị (localStorage). Sao lưu/khôi phục bằng tệp `.json`.
- 217 thực phẩm và món Việt (giá trị trên 100 g), thêm được “Món của tôi”.
- Một tệp `index.html` duy nhất (font Be Vietnam Pro + Baloo 2 nhúng sẵn).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` | Trang web đã build (GitHub Pages phục vụ trực tiếp) |
| `src/foods.js` | Cơ sở dữ liệu thực phẩm + bảng MET vận động |
| `src/core.js` | Tính toán (BMR Mifflin–St Jeor, TDEE, BMI chuẩn châu Á, mục tiêu macro), lưu trữ, gõ nhanh |
| `src/ui.js`, `src/events.js` | Giao diện và xử lý thao tác |
| `src/styles.css`, `src/shell.html` | Giao diện, màu, biểu tượng |
| `build.py` | Gộp mọi thứ thành 1 tệp HTML (`dist/`) |
| `android/` | Vỏ Android (WebView) + `build_apk.sh` |

## Đưa lên GitHub Pages

1. Tạo repo công khai `quanbughunter/an-du`, kéo thư mục này vào GitHub Desktop và Publish.
2. Trên GitHub: **Settings → Pages → Source: GitHub Actions**. Workflow `.github/workflows/pages.yml` tự triển khai mỗi lần push lên `main`.
3. Địa chỉ: `https://quanbughunter.github.io/an-du/` — mở trên điện thoại rồi chọn “Thêm vào màn hình chính” để dùng như app.

## Sửa và build lại

```bash
python3 build.py                 # tạo dist/www, dist/apk-www, dist/artifact.html
cp -r dist/www/index.html dist/www/sw.js dist/www/manifest.webmanifest .   # cập nhật trang ở thư mục gốc
```

## Build APK (Linux, không cần Android Studio)

```bash
sudo apt install aapt apksigner zipalign android-sdk-platform-23 dalvik-exchange openjdk-17-jdk
python3 build.py
VERSION_NAME=1.0.3 VERSION_CODE=4 ./android/build_apk.sh     # → android/out/AnDu-1.0.3.apk
```

Lần build đầu tiên tạo khoá ký `android/keystore/` (đã bị `.gitignore` chặn). **Giữ khoá này cẩn thận**: muốn cập nhật app đã cài mà không mất dữ liệu thì bản mới phải ký bằng đúng khoá cũ và có `VERSION_CODE` lớn hơn.

## Nguồn dữ liệu

Giá trị dinh dưỡng tham khảo Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng, 2007) và USDA FoodData Central; món chế biến sẵn là ước tính cho một suất phổ biến. Calo vận động theo Compendium of Physical Activities (MET). App không thay thế tư vấn của bác sĩ dinh dưỡng.
