// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDQCytkAsD0Tj4TNFXy1Mq6aME3CzFOXDg",
  authDomain: "zaki-9a9c3.firebaseapp.com",
  databaseURL: "https://zaki-9a9c3-default-rtdb.firebaseio.com",
  projectId: "zaki-9a9c3",
  storageBucket: "zaki-9a9c3.appspot.com",
  messagingSenderId: "20917017637",
  appId: "1:20917017637:web:5098b1747a254ce3d533cc",
  measurementId: "G-9CKKG5QFTC"
};

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Make Firestore instance available globally
if (!window.db) {
    window.db = firebase.firestore();
}

