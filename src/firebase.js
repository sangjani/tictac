import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBEhYfzA6vMlD8ADMXqLWOTRseYQK20XLY",
  authDomain: "tictac-68539.firebaseapp.com",
  projectId: "tictac-68539",
  storageBucket: "tictac-68539.firebasestorage.app",
  messagingSenderId: "699493030629",
  appId: "1:699493030629:web:056c2940da8ab860e3120c"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
