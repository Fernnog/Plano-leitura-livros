// modules/srs-engine.js
// RESPONSABILIDADE ÚNICA: Gerenciar a UX e Lógica das Sessões de Revisão Espaçada (SRS).

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

let currentSession = null;

/**
 * Inicializa o módulo SRS injetando o modal necessário no DOM se ele não existir.
 * Chamado pelo main.js no boot da aplicação.
 * ATUALIZAÇÃO: Layout Flexbox para scroll interno responsivo e cabeçalho/rodapé fixos.
 */
export function init() {
    if (!document.getElementById('srs-modal')) {
        const modalHTML = `
        <div id="srs-modal" class="reavaliacao-modal-overlay">
            <!-- Container Principal: Flex Column para gerenciar altura e rolagem -->
            <div class="reavaliacao-modal-content neuro-theme" style="max-width: 600px; border-top: 5px solid #8e44ad; display: flex; flex-direction: column; max-height: 85vh; padding: 0;">
                
                <!-- HEADER (Fixo - flex-shrink: 0 impede encolhimento) -->
                <div class="reavaliacao-modal-header" style="border-bottom: 1px solid #eee; padding: 15px 25px; flex-shrink: 0; margin-bottom: 0;">
                    <h2 style="color: #8e44ad; font-size: 1.2em; display: flex; align-items: center; gap: 10px; margin: 0;">
                        <span class="material-symbols-outlined">psychology_alt</span> 
                        <span id="srs-type-display">Revisão Ativa</span>
                    </h2>
                    <button id="close-srs-modal" class="reavaliacao-modal-close" style="margin: 0;">×</button>
                </div>
                
                <!-- CORPO (Rolagem Automática - flex-grow: 1 ocupa o espaço restante) -->
                <div id="srs-card-container" style="padding: 20px 25px; overflow-y: auto; flex-grow: 1;">
                    <!-- CONTEÚDO DINÂMICO -->
                    <div id="srs-front" style="text-align: center;">
                        <p style="font-size: 0.9em; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px;">Desafio de Memória</p>
                        <h3 id="srs-question" style="font-family: var(--neuro-font-serif); font-size: 1.4em; color: #2c3e50; margin: 20px 0;"></h3>
                        <p id="srs-context" style="color: #7f8c8d; font-size: 0.9em;"></p>
                    </div>

                    <div id="srs-back" style="display: none; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px dashed #ccc; margin-top: 20px;">
                        <p style="font-size: 0.8em; color: #999; text-transform: uppercase; margin-bottom: 10px;">Resposta Original / Insight</p>
                        <div id="srs-answer" style="font-family: var(--neuro-font-serif); font-size: 1.1em; color: #2c3e50; line-height: 1.6;"></div>
                    </div>
                </div>

                <!-- FOOTER (Fixo - Botões sempre visíveis) -->
                <div class="recalculo-modal-actions" style="justify-content: center; padding: 15px 25px; border-top: 1px solid #eee; margin-top: 0; flex-shrink: 0; background: #fff; border-radius: 0 0 10px 10px;">
                    <button id="btn-srs-reveal" class="button-confirm" style="background-color: #8e44ad; width: 100%;">Mostrar Resposta</button>
                    
                    <div id="srs-grading-buttons" style="display: none; gap: 10px; width: 100%;">
                        <button class="btn-grade" data-grade="forgot" style="flex: 1; background: #e74c3c; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Esqueci</button>
                        <button class="btn-grade" data-grade="hard" style="flex: 1; background: #f39c12; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Difícil</button>
                        <button class="btn-grade" data-grade="good" style="flex: 1; background: #27ae60; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Lembrei</button>
                    </div>
                </div>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup listeners básicos
        document.getElementById('close-srs-modal').addEventListener('click', closeSession);
        document.getElementById('btn-srs-reveal').addEventListener('click', revealAnswer);
        
        document.querySelectorAll('.btn-grade').forEach(btn => {
            btn.addEventListener('click', (e) => finishSession(e.target.dataset.grade));
        });
    }
    console.log("[SRS Engine] Inicializado e Modal Injetado (Com Scroll Interno).");
}

/**
 * Inicia uma sessão de revisão.
 * @param {number} planoIndex - Índice do plano no state
 * @param {string} notaId - ID da anotação (neuroAnnotation)
 * @param {string} tipoRevisao - String identificadora (ex: 'D+1 (Estabilização)')
 */
export function startSession(planoIndex, notaId, tipoRevisao) {
    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;

    const nota = plano.neuroAnnotations.find(n => n.id === notaId);
    if (!nota) return;

    // Configura estado da sessão atual
    currentSession = {
        planoIndex,
        notaId,
        tipo: tipoRevisao,
        dataStart: Date.now()
    };

    // Prepara UI
    const modal = document.getElementById('srs-modal');
    const questionEl = document.getElementById('srs-question');
    const contextEl = document.getElementById('srs-context');
    const answerEl = document.getElementById('srs-answer');
    const typeDisplay = document.getElementById('srs-type-display');

    typeDisplay.textContent = tipoRevisao;

    // Lógica de Conteúdo Baseada no Tipo de Revisão
    let questionText = "";
    let answerText = "";

    // Tenta pegar a Tese (Voz do Autor) ou Síntese (Feynman)
    const thesis = (nota.currentSession?.insights?.find(i => i.type === 'thesis')?.text) || 
                   (nota.insights?.find(i => i.type === 'thesis')?.text);
                   
    const feynman = (nota.currentSession?.meta?.find(m => m.type === 'translate')?.text) ||
                    (nota.meta?.find(m => m.type === 'translate')?.text);

    // Define Desafio
    if (tipoRevisao.includes('D+1')) {
        questionText = "Qual é a IDEIA CENTRAL (Tese) deste trecho?";
        answerText = thesis || "Tese não encontrada. Revise suas anotações completas.";
    } else if (tipoRevisao.includes('D+7')) {
        questionText = "Explique este conceito com suas palavras (Técnica Feynman) sem olhar.";
        answerText = feynman || thesis || "Síntese não encontrada.";
    } else {
        questionText = "Recuperação Livre: O que você lembra sobre isso?";
        answerText = `Tese: ${thesis || '...'}<br><br>Síntese: ${feynman || '...'}`;
    }

    questionEl.textContent = questionText;
    contextEl.textContent = `${plano.titulo} • ${nota.chapterTitle || 'Leitura'}`;
    answerEl.innerHTML = answerText;

    // Reseta estado visual
    document.getElementById('srs-front').style.display = 'block';
    document.getElementById('srs-back').style.display = 'none';
    document.getElementById('btn-srs-reveal').style.display = 'block';
    document.getElementById('srs-grading-buttons').style.display = 'none';

    modal.classList.add('visivel');
}

function revealAnswer() {
    document.getElementById('srs-back').style.display = 'block';
    document.getElementById('btn-srs-reveal').style.display = 'none';
    document.getElementById('srs-grading-buttons').style.display = 'flex';
    
    // Auto-scroll para o final do container para garantir que a resposta apareça
    const container = document.getElementById('srs-card-container');
    setTimeout(() => {
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function closeSession() {
    document.getElementById('srs-modal').classList.remove('visivel');
    currentSession = null;
}

async function finishSession(grade) {
    if (!currentSession) return;

    const { planoIndex, notaId, tipo } = currentSession;
    const plano = state.getPlanoByIndex(planoIndex);
    const nota = plano.neuroAnnotations.find(n => n.id === notaId);

    if (nota) {
        if (!nota.reviewsDone) nota.reviewsDone = {};

        // Marca a revisão como feita baseada no tipo (string matching simples por enquanto)
        if (tipo.includes('D+1')) nota.reviewsDone.d1 = true;
        if (tipo.includes('D+7')) nota.reviewsDone.d7 = true;
        if (tipo.includes('D+14')) nota.reviewsDone.d14 = true;

        // Opcional: Salvar histórico de grades (grade: 'good' | 'hard' | 'forgot')
        if (!nota.reviewLog) nota.reviewLog = [];
        nota.reviewLog.push({
            date: new Date().toISOString(),
            type: tipo,
            grade: grade
        });

        // Persistência
        state.updatePlano(planoIndex, plano);
        await firestoreService.salvarPlanos(state.getCurrentUser(), state.getPlanos());
        
        // Atualiza UI principal
        ui.renderApp(state.getPlanos(), state.getCurrentUser());
    }

    closeSession();
}
