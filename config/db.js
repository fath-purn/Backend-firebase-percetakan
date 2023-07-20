import admin from "firebase-admin";
import serviceAccount from "../admin.json" assert { type: "json" };
import { Storage } from "@google-cloud/storage";

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://javaindo-percetakan-default-rtdb.asia-southeast1.firebasedatabase.appS"
});

const storage = new Storage({
    keyFilename: "admin.json",
});

const productRef = admin.firestore().collection("products");

const layananRef = admin.firestore().collection("layanan");

const blogRef = admin.firestore().collection("blog");

const userRef = admin.firestore().collection("users");

// For example, accessing the Firestore and Realtime Database:
const firestore = admin.firestore();
const database = admin.database();

// Or accessing the Authentication service:
const auth = admin.auth();

export { storage, auth, database, productRef, layananRef, blogRef, userRef };
