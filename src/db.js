import firebase from "firebase/app";
import "firebase/database";

const firebaseConfig = {
	apiKey: "AIzaSyCtkXEAp8pgNmcqO9tHoDUZfJUJfn0wQlw",
	authDomain: "chatbot-7eb8f.firebaseapp.com",
	projectId: "chatbot-7eb8f",
	storageBucket: "chatbot-7eb8f.appspot.com",
	messagingSenderId: "695825043932",
	appId: "1:695825043932:web:3dd3a26f34087890c63f19",
	measurementId: "G-JYNQK5EKMK"
};

// Initialize Firebase
const db = firebase.initializeApp(firebaseConfig);
export default db;