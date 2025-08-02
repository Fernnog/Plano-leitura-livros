// config/firebase-config.js
// --- Módulo de Configuração do Firebase ---
// Responsabilidade: Inicializar e exportar as instâncias dos serviços do Firebase.
// Este é o único lugar no app onde as chaves de API e configurações de projeto devem existir.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAMaAx8Pal440RksEnVGiVI57w1H_dcEV0",
  authDomain: "plano-de-leitura-de-livros.firebaseapp.com",
  databaseURL: "https://plano-de-leitura-de-livros-default-rtdb.firebaseio.com",
  projectId: "plano-de-leitura-de-livros",
  storageBucket: "plano-de-leitura-de-livros.firebasestorage.app",
  messagingSenderId: "329742565308",
  appId: "1:329742565308:web:93f80cf919b7aa1fddb5b9",
  measurementId: "G-XEK0TWRC98"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializa o Firebase App
const app = initializeApp(firebaseConfig);

// Inicializa e exporta os serviços que serão usados pela aplicação.
// Outros módulos importarão `auth` e `db` diretamente daqui.
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("[Firebase Config] Módulo de configuração do Firebase carregado e serviços exportados.");
