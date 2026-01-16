// modules/srs-engine.js
// RESPONSABILIDADE ÚNICA: Gerenciar a UX e Lógica das Sessões de Revisão Espaçada (SRS).
// ATUALIZADO v2.0.8: Correção de crash, lógica de D+1/D+7/D+14 e feedback visual.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';

let currentSession = null;

/**
 * Inicializa o módulo SRS injetando o modal necessário no DOM se ele não existir.
 * Chamado pelo main.js no boot da aplicação.
 */
export function init() {
    if (!document.getElementById('srs-modal')) {
        const modalHTML = `
        <div id="srs-modal" class="reavaliacao-modal-overlay">
            <div class="reavaliacao-modal-content neuro-theme" style="max-width: 600px; border-top: 5px solid #8e44ad; position: relative; overflow: hidden;">
                
                <!-- Overlay de Sucesso (Celebração) -->
                <div id="srs-celebration-overlay" style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(255,255,255,0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; opacity: 0; visibility: hidden; transition: all 0.3s ease;">
                    <span class="material-symbols-outlined" style="font-size: 4em; color: #27ae60; margin-bottom: 10px;">check_circle</span>
                    <h2 style="color: #27ae60; font-family: var(--neuro-font-serif);">Revisão Concluída!</h2>
                    <p style="color: #666;">Sinapse reforçada.</p>
                </div>

                <div class="reavaliacao-modal-header" style="border-bottom: none; padding-bottom: 0;">
                    <h2 style="color: #8e44ad; font-size: 1.2em; display: flex; align-items: center; gap: 10px;">
                        <span class="material-symbols-outlined">psychology_alt</span> 
                        <span id="srs-type-display">Revisão Ativa</span>
                    </h2>
                    <button id="close-srs-modal" class="reavaliacao-modal-close">×</button>
                </div>
                
                <div id="srs-card-container" style="padding: 20px 0;">
                    <!-- CONTEÚDO DINÂMICO -->
                    <div id="srs-front" style="text-align: center; padding: 20px;">
                        <p style="font-size: 0.9em; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Desafio de Memória</p>
                        <h3 id="srs-question" style="font-family: var(--neuro-font-serif); font-size: 1.5em; color: #2c3e50; margin: 25px 0; line-height: 1.4;"></h3>
                        <div style="width: 50px; height: 4px; background: #8e44ad; margin: 0 auto 15px auto; border-radius: 2px;"></div>
                        <p id="srs-context" style="color: #7f8c8d; font-size: 0.95em; font-style: italic;"></p>
                    </div>

                    <div id="srs-back" style="display: none; background: #fdfbf7; padding: 25px; border-radius: 8px; border: 1px solid #e0e0e0; margin-top: 10px; border-left: 4px solid #8e44ad; animation: fadeIn 0.3s ease;">
                        <p style="font-size: 0.8em; color: #999; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
                            <span class="material-symbols-outlined" style="font-size: 1.2em;">visibility</span> Resposta Original / Insight
                        </p>
                        <div id="srs-answer" style="font-family: var(--neuro-font-serif); font-size: 1.15em; color: #2c3e50; line-height: 1.6;"></div>
                    </div>
                </div>

                <div class="recalculo-modal-actions" style="justify-content: center; padding-top: 20px; border-top: 1px solid #eee;">
                    <button id="btn-srs-reveal" class="button-confirm" style="background-color: #8e44ad; width: 100%; padding: 12px; font-size: 1.1em; box-shadow: 0 4px 6px rgba(142, 68, 173, 0.2);">Mostrar Resposta</button>
                    
                    <div id="srs-grading-buttons" style="display: none; gap: 10px; width: 100%;">
                        <button class="btn-grade" data-grade="forgot" style="flex: 1; background: #fff; color: #e74c3c; border: 1px solid #e74c3c; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">Esqueci</button>
                        <button class="btn-grade" data-grade="hard" style="flex: 1; background: #fff; color: #f39c12; border: 1px solid #f39c12; padding: 10px; border-radius: 6px; cursor: pointer; transition: all 0.2s;">Difícil</button>
                        <button class="btn-grade" data-grade="good" style="flex: 1; background: #27ae60; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px rgba(39, 174, 96, 0.2); transition: all 0.2s;">Lembrei!</button>
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
            // Efeito hover simples via JS para garantir feedback
            btn.addEventListener('mouseenter', () => btn.style.transform = 'translateY(-2px)');
            btn.addEventListener('mouseleave', () => btn.style.transform = 'translateY(0)');
        });
    }
    console.log("[SRS Engine] v2.0.8 - Inicializado e Modal Injetado.");
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
    const overlay = document.getElementById('srs-celebration-overlay');

    // Reseta Overlay
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';

    typeDisplay.textContent = tipoRevisao;

    // Lógica de Conteúdo Baseada no Tipo de Revisão
    let questionText = "";
    let answerText = "";

    // Tenta pegar dados da sessão atual (se houver) ou da raiz da nota
    // Prioridade: Dados de sessão específica (v2) > Dados raiz (Legado)
    const sessionData = nota.currentSession || (nota.sessions && nota.sessions.length > 0 ? nota.sessions[nota.sessions.length - 1] : null);

    // Recuperação de Dados
    const theme = nota.theme || "";
    const thesis = (sessionData?.insights?.find(i => i.type === 'thesis')?.text) || 
                   (nota.insights?.find(i => i.type === 'thesis')?.text) || 
                   "Tese não registrada.";
                   
    const feynman = (sessionData?.meta?.find(m => m.type === 'translate')?.text) ||
                    (nota.meta?.find(m => m.type === 'translate')?.text);

    // Define Desafio com base na Curva de Esquecimento
    if (tipoRevisao.includes('D+1')) {
        questionText = theme ? `Qual é a Tese Central sobre "${theme}"?` : "Qual é a IDEIA CENTRAL (Tese) deste trecho?";
        answerText = `<strong>A Tese do Autor:</strong><br>${thesis}`;
    } else if (tipoRevisao.includes('D+7')) {
        questionText = "Explique este conceito com suas próprias palavras (Técnica Feynman) sem olhar a resposta.";
        answerText = `<strong>Sua Síntese (Feynman):</strong><br>${feynman || "<em>Não registrada, use a Tese abaixo como base:</em><br>" + thesis}`;
    } else if (tipoRevisao.includes('D+14')) {
        questionText = "Consolidação Rápida: Você consegue dar uma 'aula relâmpago' de 1 minuto sobre este tópico?";
        answerText = `<strong>Pontos Chave:</strong><br>${thesis}<br><br><em>Verifique se cobriu a essência.</em>`;
    } else {
        // Fallback genérico
        questionText = "Recuperação Livre: O que você lembra sobre isso?";
        answerText = `<strong>Tese:</strong> ${thesis}`;
    }

    questionEl.textContent = questionText;
    const sessionDate = sessionData?.date ? new Date(sessionData.date).toLocaleDateString() : 'Data N/D';
    contextEl.textContent = `${plano.titulo} • ${nota.chapterTitle || 'Leitura'} (${sessionDate})`;
    answerEl.innerHTML = answerText;

    // Reseta estado visual dos botões
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
    
    // Auto-scroll suave para a resposta
    document.getElementById('srs-back').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeSession() {
    document.getElementById('srs-modal').classList.remove('visivel');
    currentSession = null;
}

function showCelebration() {
    const overlay = document.getElementById('srs-celebration-overlay');
    if (overlay) {
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
    }
}

async function finishSession(grade) {
    if (!currentSession) return;

    // UX: Feedback imediato de sucesso
    if (grade === 'good' || grade === 'hard') {
        showCelebration();
    }

    const { planoIndex, notaId, tipo } = currentSession;
    const plano = state.getPlanoByIndex(planoIndex);
    const nota = plano.neuroAnnotations.find(n => n.id === notaId);

    if (nota) {
        if (!nota.reviewsDone) nota.reviewsDone = {};

        // Marca a revisão como feita
        if (tipo.includes('D+1')) nota.reviewsDone.d1 = true;
        if (tipo.includes('D+7')) nota.reviewsDone.d7 = true;
        if (tipo.includes('D+14')) nota.reviewsDone.d14 = true;

        // Histórico de revisão (Logbook)
        if (!nota.reviewLog) nota.reviewLog = [];
        nota.reviewLog.push({
            date: new Date().toISOString(),
            type: tipo,
            grade: grade,
            sessionDuration: Math.round((Date.now() - currentSession.dataStart) / 1000)
        });

        // Persistência no Firebase
        try {
            state.updatePlano(planoIndex, plano);
            await firestoreService.salvarPlanos(state.getCurrentUser(), state.getPlanos());
            
            // Pequeno delay para o usuário ver a celebração antes de fechar
            setTimeout(() => {
                closeSession();
                ui.renderApp(state.getPlanos(), state.getCurrentUser());
            }, 1200);
            
        } catch (error) {
            console.error("Erro ao salvar revisão SRS:", error);
            alert("Erro ao salvar progresso. Verifique sua conexão.");
            closeSession();
        }
    } else {
        closeSession();
    }
}
