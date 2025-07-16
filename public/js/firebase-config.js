// public/js/firebase-config.js

// Importa las funciones necesarias desde los SDKs de Firebase usando los URLs de CDN.
// ¡MUY IMPORTANTE! La versión debe ser 11.10.0 en todas las importaciones de Firebase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";     // <-- ¡AÑADIDO/CORREGIDO!
import { getFirestore }  from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"; // <-- ¡AÑADIDO/CORREGIDO!

// Tu objeto de configuración de Firebase copiado de la consola.
// ASEGÚRATE DE QUE ESTOS VALORES SEAN EXACTAMENTE LOS QUE TE DA TU CONSOLA DE FIREBASE.
const firebaseConfig = {
  apiKey: "AIzaSyCJq1O8dB1398eiVWCeKJzmqr5RHI_f5ho", // <- Tus valores reales
  authDomain: "nx-digital-crm.firebaseapp.com",     // <- Tus valores reales
  projectId: "nx-digital-crm",                      // <- Tus valores reales
  storageBucket: "nx-digital-crm.firebasestorage.app", // <- Tus valores reales
  messagingSenderId: "353994801329",                // <- Tus valores reales
  appId: "1:353994801329:web:783a823934dede4c06e290", // <- Tus valores reales
  measurementId: "G-14VCVW7BQ7"                     // <- Tus valores reales (opcional)
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Inicializa y EXPORTA los servicios de autenticación y base de datos que vamos a usar
export const auth = getAuth(app);       // <-- ¡AÑADIDO/CORREGIDO!
export const db   = getFirestore(app);  // <-- ¡AÑADIDO/CORREGIDO!

// Opcional: Si no vas a usar Analytics por ahora, puedes comentar o eliminar esta línea
// const analytics = getAnalytics(app);

console.log('Firebase configurado y servicios de Auth y Firestore exportados.');