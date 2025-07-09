// modules/auth.js
// RESPONSABILIDADE ÚNICA: Lidar com todas as operações do Firebase Authentication.

import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';
import { auth } from '../config/firebase-config.js';
import { emailLoginInput, passwordLoginInput } from './dom-elements.js';

/**
 * Registra um observador que reage a mudanças no estado de autenticação (login/logout).
 * @param {function} callback - A função a ser executada quando o estado do usuário mudar.
 * Ela receberá o objeto 'user' ou 'null'.
 */
export function setupAuthStateObserver(callback) {
    onAuthStateChanged(auth, callback);
}

/**
 * Tenta fazer login com email e senha.
 * @returns {Promise<UserCredential>} Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 */
export function loginWithEmailPassword() {
    const email = emailLoginInput.value;
    const password = passwordLoginInput.value;

    if (!email || !password) {
        // Não usamos alert. Rejeitamos a promessa para o chamador (UI) decidir como notificar.
        return Promise.reject(new Error("Por favor, preencha o email e a senha."));
    }

    return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Tenta criar uma nova conta com email e senha.
 * @returns {Promise<UserCredential>} Uma promessa que resolve com as credenciais do usuário em caso de sucesso.
 */
export function signupWithEmailPassword() {
    const email = emailLoginInput.value;
    const password = passwordLoginInput.value;

    if (!email || !password) {
        return Promise.reject(new Error("Por favor, preencha o email e a senha para cadastrar."));
    }
    if (password.length < 6) {
        return Promise.reject(new Error("A senha deve ter pelo menos 6 caracteres."));
    }

    return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Desconecta o usuário atualmente logado.
 * @returns {Promise<void>} Uma promessa que resolve quando o logout é concluído.
 */
export function logout() {
    return signOut(auth);
}