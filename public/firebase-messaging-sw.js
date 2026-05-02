importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCR8d8hgitbdruEw95jv31CXvIHPG9sB3U",
  authDomain: "carebinder-f27df.firebaseapp.com",
  projectId: "carebinder-f27df",
  storageBucket: "carebinder-f27df.firebasestorage.app",
  messagingSenderId: "327019147850",
  appId: "1:327019147850:web:6548dab18b56900ac2ecb3",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'CareBinder';
  const body = payload.notification?.body ?? '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tag ?? 'carebinder',
    requireInteraction: true,
  });
});
