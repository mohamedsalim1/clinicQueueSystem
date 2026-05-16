# دليل التشغيل السريع
# Quick Start Guide

## للمستخدمين العرب

### 1. التثبيت الأولي
```bash
# في مجلد المشروع
npm install
cd frontend
npm install
cd ..
```

### 2. التشغيل
```bash
# استخدم أحد هذين الملفين:
start-clinic.bat    # للمستخدمين العاديين
# أو
start-clinic.ps1    # لمستخدمي PowerShell
```

سيفتح هذا:
- نافذة الأوامر للخادم (اتركها مفتوحة)
- تطبيق سطح المكتب للعيادة

### 3. إعداد قاعدة البيانات
```bash
# في terminal منفصل
npm install -g prisma
npx prisma migrate dev
npx prisma db seed
```

### 4. إعداد الطابعة (اختياري)
- اذهب إلى الإعدادات في التطبيق
- أدخل اسم الطابعة (مثل "Thermal_Printer")

## للمطورين

### تشغيل للتطوير
```bash
# Terminal 1: الخادم
npm run dev

# Terminal 2: التطبيق
cd frontend && npm run tauri:dev
```

### البناء للإنتاج
```bash
cd frontend
npm run tauri:build
```

سيتم إنشاء الملف في: `frontend/src-tauri/target/release/bundle/msi/`

## استكشاف الأخطاء

### مشكلة: التطبيق لا يعمل
- تأكد من تثبيت Node.js
- تأكد من وجود قاعدة البيانات
- جرب تشغيل `npm install` مرة أخرى

### مشكلة: لا صوت
- في التطبيق السطحي، الصوت مسموح تلقائياً
- في المتصفح، انقر على الصفحة أولاً

### مشكلة: الطباعة لا تعمل
- تأكد من توصيل الطابعة
- تأكد من اسم الطابعة في الإعدادات
- تأكد من دعم ESC/POS في الطابعة

## الدعم
للمساعدة، تحقق من:
- ملف README.md للتفاصيل الكاملة
- console في المتصفح للأخطاء
- logs الخادم في terminal