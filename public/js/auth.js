// public/js/auth.js

// Importamos 'auth' y 'db' que exportamos desde nuestro archivo firebase-config.js
import { auth, db } from './firebase-config.js';

// Importamos las funciones específicas de autenticación y firestore desde Firebase CDN
// ¡Asegúrate de que la versión (11.10.0) sea la misma que en firebase-config.js!
import {
    createUserWithEmailAndPassword, // Para crear un nuevo usuario (registro)
    signInWithEmailAndPassword,     // Para que un usuario existente inicie sesión
    onAuthStateChanged              // Para saber si un usuario está logueado o no
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
    doc,     // Para hacer referencia a un documento específico en Firestore
    setDoc   // Para crear o sobrescribir un documento en Firestore
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';


// ----------------------------------------------------
// 1. OBTENER LOS ELEMENTOS HTML QUE VAMOS A USAR
// ----------------------------------------------------
const loginForm = document.querySelector('#login-form');
const signupForm = document.querySelector('#signup-form');
const toggleSignupBtn = document.querySelector('#toggle-signup'); // Botón para ir a REGISTRO
const toggleLoginBtn = document.querySelector('#toggle-login');   // Botón para ir a LOGIN

const loginContainer = document.querySelector('#login-container');     // El div que contiene el formulario de LOGIN
const signupContainer = document.querySelector('#signup-container');   // El div que contiene el formulario de REGISTRO


// ----------------------------------------------------
// 2. LÓGICA PARA INICIAR SESIÓN (cuando se envía el formulario de login)
// ----------------------------------------------------
if (loginForm) { // Solo si encontramos el formulario de login en la página
    loginForm.addEventListener('submit', async e => {
        e.preventDefault(); // Evita que la página se recargue (comportamiento por defecto del formulario)

        // Obtener los valores del email y contraseña
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        try {
            // Intentar iniciar sesión con Firebase Authentication
            await signInWithEmailAndPassword(auth, email, password);
            // Si todo sale bien, redirigimos al usuario al dashboard
            window.location.href = 'dashboard.html';
        } catch (err) {
            // Si hay un error (ej. email o contraseña incorrectos), lo mostramos
            console.error('Error al iniciar sesión:', err);
            alert('Error al iniciar sesión: ' + err.message);
        }
    });
}


// ----------------------------------------------------
// 3. LÓGICA PARA CREAR UNA NUEVA CUENTA (REGISTRO)
// ----------------------------------------------------
if (signupForm) { // Solo si encontramos el formulario de registro en la página
    signupForm.addEventListener('submit', async e => {
        e.preventDefault(); // Evita que la página se recargue

        // Obtener los valores del email, contraseña y nombre del negocio
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;
        const businessName = signupForm['business-name'].value;

        try {
            // 1. Crear el usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user; // Obtenemos el objeto 'user' de la respuesta de Firebase

            // 2. Guardar información del NEGOCIO en Firestore
            // Usamos el UID del usuario (user.uid) como el ID del documento del negocio.
            // Esto vincula directamente el negocio al usuario que lo creó.
            const businessDocRef = doc(db, 'businesses', user.uid);
            await setDoc(businessDocRef, {
                ownerUid: user.uid,     // El ID del usuario que es dueño de este negocio
                name: businessName,     // Nombre del negocio
                email: email,           // Email del dueño (podría ser diferente al email de contacto del negocio)
                createdAt: new Date()   // Fecha de creación
            });

            // 3. Guardar información del USUARIO (ADMINISTRADOR) en Firestore
            // Este es el perfil del usuario que acaba de registrarse en TU plataforma.
            // Lo vinculamos al negocio que acaba de crear.
            const userDocRef = doc(db, 'users', user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,          // El ID del usuario
                email: email,           // El email del usuario
                businessId: user.uid,   // El ID del negocio al que este usuario pertenece (el mismo que su UID)
                createdAt: new Date()
            });

            alert('¡Cuenta creada exitosamente! Redirigiendo al Dashboard.');
            window.location.href = 'dashboard.html'; // Redirige al dashboard
        } catch (err) {
            console.error('Error al crear la cuenta:', err);
            if (err.code === 'auth/email-already-in-use') {
                alert('Este correo ya está registrado. Por favor, usa el formulario de inicio de sesión.');
            } else {
                alert('Error al crear la cuenta: ' + err.message);
            }
        }
    });
}


// ----------------------------------------------------
// 4. LÓGICA PARA ALTERNAR ENTRE FORMULARIO DE LOGIN Y REGISTRO
// ----------------------------------------------------
if (toggleSignupBtn) {
    toggleSignupBtn.addEventListener('click', () => {
        loginContainer.classList.add('hidden');    // Esconde el formulario de login
        signupContainer.classList.remove('hidden'); // Muestra el formulario de registro
    });
}

if (toggleLoginBtn) {
    toggleLoginBtn.addEventListener('click', () => {
        signupContainer.classList.add('hidden');    // Esconde el formulario de registro
        loginContainer.classList.remove('hidden');  // Muestra el formulario de login
    });
}


// ----------------------------------------------------
// 5. LÓGICA PARA REDIRIGIR SI EL USUARIO YA ESTÁ AUTENTICADO
// ----------------------------------------------------
// onAuthStateChanged se activa cada vez que el estado de autenticación cambia (login, logout)
// o cuando la página se carga y ya hay una sesión activa.
onAuthStateChanged(auth, user => {
    // Si hay un 'user' (significa que está logueado)
    // Y la página actual es 'auth.html' (para que no redirija infinitamente)
    if (user && window.location.pathname.endsWith('auth.html')) {
        window.location.href = 'dashboard.html'; // Lo mandamos al dashboard
    }
    // NOTA: Si no hay 'user' y está en auth.html, no hacemos nada, se queda en auth.html
});