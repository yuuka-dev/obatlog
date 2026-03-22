// FCM バックグラウンド通知用サービスワーカー
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCzYKEs0u8JJ9E_Fr8nBlmKq3nTexuaOe8',
  authDomain: 'obatlog.firebaseapp.com',
  projectId: 'obatlog',
  messagingSenderId: '1018085546645',
  appId: '1:1018085546645:web:a00383007e855c2376d99c',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'ObatLog', {
    body: body || '',
    icon: '/icons/icon-192.png',
  });
});
