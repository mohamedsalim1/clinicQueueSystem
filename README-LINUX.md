# مركز داريا الطبي - إصدار Linux Desktop
## Daraya Medical Center - Linux Desktop Version

نظام إدارة دور المرضى مُحول إلى تطبيق سطح مكتب لـ Linux باستخدام Tauri.

## 📦 التثبيت

### المتطلبات
- **Linux** (Ubuntu/Debian/Fedora/CentOS)
- **Node.js 16+**
- **glibc 2.17+** (مثبت في معظم التوزيعات الحديثة)

### الحزم المتاحة
1. **AppImage** - ملف واحد قابل للتشغيل (موصى به)
2. **DEB Package** - لحزم التثبيت الرسمية

## 🚀 التشغيل السريع

### باستخدام AppImage:
```bash
# جعل الملف قابل للتنفيذ
chmod +x frontend/src-tauri/target/release/bundle/appimage/مركز\ داريا\ الطبي_1.0.0_amd64.AppImage

# تشغيل التطبيق
./frontend/src-tauri/target/release/bundle/appimage/مركز\ داريا\ الطبي_1.0.0_amd64.AppImage
```

### باستخدام Script التلقائي:
```bash
# تشغيل النظام كاملاً (خادم + تطبيق)
./start-linux.sh
```

## 📁 هيكل الملفات

```
frontend/src-tauri/target/release/bundle/
├── appimage/
│   └── مركز داريا الطبي_1.0.0_amd64.AppImage  # AppImage
├── appimage_deb/
│   └── data/usr/bin/darayya-clinic             # DEB executable
└── ...
```

## 🔧 التثبيت كحزمة DEB (اختياري)

```bash
# نسخ الملفات إلى نظامك
sudo cp frontend/src-tauri/target/release/bundle/appimage_deb/data/usr/bin/darayya-clinic /usr/local/bin/
sudo cp frontend/src-tauri/assets/com.darayya.clinic.desktop /usr/share/applications/
sudo cp frontend/src-tauri/assets/512x512.png /usr/share/icons/hicolor/512x512/apps/com.darayya.clinic.png

# تحديث قائمة التطبيقات
sudo update-desktop-database
```

##   الميزات

- 🖥️ **تطبيق سطح مكتب مستقل** - لا يحتاج متصفح
- 🔄 **تحديثات فورية** - عبر Socket.io
- 🖨️ **طباعة حرارية** - مباشرة من التطبيق
- 🔊 **إعلانات صوتية** - Web Speech API
- 📱 **واجهة متجاوبة** - تعمل على جميع أحجام الشاشات

## 🐛 استكشاف الأخطاء

### خطأ: "Permission denied"
```bash
chmod +x frontend/src-tauri/target/release/bundle/appimage/مركز\ داريا\ الطبي_1.0.0_amd64.AppImage
```

### خطأ: "GLIBC not found"
- تأكد من تحديث نظامك: `sudo apt update && sudo apt upgrade`
- أو استخدم الإصدار الويب في المتصفح

### خطأ: "Cannot connect to server"
- تأكد من تشغيل الخادم: `npm start`
- أو شغل `start-linux.sh` للتشغيل التلقائي

### خطأ: "No sound"
- التطبيق السطحي يدعم الصوت تلقائياً
- تأكد من أن مكبرات الصوت تعمل

## 🔨 إعادة البناء

إذا كنت تريد تعديل الكود وإعادة البناء:

```bash
cd frontend
npm run tauri:build
```

سيتم إنشاء AppImage جديد في نفس المجلد.

## 📋 المتوافقية

- ✅ **Ubuntu 18.04+**
- ✅ **Debian 10+**
- ✅ **Fedora 30+**
- ✅ **CentOS 8+**
- ✅ **Linux Mint**
- ✅ **Pop!_OS**
- ✅ **Elementary OS**

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل:
- تحقق من `server.log` لأخطاء الخادم
- تأكد من تشغيل `npm install` في المجلدات المطلوبة
- المشاكل الشائعة موثقة في `QUICKSTART.md`

---

**© 2026 مركز داريا الطبي**