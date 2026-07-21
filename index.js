/* =====================================================================
   Cloud Function اختيارية - إرسال إشعار Push حقيقي عبر FCM
   عند إنشاء مستند جديد في مجموعة notifications، تُرسل هذه الدالة إشعار
   Push فعلي لجهاز المستخدم صاحب uid المذكور في المستند (باستخدام fcmToken
   المخزن في users/{uid}). هذا الجزء يعمل على خوادم Firebase (Cloud
   Functions) وليس في المتصفح، وهو اختياري: النظام يعمل بدونه ويظهر
   الإشعار داخل التطبيق فقط (In-App)، لكن بدون Push فعلي للجهاز.

   طريقة النشر:
   1) npm install -g firebase-tools
   2) firebase login
   3) firebase init functions   (اختر نفس مشروع Firebase المستخدم في التطبيق)
   4) انسخ هذا الملف إلى functions/index.js
   5) داخل مجلد functions: npm install firebase-admin firebase-functions
   6) firebase deploy --only functions
   ===================================================================== */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendAttendanceNotification = functions.firestore
  .document('notifications/{notifId}')
  .onCreate(async (snap) => {
    const data = snap.data();
    if (!data || !data.uid) return null;

    const userDoc = await admin.firestore().collection('users').doc(data.uid).get();
    const fcmToken = userDoc.exists ? userDoc.data().fcmToken : null;
    if (!fcmToken) return null;

    const message = {
      token: fcmToken,
      notification: {
        title: data.title || 'منظومة الحضور والإنجاز',
        body: data.body || ''
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: { icon: '/icon.svg' }
      }
    };

    try {
      await admin.messaging().send(message);
    } catch (err) {
      console.error('فشل إرسال الإشعار:', err);
    }
    return null;
  });
