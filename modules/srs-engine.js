// modules/srs-engine.js
// RESPONSABILIDADE ÚNICA: Gerenciar a sessão de Revisão Espaçada (Active Recall),
// controlar o fluxo de perguntas (Ocultar/Revelar) e persistir o progresso SRS.

import * as state from './state.js';
import * as ui from './ui.js';
import * as firestoreService from './firestore-service.js';

let currentSession = null;

// Template do Modal de Revisão (Injetado dinamicamente)
const SRS_MODAL_HTML = `
<div id="srs-modal" class="reavaliacao-modal-overlay">
    <div class="reavaliacao-modal-content neuro-theme" style="max-width: 700px; display: flex; flex-direction: column; height: 90vh;">
        <!-- Header com Gradiente Distinto (Roxo/Azul para diferenciar do Wizard de Anotação) -->
        <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #8e44ad 0%, #3498db 100%); color: white; padding: 15px; border-radius: 8px 8px 0 0; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: white; margin: 0; font-size: 1.2em; display: flex; align-items: center; gap: 10px;">
                <span class="material-symbols-outlined">psychology</span> <span id="srs-title">Revisão Ativa</span>
            </h2>
            <button id="close-srs" class="reavaliacao-modal-close" style="color: white; opacity: 0.8; background:none; border:none; font-size:24px; cursor:pointer;">×</button>
        </div>
        
        <!-- Corpo da Revisão (Perguntas/Comparação) -->
        <div id="srs-body" style="padding: 20px; overflow-y: auto; flex-grow: 1; background: #fdfaf6;">
            <!-- Conteúdo injetado via JS -->
        </div>

        <!-- Rodapé de Ações -->
        <div id="srs-footer" class="recalculo-modal-actions" style="padding: 15px; background: #fff; border-top: 1px solid #eee; border-radius: 0 0 8px 8px; flex-shrink: 0;">
            <!-- Botões injetados via JS -->
        </div>
    </div>
</div>`;

/**
 * Inicializa o modal no DOM se ainda não existir.
 */
export function init() {
    if (!document.getElementById('srs-modal')) {
        document.body.insertAdjacentHTML('beforeend', SRS_MODAL_HTML);
        document.getElementById('close-srs').addEventListener('click', closeSession);
        
        // Expor função de processamento para botões dinâmicos
        window.processSRSResult = processSRSResult;
    }
}

/**
 * Inicia uma sessão de revisão ativa.
 * @param {number} planoIndex - Índice do plano no estado.
 * @param {string} noteId - ID da anotação (NeuroNote).
 * @param {string} type - Tipo da revisão (ex: 'D+1 (Flash)', 'D+7 (Conexão)', 'D+14 (Consolidação)').
 */
export function startSession(planoIndex, noteId, type) {
    init(); // Garante que o modal existe
    const plano = state.getPlanos()[planoIndex];
    if (!plano) return;
    
    const note = plano.neuroAnnotations.find(n => n.id === noteId);
    if (!note) return alert('Anotação não encontrada.');

    // Configura sessão atual
    currentSession = { 
        planoIndex, 
        note, 
        type, 
        step: 'recall', // Passos: 'recall' (cego) -> 'check' (comparação)
        userRecall: '' 
    };
    
    renderPhase(currentSession);
    document.getElementById('srs-modal').classList.add('visivel');
}

function closeSession() {
    document.getElementById('srs-modal').classList.remove('visivel');
    currentSession = null;
}

/**
 * Renderiza a fase atual da revisão (Recuperação ou Checagem).
 */
function renderPhase(session) {
    const body = document.getElementById('srs-body');
    const footer = document.getElementById('srs-footer');
    const title = document.getElementById('srs-title');

    title.innerText = `Revisão ${session.type} • ${session.note.chapterTitle || 'Capítulo'}`;

    // Lógica de Protocolo baseada no Relatório do Especialista
    // D+1: Foco na Tese Central / Perguntas Guia
    // D+7 / D+14: Foco no Método Feynman (Ensinar) e Conexão
    const isDeepReview = session.type.includes('D+7') || session.type.includes('D+14');
    
    if (session.step === 'recall') {
        // --- FASE 1: RECUPERAÇÃO ATIVA (BLIND MODE) ---
        
        const prompt = isDeepReview 
            ? "Explique este capítulo em voz alta ou escreva abaixo como se estivesse ensinando uma criança (Método Feynman). Tente lembrar de detalhes sem consultar."
            : "Qual é a Tese Central deste trecho? Recupere a ideia principal sem olhar suas notas.";

        body.innerHTML = `
            <div class="neuro-guide-box" style="margin-bottom: 20px;">
                <span class="material-symbols-outlined">visibility_off</span>
                <div><strong>Recuperação Ativa:</strong> Suas notas estão ocultas. O esforço de lembrar é o que fortalece a sinapse.</div>
            </div>
            
            <h3 style="color: #2c3e50; margin-bottom: 15px; font-family: 'Playfair Display', serif;">${prompt}</h3>
            
            <div style="font-style: italic; color: #7f8c8d; margin-bottom: 20px; background: #eee; padding: 8px; border-radius: 4px; display: inline-block;">
                Dica de Contexto (Tema): ${session.note.theme || 'Não definido'}
            </div>
            
            <textarea id="srs-input" class="neuro-textarea-card" rows="8" placeholder="Digite sua recuperação aqui..." style="width: 100%; box-sizing: border-box;"></textarea>
        `;

        footer.innerHTML = `
            <button id="btn-reveal" class="button-confirm" style="width: 100%; background-color: #34495e; padding: 12px;">
                <span class="material-symbols-outlined">visibility</span> Revelar Anotações Originais
            </button>
        `;

        // Listener do botão Revelar
        document.getElementById('btn-reveal').onclick = () => {
            session.userRecall = document.getElementById('srs-input').value;
            session.step = 'check';
            renderPhase(session);
        };

    } else if (session.step === 'check') {
        // --- FASE 2: CHECAGEM E CONEXÃO ---

        // Tenta recuperar o melhor texto original disponível (Tese ou Feynman)
        const originalContent = session.note.currentSession?.insights?.find(i => i.type === 'thesis')?.text 
            || session.note.meta?.find(m => m.type === 'translate')?.text 
            || session.note.meta?.find(m => m.subType === 'q1')?.text
            || "Sem registro textual estruturado para comparação.";

        // HTML para entrada de Nova Conexão (Obrigatório para D+7 e D+14 segundo relatório)
        const connectionInputHTML = isDeepReview ? `
            <div style="margin-top: 25px; padding-top: 20px; border-top: 1px dashed #ccc;">
                <label style="color: #d35400; font-weight: bold; display: block; margin-bottom: 8px;">
                    <span class="material-symbols-outlined" style="vertical-align: bottom;">link</span> Nova Conexão (Aplicação/Sermão/Outro Livro):
                </label>
                <input type="text" id="srs-connection" class="neuro-textarea-card" placeholder="Isso se conecta com..." style="width: 100%; padding: 10px;">
                <small style="color: #7f8c8d;">Obrigatório para consolidar D+7 e D+14.</small>
            </div>` : '';

        body.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%;">
                <!-- Coluna: O que eu lembrei -->
                <div style="background: #fff; padding: 15px; border: 1px solid #eee; border-radius: 8px; overflow-y: auto;">
                    <h4 style="color: #e74c3c; margin-top: 0;">Sua Recuperação</h4>
                    <p style="white-space: pre-wrap; color: #555;">${session.userRecall || '<em>(Você não digitou nada, apenas pensou)</em>'}</p>
                </div>
                
                <!-- Coluna: O que estava anotado -->
                <div style="background: #f0f9ff; padding: 15px; border: 1px solid #b3e5fc; border-radius: 8px; overflow-y: auto;">
                    <h4 style="color: #2980b9; margin-top: 0;">Registro Original</h4>
                    <p style="white-space: pre-wrap; color: #555;">${originalContent}</p>
                </div>
            </div>
            
            ${connectionInputHTML}

            <div style="margin-top: 20px; text-align: center;">
                <h4 style="color: #2c3e50;">Como foi sua recuperação?</h4>
            </div>
        `;

        footer.innerHTML = `
            <div style="display: flex; gap: 10px; width: 100%;">
                <button class="button-cancel" onclick="window.processSRSResult('retry')" style="flex: 1;">
                    <span class="material-symbols-outlined">refresh</span> Errei / Esqueci
                </button>
                <button class="button-confirm" onclick="window.processSRSResult('success')" style="background-color: #27ae60; flex: 2;">
                    <span class="material-symbols-outlined">check_circle</span> Acertei / Consolidei
                </button>
            </div>
        `;
    }
}

/**
 * Processa o resultado da revisão, atualiza o estado e salva no Firestore.
 * @param {string} result - 'success' ou 'retry'.
 */
async function processSRSResult(result) {
    const session = currentSession;
    if (!session) return;

    const plano = state.getPlanos()[session.planoIndex];
    const currentUser = state.getCurrentUser();

    // Inicializa objeto de reviews se não existir
    if (!session.note.reviewsDone) session.note.reviewsDone = { d1: false, d7: false, d14: false };

    if (result === 'success') {
        // Marca a etapa como concluída baseada no tipo da string de entrada
        if (session.type.includes('D+1')) session.note.reviewsDone.d1 = true;
        if (session.type.includes('D+7')) session.note.reviewsDone.d7 = true;
        if (session.type.includes('D+14')) session.note.reviewsDone.d14 = true;
        
        // Feedback visual
        alert(`Parabéns! Revisão ${session.type} concluída.`);
    } else {
        // Se falhou, não marca o check. 
        // O algoritmo no plano-logic continuará mostrando como pendente (ou podemos implementar lógica de reset se necessário)
        alert("Sem problemas. O esquecimento faz parte do aprendizado. Tente novamente amanhã.");
    }

    // Salva a Nova Conexão se foi preenchida
    const connectionInput = document.getElementById('srs-connection');
    if (connectionInput && connectionInput.value.trim()) {
        if (!session.note.currentSession.meta) session.note.currentSession.meta = [];
        
        // Adiciona como um meta-dado de conexão
        session.note.currentSession.meta.push({
            type: 'connection', 
            text: connectionInput.value.trim(), 
            timestamp: Date.now(),
            reviewStage: session.type
        });
    }

    // Persistência
    try {
        ui.toggleLoading(true);
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        ui.toggleLoading(false);
        
        closeSession();
        // Atualiza a UI para remover o card da revisão feita
        ui.renderApp(state.getPlanos(), currentUser); 
        
    } catch (error) {
        console.error("Erro ao salvar revisão:", error);
        alert("Erro ao salvar progresso. Verifique sua conexão.");
        ui.toggleLoading(false);
    }
}
