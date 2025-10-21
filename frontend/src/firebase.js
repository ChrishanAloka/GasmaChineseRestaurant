import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD2lmnw8ijujduq9DYjhErn74q-Q4ty-bI",
  authDomain: "rmsdb-31a45.firebaseapp.com",
  projectId: "rmsdb-31a45",
  storageBucket: "rmsdb-31a45.firebasestorage.app",
  messagingSenderId: "63851884891",
  appId: "1:63851884891:web:36f1b2b86be252413faa7e",
  measurementId: "G-RD17J67D3C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage, ref, uploadBytes, getDownloadURL };