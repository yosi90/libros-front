importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

const encodedConfig = new URL(self.location.href).searchParams.get('config');
if (encodedConfig) {
    const config = JSON.parse(decodeURIComponent(atob(encodedConfig)));
    firebase.initializeApp(config);
    firebase.messaging();
}
