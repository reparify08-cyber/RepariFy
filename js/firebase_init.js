// RepariFy - Firebase Initialization File (Using Firebase SDK v8 Global namespace)
// এই কনফিগারেশনটি আপনার Firebase Project Console থেকে নেওয়া হয়েছে।

const firebaseConfig = {
  apiKey: "AIzaSyDBCalxCVKnVERmpLnnCjT0X9Basy3uw7o",
  authDomain: "reparify-4db99.firebaseapp.com",
  projectId: "reparify-4db99",
  storageBucket: "reparify-4db99.firebasestorage.app",
  messagingSenderId: "1039139563247",
  appId: "1:1039139563247:web:b93c63206f03433de11d1a",
  measurementId: "G-QP5QS2WJJX" 
};

// Step 1: Initialize Firebase App (Adding safety check to prevent re-initialization errors)
let app;
if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app(); // If already initialized, use the existing app instance
}

// Step 2: Initialize Core Services as Global Variables
// এই গ্লোবাল ভেরিয়েবলগুলিই আপনার সমস্ত HTML ফাইলগুলিতে ব্যবহৃত হয়েছে।
const auth = firebase.auth(); 
const db = firebase.firestore(); 

console.log("RepariFy Firebase Initialized. Auth and Firestore services are ready.");
