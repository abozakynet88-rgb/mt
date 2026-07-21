# منظومة الحضور والإنجاز

نظام PWA كامل لإدارة حضور وانصراف العاملين ومتابعة إنجازاتهم اليومية، بهوية بصرية حكومية مصرية (كحلي/ذهبي).

## الملفات
- `index.html` — التطبيق كاملاً (واجهة + منطق) في ملف واحد.
- `manifest.json` — إعدادات PWA.
- `sw.js` — Service Worker للعمل بدون اتصال والتخزين المؤقت.
- `offline.html` — صفحة تظهر عند فقد الاتصال بالكامل.
- `icon.svg` — أيقونة التطبيق (يفضّل توليد `icon-192.png` و`icon-512.png` أيضًا وإضافتهما لنفس المجلد).
- `firestore.rules` — قواعد أمان Firestore المقترحة (صلاحيات حسب الدور).
- `functions/index.js` — دالة Cloud Function اختيارية لإرسال إشعارات Push فعلية.

## خطوات التشغيل

### 1) إنشاء مشروع Firebase
1. اذهب إلى https://console.firebase.google.com وأنشئ مشروعًا جديدًا.
2. من **Authentication → Sign-in method** فعّل **Google** كوسيلة دخول.
3. من **Firestore Database** أنشئ قاعدة بيانات (وضع الإنتاج).
4. من **Project settings → General → Your apps** أضف تطبيق ويب (Web) وانسخ بيانات `firebaseConfig`.

### 2) ربط الإعدادات بالتطبيق
افتح `index.html` وابحث عن `FIREBASE_CONFIG` بالقرب من بداية كود JavaScript، واستبدل القيم ببيانات مشروعك:
```js
const FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

### 3) (اختياري) إشعارات Push حقيقية عبر FCM
1. من **Project settings → Cloud Messaging → Web Push certificates** أنشئ مفتاح VAPID.
2. الصق المفتاح في متغير `FCM_VAPID_KEY` داخل `index.html`.
3. لإرسال Push فعلي للجهاز (وليس فقط داخل التطبيق)، انشر الدالة الموجودة في `functions/index.js` (اتبع التعليمات المكتوبة أعلى الملف).
   بدون هذه الخطوة، ستظهر الإشعارات داخل التطبيق فقط (In-App) وهذا كافٍ لعمل النظام.

### 4) نشر قواعد الأمان
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # اختر نفس المشروع
firebase deploy --only firestore:rules
```

### 5) أول مستخدم (مدير النظام)
لا يوجد حساب افتراضي؛ أول شخص يسجّل دخوله سيمر بشاشة "استكمال البيانات" ويختار الوظيفة "مدير النظام"، لكن حالته ستكون **Pending** حتى يعتمده أحد. لتفعيل أول حساب مدير نظام يدويًا:
1. سجّل دخولك مرة واحدة لإنشاء مستند المستخدم في Firestore (مجموعة `users`).
2. من Firebase Console → Firestore، افتح مستند المستخدم وغيّر الحقل `status` إلى `APPROVED` يدويًا (مرة واحدة فقط).
3. بعدها يمكنه اعتماد بقية المستخدمين من داخل التطبيق مباشرة.

### 6) النشر (Hosting)
```bash
firebase init hosting     # اختر مجلد المشروع كـ public directory
firebase deploy --only hosting
```
أو ارفع الملفات إلى أي استضافة تدعم HTTPS (لا يعمل تسجيل الدخول ولا تحديد الموقع الجغرافي عبر `file://` أو HTTP بدون HTTPS).

## هيكل البيانات في Firestore

- **users/{uid}**: `fullName, nationalId, phone, job, center, photoUrl, role, status, email, fcmToken`
- **centers/{id}**: `name`
- **attendance/{uid_YYYY-MM-DD}**: `uid, userName, center, date, checkInTime, checkInLocation{lat,lng,placeName}, checkInStatus, checkOutTime, checkOutLocation, accomplishments[]`
- **notifications/{id}**: `uid, title, body, read, createdAt`

## ملاحظات فنية
- **تحديد المكان تلقائيًا** يتم عبر Nominatim (OpenStreetMap) مجانًا بدون مفتاح API.
- **الخرائط** عبر Leaflet + بلاطات OpenStreetMap المجانية.
- **تصدير Excel** عبر SheetJS، و**PDF** عبر تصوير الجدول (html2canvas) لضمان ظهور النص العربي بشكل صحيح، و**الطباعة المباشرة** عبر `window.print()`.
- **الصور الشخصية** تُخزَّن كـ Base64 مصغّر داخل مستند المستخدم مباشرة لتفادي الحاجة لخطة Firebase Storage المدفوعة؛ يمكن استبدالها لاحقًا برفع حقيقي لـ Storage إذا رغبت.
- **ساعة التأخير الافتراضية** هي 9:00 صباحًا، يمكن تعديلها من ثابت `LATE_HOUR` في `index.html`.
