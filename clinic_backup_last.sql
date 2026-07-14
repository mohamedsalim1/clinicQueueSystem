أنا أعمل على مشروع ويب تقنية:
- Backend: Node.js + Express
- Frontend: React + Vite
- WebSocket (socket.io أو ws)
- الهوست محلي متصل عبر راوتر

المشكلة: الصفحة تأخذ وقت طويل جداً للتحميل.

افحص المشروع بالكامل وابحث عن المشاكل التالية واقترح الحل مع كود جاهز لكل مشكلة تجدها:

## 1. مشاكل Vite / React
- هل Vite في وضع development بدل production؟
- هل يوجد sourcemap مُفعّل في الإنتاج؟
- هل ملفات React تُحمّل بالكامل بدل lazy loading؟
- هل يوجد re-renders غير ضرورية في React؟
- هل useEffect يعملRuns زيادة؟
- هل يوجد state ثقيل في Context بدون memoization؟
- هل يوجد صور/أصول كبيرة غير محسّنة في public/ أو assets/؟

## 2. مشاكل WebSocket
- هل WebSocket يعمل polling بدل websocket transport؟
- هل يوجد events كثيرة تُرسل بسرعة بدون throttle/debounce؟
- هل الاتصال يفصل ويعيد الاتصال باستمرار؟
- هل يوجد memory leak من listeners غير منظفة؟
- هل socket.connect() يُستدعى أكثر من مرة؟

## 3. مشاكل Node.js / Express
- هل middleware غير ضروري يعمل على كل request؟
- هل يوجد استعلامات قاعدة بيانات بطيئة أو N+1 query؟
- هل compression middleware غير مفعّل؟
- هل CORS مُعرّف بشكل مفرط يسبب preflight على كل طلب؟
- هل يوجد static files بدون cache headers؟
- هل helmet أو morgan أو body-parser يسبب overhead؟

## 4. مشاكل الشبكة / الراوتر
- هل localhost يحل عبر IPv6 أولاً؟
- هل يوجد DNS lookup بطيء؟
- هل proxy في Vite مُعدّ بشكل خاطئ؟

## 5. مشاكل البناء (Build)
- هل bundle size كبير؟ اعرض التحليل.
- هل يوجد dependencies ثقيلة يمكن استبدالها؟
- هل tree-shaking يعمل بشكل صحيح؟
- هل code-splitting مُفعّل؟

لكل مشكلة تجدها:
1. اكتب اسم الملف والسطر
2. اشرح لماذا يسبب بطء
3. اكتب الكود المصحح كاملاً
4. قيّم تأثير الإصلاح: حرج / متوسط / منخفض

ابدأ بفحص الملفات التالية أولاً:
- vite.config.js/ts
- server.js أو app.js أو index.js (الخادم)
- package.json
- أي ملف فيه socket أو websocket
- أي ملف فيه useEffect أو useState كثير
- .env أو config files

ثم افحص باقي المشروع.