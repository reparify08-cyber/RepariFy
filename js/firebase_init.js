// RepariFy - Firebase Initialization File (Using Firebase SDK v8 Global namespace)
// এই কনফিগারেশনটি আপনার Firebase Project Console থেকে নেওয়া হয়েছে।

const firebaseConfig = {
  apiKey: "AIzaSyDBCalxCVKnVERmpLnnCjT0X9Basy3uw7o",
  authDomain: "reparify-4db99.firebaseapp.com",
  projectId: "reparify-4db99",
  storageBucket: "reparify-4db99.firebasestorage.app",
  messagingSenderId: "1039139563247",
  appId: "1:1039139563247:web:b93c63206f03433de11d1a",
  measurementId: "G-QP5QS2WJJX" // এই আইডিটি ব্যবহার না হলেও কোডে রাখা হয়েছে
};

// Step 1: Initialize Firebase App
// 'firebase' গ্লোবাল ভেরিয়েবলটি SDK স্ক্রিপ্ট ট্যাগ লোড করার পরে পাওয়া যায়।
const app = firebase.initializeApp(firebaseConfig);

// Step 2: Initialize Core Services 
// আমরা Auth এবং Firestore ব্যবহার করব, যা অন্য HTML ফাইলগুলিতে ব্যবহৃত হয়েছে।

const auth = firebase.auth(); 
const db = firebase.firestore(); 

console.log("RepariFy Firebase Initialized. Auth and Firestore services are ready.");

// Note: Analytics (getAnalytics) এবং ES Module syntax (import/export) এই v8 গ্লোবাল সিনট্যাক্সে কাজ করবে না।
// তাই শুধুমাত্র app, auth, এবং db গ্লোবাল ভেরিয়েবল ব্যবহার করা হচ্ছে।
