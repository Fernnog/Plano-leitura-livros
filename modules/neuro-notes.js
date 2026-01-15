// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (Wizard M.E.T.A.),
// persistência local/remota, exportação e Diário de Bordo (Histórico).
// ATUALIZADO v2.1.0: Refatoração Visual do Header (Degradê & Contraste) e Modo Foco.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';
import { attachDictationToInput } from './dictation-widget.js';
import { processTextWithAI } from './ai-service.js';
import { validateSessionRange, validateCognitiveQuality } from './validators.js';

// --- Variáveis de Estado Local ---
let tempNoteData = {
    id: null,
    chapterTitle: '', 
    theme: '', 
    pageStart: null,
    pageEnd: null,
    sessions: [], 
    currentSession: {
        id: null,
        sessionTopic: '',
        pStart: null, 
        pEnd: null,   
        date: null,
        insights: [],
        meta: [],
        triggers: [],
        flags: { blindModeRespect: false }
    }
};

let currentPlanoIndex = null;
let currentDiaIndex = null;
let currentStepIndex = 0;
let saveTimeout = null;
let isDirty = false;

// Controle de Edição de Histórico
let editingSessionId = null; 

// --- Configuração dos Passos do Wizard (M.E.T.A. v2.5) ---
const WIZARD_STEPS = [
    {
        id: 'map',
        title: 'M - Mapear (Priming)',
        icon: 'map',
        guide: '<strong>Priming:</strong> O cérebro ignora o que não busca. Defina o recorte da sessão e suas perguntas.',
        validation: () => {
             const theme = document.getElementById('meta-theme')?.value;
             const q1 = document.getElementById('meta-map-q1')?.value;
             return theme && theme.length > 3 && q1 && q1.length > 3;
        },
        render: (data) => `
            <!-- Definição de Sub-período da Sessão -->
            <div class="neuro-input-group" style="background: #f8f9fa; padding: 10px; border-radius: 6px; border: 1px dashed #ced4da; margin-bottom: 15px;">
                <label style="color: var(--neuro-accent); font-weight: bold;">Recorte desta Sessão (Sub-período)</label>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                    <div style="flex: 1;">
                        <span style="font-size: 0.8em; color: #666;">Pág. Inicial</span>
                        <input type="number" id="session-p-start" class="neuro-textarea-card" style="padding: 8px;" placeholder="${data.pageStart || 'De'}" value="${data.currentSession.pStart || ''}">
                    </div>
                    <div style="flex: 1;">
                        <span style="font-size: 0.8em; color: #666;">Pág. Final</span>
                        <input type="number" id="session-p-end" class="neuro-textarea-card" style="padding: 8px;" placeholder="${data.pageEnd || 'Até'}" value="${data.currentSession.pEnd || ''}">
                    </div>
                </div>
            </div>

            <div class="neuro-input-group">
                <label>Tema Central (Sobre o que é este trecho em 1 linha?)</label>
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <input type="text" id="meta-theme" class="neuro-textarea-card voice-me-input" maxlength="100" placeholder="Ex: A justificação pela fé..." value="${data.theme || ''}">
                    <span id="counter-meta-theme" class="char-counter">0/100</span>
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Pergunta Guia 1 (O que quero entender?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="meta-map-q1" class="neuro-textarea-card voice-me-input" placeholder="Ex: Qual é o argumento central?" value="${data.currentSession.meta.find(m => m.subType === 'q1')?.text || ''}" style="flex-grow: 1;">
                    ${createMicBtn('meta-map-q1')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Pergunta Guia 2 (O que quero aplicar?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="meta-map-q2" class="neuro-textarea-card voice-me-input" placeholder="Ex: Como isso muda minha prática?" value="${data.currentSession.meta.find(m => m.subType === 'q2')?.text || ''}" style="flex-grow: 1;">
                    ${createMicBtn('meta-map-q2')}
                </div>
            </div>
        `
    },
    {
        id: 'engage',
        title: 'E - Engajar (Voz do Autor)',
        icon: 'menu_book',
        guide: '<strong>Leitura Ativa:</strong> Registre o que o AUTOR disse. Seja fiel ao texto. Limite-se ao essencial.',
        validation: () => document.getElementById('engage-thesis')?.value.trim().length > 5,
        render: (data) => `
            <div class="neuro-input-group">
                <label>Frase-Tese do Autor (Ideia Central)</label>
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <div style="display: flex; gap: 8px; align-items: flex-start;">
                        <textarea id="engage-thesis" class="neuro-textarea-card voice-author-input" rows="3" maxlength="900" placeholder="O autor argumenta que..." style="flex-grow: 1;">${data.currentSession.insights.find(i => i.type === 'thesis')?.text || ''}</textarea>
                        ${createMagicBtn('engage-thesis')}
                        ${createMicBtn('engage-thesis')}
                    </div>
                    <span id="counter-engage-thesis" class="char-counter">0/900 (Forçar Síntese)</span>
                </div>
            </div>
            
            <div class="neuro-input-group">
                <label>Conceitos Chave (Bullets)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="engage-concepts" class="neuro-textarea-card voice-author-input" rows="2" placeholder="- Conceito A&#10;- Conceito B" style="flex-grow: 1;">${data.currentSession.insights.find(i => i.type === 'concepts')?.text || ''}</textarea>
                    ${createMicBtn('engage-concepts')}
                </div>
            </div>

            <div class="neuro-input-group">
                <label>Evidência / Referência (O que sustenta a tese?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="engage-evidence" class="neuro-textarea-card voice-author-input" placeholder="Ex: Citação de Romanos 5 ou Exemplo do Barco..." value="${data.currentSession.insights.find(i => i.type === 'evidence')?.text || ''}" style="flex-grow: 1;">
                    ${createMicBtn('engage-evidence')}
                </div>
            </div>
        `
    },
    {
        id: 'translate',
        title: 'T - Traduzir (Recuperação)',
        icon: 'psychology',
        guide: '<strong>Modo Cego:</strong> Sem olhar suas notas anteriores, explique o conceito. Identifique onde travou.',
        render: (data) => `
            <div style="margin-bottom: 20px; padding: 10px; background: #eee; border-radius: 5px; filter: blur(4px); transition: filter 0.3s;" onmouseenter="this.style.filter='none'" onmouseleave="this.style.filter='blur(4px)'">
                <small>Notas Anteriores (Passe o mouse se necessário):</small><br>
                <em>${data.currentSession.insights.find(i => i.type === 'thesis')?.text || '...'}</em>
            </div>
            
            <div class="neuro-input-group">
                <label>Minha Síntese (Técnica Feynman)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="translate-feynman" class="neuro-textarea-card voice-me-input" rows="4" placeholder="Basicamente, isso significa que..." style="flex-grow: 1;">${data.currentSession.meta.find(m => m.type === 'translate')?.text || ''}</textarea>
                    ${createMagicBtn('translate-feynman')}
                    ${createMicBtn('translate-feynman')}
                </div>
            </div>

            <div class="neuro-input-group" style="border-left: 3px solid #e67e22; padding-left: 10px;">
                <label style="color:#e67e22;">Ponto de Confusão (O que não ficou claro?)</label>
                <input type="text" id="translate-gap" class="neuro-textarea-card" placeholder="Ex: Não entendi a relação entre X e Y..." value="${data.currentSession.meta.find(m => m.subType === 'gap')?.text || ''}">
            </div>

            <div style="margin-top:15px; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="check-blind-mode" ${data.currentSession.flags?.blindModeRespect ? 'checked' : ''} onchange="updateFlagData('blindModeRespect', this.checked)">
                <label for="check-blind-mode" style="font-size:0.9em; color:#555;">Confirmo que escrevi a síntese <strong>sem olhar</strong> o texto original.</label>
            </div>
        `
    },
    {
        id: 'apply',
        title: 'A - Aplicar (C.A.P.E.)',
        icon: 'rocket_launch',
        guide: '<strong>Praxis:</strong> Conhecimento sem afeto é apenas informação. Valide sua retenção.',
        render: (data) => `
             <div class="neuro-input-group">
                <label>Confronto (O que isso desafiou em mim?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="apply-confront" class="neuro-textarea-card voice-me-input" placeholder="Confrontou minha ideia de que..." value="${data.currentSession.triggers.find(t => t.subType === 'confront')?.text || ''}" style="flex-grow: 1;">
                    ${createMagicBtn('apply-confront')}
                    ${createMicBtn('apply-confront')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Micro-Ação (Para as próximas 24h)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="apply-action" class="neuro-textarea-card voice-me-input" placeholder="Vou..." value="${data.currentSession.meta.find(m => m.type === 'apply')?.text || ''}" style="flex-grow: 1;">
                    ${createMagicBtn('apply-action')}
                    ${createMicBtn('apply-action')}
                </div>
            </div>
        `
    }
];

// --- Helpers de Botões ---
function createMicBtn(targetId) {
    return `<button type="button" id="mic-${targetId}" class="btn-neuro-mic" title="Ditar com IA"><span class="material-symbols-outlined">mic</span></button>`;
}

function createMagicBtn(targetId) {
    return `<button type="button" id="magic-${targetId}" class="btn-neuro-magic" title="Corrigir texto com IA"><span class="material-symbols-outlined">auto_fix_high</span></button>`;
}

// --- Migração e Inicialização ---

function migrateLegacyData(oldData) {
    if (!oldData) {
        return {
            id: crypto.randomUUID(),
            chapterTitle: '', 
            theme: '',
            pageStart: null,
            pageEnd: null,
            sessions: [], 
            currentSession: {
                id: crypto.randomUUID(),
                sessionTopic: '',
                pStart: null,
                pEnd: null,
                date: new Date().toISOString(),
                insights: [],
                meta: [],
                triggers: [],
                flags: { blindModeRespect: false }
            }
        };
    }
    if (oldData.currentSession) {
        if (oldData.currentSession.pStart === undefined) oldData.currentSession.pStart = null;
        if (oldData.currentSession.pEnd === undefined) oldData.currentSession.pEnd = null;
        return oldData;
    }

    return {
        id: oldData.id || crypto.randomUUID(),
        chapterTitle: oldData.chapterTitle || '',
        theme: oldData.theme || '',
        pageStart: oldData.pageStart || null,
        pageEnd: oldData.pageEnd || null,
        sessions: [],
        currentSession: {
            id: crypto.randomUUID(),
            sessionTopic: 'Sessão Inicial (Migrada)',
            pStart: oldData.pageStart || null, 
            pEnd: oldData.pageEnd || null,
            date: oldData.updatedAt || new Date().toISOString(),
            insights: oldData.insights || [],
            meta: oldData.meta || [],
            triggers: oldData.triggers || [],
            flags: oldData.flags || { blindModeRespect: false }
        }
    };
}

// --- Gerenciamento do Modal Principal (REVISADO) ---

export function openNoteModal(planoIndex, diaIndex = null) {
    const modal = document.getElementById('neuro-modal');
    if (!modal) {
        console.error("ERRO CRÍTICO: Modal #neuro-modal não encontrado no HTML.");
        return;
    }

    // Configura o fechamento inteligente (Auto-Save)
    const closeBtn = document.getElementById('close-neuro-modal');
    if (closeBtn) closeBtn.onclick = closeNoteModal;

    // --- INJEÇÃO DO MODO FOCO (Botão Expandir) ---
    // Garante que o botão de expandir exista no header, similar ao Logbook
    const headerContainer = document.querySelector('#neuro-modal .reavaliacao-modal-header');
    if (headerContainer && !document.getElementById('toggle-focus-neuro')) {
        // Cria container de controles se não existir (para agrupar expand e close)
        let controlsDiv = headerContainer.querySelector('.neuro-controls-group');
        if (!controlsDiv) {
            controlsDiv = document.createElement('div');
            controlsDiv.className = 'neuro-controls-group';
            controlsDiv.style.display = 'flex';
            controlsDiv.style.alignItems = 'center';
            controlsDiv.style.gap = '10px';
            
            // Move o botão de fechar existente para dentro do grupo, se ele estiver solto no header
            if (closeBtn && closeBtn.parentNode === headerContainer) {
                headerContainer.removeChild(closeBtn);
                controlsDiv.appendChild(closeBtn);
            }
            headerContainer.appendChild(controlsDiv);
        }

        const btnFocus = document.createElement('button');
        btnFocus.id = 'toggle-focus-neuro';
        btnFocus.className = 'btn-expand-modal';
        btnFocus.title = 'Modo Foco (Expandir/Contrair)';
        btnFocus.style.background = 'none';
        btnFocus.style.border = 'none';
        btnFocus.style.color = 'white'; // Força branco
        btnFocus.style.cursor = 'pointer';
        btnFocus.style.display = 'flex';
        btnFocus.style.alignItems = 'center';
        btnFocus.innerHTML = '<span class="material-symbols-outlined" style="font-size: 1.2em;">open_in_full</span>';

        // Insere antes do botão de fechar
        if (closeBtn) {
            controlsDiv.insertBefore(btnFocus, closeBtn);
        } else {
            controlsDiv.appendChild(btnFocus);
        }

        // Event Listener para alternar classe
        btnFocus.addEventListener('click', function() {
            const modalContent = this.closest('.reavaliacao-modal-content');
            modalContent.classList.toggle('modal-expanded');
            const icon = this.querySelector('span');
            icon.textContent = modalContent.classList.contains('modal-expanded') ? 'close_fullscreen' : 'open_in_full';
        });
    }
    // --- FIM DA INJEÇÃO ---

    currentPlanoIndex = planoIndex;
    currentDiaIndex = diaIndex;
    currentStepIndex = 0;
    isDirty = false;
    editingSessionId = null; 

    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;

    let annotationFound = (plano.neuroAnnotations || []).find(note => {
        if (diaIndex !== null && plano.diasPlano[diaIndex]) {
            const dia = plano.diasPlano[diaIndex];
            return (dia.paginaInicioDia <= note.pageEnd && dia.paginaFimDia >= note.pageStart);
        }
        return false;
    }) || (plano.neuroAnnotations?.[plano.neuroAnnotations.length - 1]);

    if (annotationFound) {
        tempNoteData = migrateLegacyData(annotationFound);
    } else {
        tempNoteData = migrateLegacyData(null);
        if (diaIndex !== null && plano.diasPlano[diaIndex]) {
            const dia = plano.diasPlano[diaIndex];
            tempNoteData.chapterTitle = `Leitura Pág. ${dia.paginaInicioDia} - ${dia.paginaFimDia}`;
            tempNoteData.pageStart = dia.paginaInicioDia;
            tempNoteData.pageEnd = dia.paginaFimDia;
            tempNoteData.currentSession.pStart = dia.paginaInicioDia;
            tempNoteData.currentSession.pEnd = dia.paginaFimDia;
        }
    }

    renderModalUI();
    modal.classList.add('visivel');
}

export function editSessionFromHistory(planoIndex, annotationId, sessionId) {
    const modal = document.getElementById('neuro-modal');
    if (!modal) return;
    
    // Configura o fechamento inteligente (Auto-Save)
    document.getElementById('close-neuro-modal').onclick = closeNoteModal;

    currentPlanoIndex = planoIndex;
    currentStepIndex = 0;
    isDirty = false;
    editingSessionId = sessionId;

    const plano = state.getPlanoByIndex(planoIndex);
    const annotation = plano.neuroAnnotations.find(n => n.id === annotationId);
    
    if (!annotation) return;

    tempNoteData = JSON.parse(JSON.stringify(annotation)); 
    
    const sessionToEdit = tempNoteData.sessions.find(s => s.id === sessionId);
    if (!sessionToEdit) return;

    tempNoteData.currentSession = sessionToEdit;

    renderModalUI();
    modal.classList.add('visivel');
}

function closeNoteModal() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        performSilentSave().then(() => {
            document.getElementById('neuro-modal').classList.remove('visivel');
        });
    } else {
        document.getElementById('neuro-modal').classList.remove('visivel');
    }
}

// --- RENDERIZAÇÃO DO WIZARD (CORE) ---

function renderModalUI() {
    const modalBody = document.getElementById('neuro-modal-body');
    
    // --- REFATORAÇÃO VISUAL DO HEADER (Degradê e Contraste) ---
    const headerContainer = document.querySelector('#neuro-modal .reavaliacao-modal-header');
    const headerTitle = document.querySelector('#neuro-modal-title');
    const closeBtn = document.getElementById('close-neuro-modal');
    const expandBtn = document.getElementById('toggle-focus-neuro');

    if (headerContainer) {
        // Define degradê baseado no contexto (Novo ou Edição)
        // Novo: Azul Profundo | Edição: Laranja Alerta
        const bgStyle = editingSessionId 
            ? 'linear-gradient(135deg, #f39c12 0%, #d35400 100%)' 
            : 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)';
        
        headerContainer.style.background = bgStyle;
        headerContainer.style.color = 'white'; // Texto branco global no header
        headerContainer.style.borderBottom = 'none'; // Remove bordas simples
        
        // Garante flexbox para alinhamento correto
        if (headerContainer.style.display !== 'flex') {
            headerContainer.style.display = 'flex';
            headerContainer.style.justifyContent = 'space-between';
            headerContainer.style.alignItems = 'center';
        }
    }

    if (headerTitle) {
        headerTitle.style.color = 'white'; // Força título branco
        headerTitle.innerHTML = editingSessionId 
            ? `<span class="material-symbols-outlined" style="color:white; margin-right:8px;">history_edu</span> Edição de Histórico`
            : `<span class="material-symbols-outlined" style="color:white; margin-right:8px;">psychology</span> Neuro-Insights`;
    }

    // Garante visibilidade dos botões de controle sobre o fundo colorido
    if (closeBtn) {
        closeBtn.style.color = 'white';
        closeBtn.style.opacity = '0.9';
        closeBtn.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
    }
    if (expandBtn) {
        expandBtn.style.color = 'white';
        expandBtn.style.opacity = '0.9';
        expandBtn.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
    }
    // --- FIM DA REFATORAÇÃO VISUAL ---

    const step = WIZARD_STEPS[currentStepIndex];

    const headerContextHTML = `
        <div class="neuro-context-header" style="${editingSessionId ? 'border-color:var(--neuro-accent); background:#fff9f5;' : ''}">
            <div class="neuro-macro-context">
                <span class="context-label"><span class="material-symbols-outlined">library_books</span> Capítulo/Tema (Contexto Maior):</span>
                <div class="inputs-row">
                    <input type="text" id="neuro-chapter" value="${tempNoteData.chapterTitle}" class="voice-me-input macro-input" onchange="updateContextData('macro')">
                    <div class="range-inputs">
                        <input type="number" id="neuro-range-start" value="${tempNoteData.pageStart || ''}" placeholder="Pág Ini" onchange="updateContextData('range')">
                        <span>a</span>
                        <input type="number" id="neuro-range-end" value="${tempNoteData.pageEnd || ''}" placeholder="Pág Fim" onchange="updateContextData('range')">
                    </div>
                </div>
            </div>
            <div class="neuro-micro-context">
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <span class="context-label"><span class="material-symbols-outlined">event_note</span> Sessão de ${new Date(tempNoteData.currentSession.date).toLocaleDateString()}:</span>
                    <span id="save-indicator" class="save-status">
                        ${editingSessionId ? 'MODO EDIÇÃO' : (isDirty ? 'Não salvo' : 'Sincronizado')}
                    </span>
                </div>
                <input type="text" id="neuro-session-topic" value="${tempNoteData.currentSession.sessionTopic || ''}" class="voice-me-input micro-input" onchange="updateContextData('micro')" placeholder="Tópico específico desta sessão...">
            </div>
        </div>`;
    
    const progressHTML = WIZARD_STEPS.map((s, idx) => `<div class="neuro-step-indicator ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}"></div>`).join('');

    modalBody.innerHTML = `
        ${headerContextHTML}
        <div class="neuro-wizard-progress">${progressHTML}</div>
        <div class="wizard-step-container fade-in">
            <div class="wizard-step-title"><span class="material-symbols-outlined">${step.icon}</span> ${step.title}</div>
            <div class="neuro-guide-box"><span class="material-symbols-outlined">lightbulb</span><div>${step.guide}</div></div>
            <div id="step-content">${step.render(tempNoteData)}</div>
        </div>`;

    updateWizardButtons();
    attachToolsToInputs();
    attachCharCounters(); 
}

function updateWizardButtons() {
    const footer = document.querySelector('#neuro-modal .recalculo-modal-actions');
    const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
    
    footer.innerHTML = `
        <div style="display: flex; gap: 10px; width: 100%;">
            ${currentStepIndex > 0 ? `<button id="btn-prev-step" style="background:none; border:1px solid #ccc; padding:10px 15px; border-radius:5px; cursor:pointer;">Voltar</button>` : `<button id="btn-reset-neuro" style="background:none; border:1px solid #e74c3c; color:#e74c3c; padding:10px 15px; border-radius:5px; cursor:pointer;">Nova Sessão</button>`}
            <div style="flex-grow:1;"></div>
            ${isLastStep ? `<button id="btn-save-neuro" class="button-confirm" style="background-color: #27ae60; padding: 10px 25px;">${editingSessionId ? 'Atualizar Registro' : 'Concluir Sessão'}</button>` : `<button id="btn-next-step" class="button-confirm" style="background-color: var(--neuro-accent); padding: 10px 25px; display:flex; align-items:center; gap:5px;">Próximo Passo <span class="material-symbols-outlined" style="font-size:1em;">arrow_forward</span></button>`}
        </div>`;

    document.getElementById('btn-next-step')?.addEventListener('click', handleNextStep);
    document.getElementById('btn-prev-step')?.addEventListener('click', () => { saveCurrentStepData(); currentStepIndex--; renderModalUI(); });
    document.getElementById('btn-save-neuro')?.addEventListener('click', async () => { saveCurrentStepData(); await saveNote(); });
    document.getElementById('btn-reset-neuro')?.addEventListener('click', handleNewSession);
}

function handleNextStep() {
    const step = WIZARD_STEPS[currentStepIndex];
    saveCurrentStepData(); 

    // --- Validação Arquitetural ---
    if (currentStepIndex === 0) {
        const pStart = document.getElementById('session-p-start').value;
        const pEnd = document.getElementById('session-p-end').value;
        const validation = validateSessionRange(pStart, pEnd, tempNoteData.pageStart, tempNoteData.pageEnd);
        if (!validation.valid) { alert(`⚠️ Atenção Cognitiva: ${validation.msg}`); return; }
    }

    if (currentStepIndex === 1) {
        const thesis = document.getElementById('engage-thesis')?.value;
        const validation = validateCognitiveQuality(thesis, 15);
        if(!validation.valid) { alert(`⚠️ Atenção Cognitiva: ${validation.msg}`); return; }
    }

    if (step.validation && !step.validation()) {
        alert("⚠️ Guardrail Ativado: Por favor, preencha os campos essenciais para garantir sua retenção.");
        return;
    }
    currentStepIndex++;
    renderModalUI();
}

window.handleNewSession = () => {
    if(!confirm("Deseja arquivar a sessão atual e iniciar um novo dia de estudo neste capítulo?")) return;
    
    const hasContent = tempNoteData.currentSession.insights.length > 0 || tempNoteData.currentSession.meta.length > 0;
    if(hasContent) tempNoteData.sessions.push({...tempNoteData.currentSession});
    
    tempNoteData.currentSession = { 
        id: crypto.randomUUID(), 
        sessionTopic: '', 
        pStart: null, 
        pEnd: null,
        date: new Date().toISOString(), 
        insights: [], 
        meta: [], 
        triggers: [], 
        flags: { blindModeRespect: false } 
    };
    
    currentStepIndex = 0; 
    editingSessionId = null; 
    renderModalUI(); 
    isDirty = true; 
    scheduleAutoSave();
};

// --- LÓGICA DE PERSISTÊNCIA AUTOMÁTICA ---

function scheduleAutoSave() {
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) { saveIndicator.innerText = "Salvando..."; saveIndicator.style.color = "#e67e22"; }
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => { await performSilentSave(); }, 2000);
}

async function performSilentSave() {
    if (!isDirty) return;
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    if (!plano) return;

    const annotation = plano.neuroAnnotations.find(n => n.id === tempNoteData.id);
    
    // CORREÇÃO SRS: Timestamp atual para cálculos de revisão
    const timestampAgora = new Date().toISOString();

    if (annotation) {
        annotation.chapterTitle = tempNoteData.chapterTitle;
        annotation.theme = tempNoteData.theme;
        annotation.pageStart = tempNoteData.pageStart;
        annotation.pageEnd = tempNoteData.pageEnd;
        annotation.sessions = tempNoteData.sessions;
        
        // Atualiza Data Base para SRS
        annotation.updatedAt = timestampAgora;

        if (editingSessionId) {
            const sIdx = annotation.sessions.findIndex(s => s.id === editingSessionId);
            if (sIdx !== -1) annotation.sessions[sIdx] = { ...tempNoteData.currentSession };
        } else {
            annotation.currentSession = { ...tempNoteData.currentSession };
        }
    } else {
        // Nova anotação: Define datas de criação e atualização na RAIZ
        tempNoteData.createdAt = timestampAgora;
        tempNoteData.updatedAt = timestampAgora;
        if (!tempNoteData.timestamp) tempNoteData.timestamp = Date.now();

        plano.neuroAnnotations.push(tempNoteData);
    }

    try {
        const currentUser = state.getCurrentUser();
        if (currentUser) await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        const si = document.getElementById('save-indicator');
        if (si) { si.innerText = editingSessionId ? "ALTERAÇÃO SALVA ✓" : "Sincronizado ✓"; si.style.color = "#27ae60"; }
        isDirty = false;
    } catch (e) { console.warn("Erro no auto-save:", e); }
}

function saveCurrentStepData() {
    const theme = document.getElementById('meta-theme')?.value;
    if (theme !== undefined && tempNoteData.theme !== theme) { tempNoteData.theme = theme; isDirty = true; }

    const pStart = document.getElementById('session-p-start')?.value;
    if (pStart !== undefined) { 
        const val = parseInt(pStart) || null;
        if(tempNoteData.currentSession.pStart !== val) { tempNoteData.currentSession.pStart = val; isDirty = true; }
    }
    const pEnd = document.getElementById('session-p-end')?.value;
    if (pEnd !== undefined) {
        const val = parseInt(pEnd) || null;
        if(tempNoteData.currentSession.pEnd !== val) { tempNoteData.currentSession.pEnd = val; isDirty = true; }
    }
    
    const q1 = document.getElementById('meta-map-q1')?.value; if (q1 !== undefined) upsertMeta('map', q1, 'q1');
    const q2 = document.getElementById('meta-map-q2')?.value; if (q2 !== undefined) upsertMeta('map', q2, 'q2');
    const thesis = document.getElementById('engage-thesis')?.value; if (thesis !== undefined) upsertInsight('thesis', thesis);
    const concepts = document.getElementById('engage-concepts')?.value; if (concepts !== undefined) upsertInsight('concepts', concepts);
    const evidence = document.getElementById('engage-evidence')?.value; if (evidence !== undefined) upsertInsight('evidence', evidence);
    const feynman = document.getElementById('translate-feynman')?.value; if (feynman !== undefined) upsertMeta('translate', feynman);
    const gap = document.getElementById('translate-gap')?.value; if (gap !== undefined) upsertMeta('translate', gap, 'gap');
    const action = document.getElementById('apply-action')?.value; if (action !== undefined) upsertMeta('apply', action);
    const confront = document.getElementById('apply-confront')?.value; if (confront !== undefined) upsertTrigger('confront', confront);
    if (isDirty) scheduleAutoSave();
}

function upsertMeta(type, text, subType = null) {
    const target = tempNoteData.currentSession.meta;
    const idx = target.findIndex(m => m.type === type && m.subType === subType);
    if (idx >= 0) { if (target[idx].text !== text) { target[idx].text = text; isDirty = true; } }
    else if (text?.trim()) { target.push({ type, subType, text, timestamp: Date.now() }); isDirty = true; }
}

function upsertInsight(type, text) {
    const target = tempNoteData.currentSession.insights;
    const idx = target.findIndex(i => i.type === type);
    if (idx >= 0) { if (target[idx].text !== text) { target[idx].text = text; isDirty = true; } }
    else if (text?.trim()) { target.push({ type, text, timestamp: Date.now() }); isDirty = true; }
}

function upsertTrigger(subType, text) {
     const target = tempNoteData.currentSession.triggers;
     const idx = target.findIndex(t => t.subType === subType);
     if (idx >= 0) { if (target[idx].text !== text) { target[idx].text = text; isDirty = true; } }
     else if (text?.trim()) { target.push({ type: 'emotion', subType, text, timestamp: Date.now() }); isDirty = true; }
}

function attachCharCounters() {
    const update = (input, counterId) => {
        const c = document.getElementById(counterId); if (!c) return;
        c.innerText = `${input.value.length}/${input.getAttribute('maxlength')}`;
    };
    const map = [{ id: 'meta-theme', c: 'counter-meta-theme' }, { id: 'engage-thesis', c: 'counter-engage-thesis' }];
    map.forEach(item => { const el = document.getElementById(item.id); if (el) { update(el, item.c); el.addEventListener('input', () => update(el, item.c)); } });
}

function attachToolsToInputs() {
    setTimeout(() => {
        document.querySelectorAll('textarea, input[type="text"]').forEach(input => {
            const mic = document.getElementById(`mic-${input.id}`); if (mic) attachDictationToInput(input, mic);
            const magic = document.getElementById(`magic-${input.id}`);
            if (magic) {
                magic.addEventListener('click', async () => {
                    const original = input.value; if (!original.trim()) return;
                    magic.disabled = input.disabled = true;
                    try { input.value = await processTextWithAI(original); input.dispatchEvent(new Event('input')); isDirty = true; scheduleAutoSave(); } 
                    catch (e) { alert("Erro na IA."); } finally { magic.disabled = input.disabled = false; }
                });
            }
        });
    }, 50);
}

async function saveNote() {
    if (saveTimeout) clearTimeout(saveTimeout);
    isDirty = true; await performSilentSave();
    closeNoteModal();
    if (state.getCurrentUser()) ui.renderApp(state.getPlanos(), state.getCurrentUser());
}

// --- EXPORTAÇÃO E CONSOLIDAÇÃO ---

function generateConsolidatedReport(note) {
    let md = `# 📚 Relatório Consolidado: ${note.chapterTitle}\n`;
    if(note.theme) md += `**Tema Central do Capítulo:** ${note.theme}\n`;
    md += `**Intervalo Geral de Páginas:** ${note.pageStart || '?'} - ${note.pageEnd || '?'}\n\n`;
    md += `---\n\n`;

    const allSessions = [...(note.sessions || []), note.currentSession];
    const validSessions = allSessions.filter(s => s.sessionTopic || s.insights.length > 0 || s.meta.length > 0);

    validSessions.forEach((session, index) => {
        const dateStr = session.date ? new Date(session.date).toLocaleDateString() : 'Data N/D';
        const pagesStr = (session.pStart && session.pEnd) ? `(Págs. ${session.pStart}-${session.pEnd})` : '';
        
        md += `## Sessão ${index + 1}: ${session.sessionTopic || 'Sem Título'} ${pagesStr}\n`;
        md += `*Data: ${dateStr}*\n\n`;

        const q1 = session.meta.find(m => m.subType === 'q1');
        const q2 = session.meta.find(m => m.subType === 'q2');
        if(q1 || q2) {
            md += `### 🎯 Intenção (Priming)\n`;
            if(q1) md += `- **Foco Cognitivo:** ${q1.text}\n`;
            if(q2) md += `- **Foco Prático:** ${q2.text}\n`;
            md += `\n`;
        }

        const thesis = session.insights.find(i => i.type === 'thesis');
        const evidence = session.insights.find(i => i.type === 'evidence');
        if(thesis || evidence) {
            md += `### ✍️ Voz do Autor\n`;
            if(thesis) md += `> **Tese:** ${thesis.text}\n`;
            if(evidence) md += `> *Evidência:* ${evidence.text}\n`;
            session.insights.filter(i => i.type === 'concepts').forEach(c => {
                md += `\n**Conceitos:**\n${c.text}\n`;
            });
            md += `\n`;
        }

        const translation = session.meta.find(m => m.type === 'translate' && !m.subType); 
        const gap = session.meta.find(m => m.subType === 'gap');
        if(translation || gap) {
            md += `### 🧠 Minha Síntese (Recuperação)\n`;
            if(translation) md += `${translation.text}\n`;
            if(gap) md += `\n*⚠️ Ponto de Confusão:* ${gap.text}\n`;
            md += `\n`;
        }

        const action = session.meta.find(m => m.type === 'apply');
        const confront = session.triggers.find(t => t.subType === 'confront');
        if(action || confront) {
            md += `### 🚀 Praxis\n`;
            if(confront) md += `- **Confronto:** ${confront.text}\n`;
            if(action) md += `- **Ação:** ${action.text}\n`;
            md += `\n`;
        }
        
        md += `---\n\n`;
    });

    md += `\n*Gerado automaticamente pelo Painel Neuro-Retenção*`;
    return md;
}

export function downloadMarkdown(plano, singleSession = null) {
    if (!plano) return;
    
    if (singleSession) {
        let md = `# 📝 Sessão Avulsa: ${singleSession.sessionTopic || 'Sem Título'}\n`;
        md += `**Capítulo:** ${plano.titulo}\n`;
        md += `**Data:** ${new Date(singleSession.date).toLocaleDateString()}\n`;
        if(singleSession.pStart) md += `**Páginas:** ${singleSession.pStart}-${singleSession.pEnd}\n`;
        md += `\n---\n\n`;
        
        const thesis = singleSession.insights?.find(i => i.type === 'thesis');
        if (thesis) md += `> **Tese:** ${thesis.text}\n\n`;
        const feynman = singleSession.meta?.find(m => m.type === 'translate' && !m.subType);
        if (feynman) md += `**Síntese:** ${feynman.text}\n\n`;
        
        const blob = new Blob([md], { type: 'text/markdown' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `Sessao_${new Date(singleSession.date).toISOString().split('T')[0]}.md`;
        a.click();
        return;
    }

    let fullMd = "";
    if (!tempNoteData.id && plano.neuroAnnotations) {
        plano.neuroAnnotations.forEach(note => {
             fullMd += generateConsolidatedReport(note) + "\n\n====================\n\n";
        });
        const blob = new Blob([fullMd], { type: 'text/markdown' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `LIVRO_COMPLETO_${plano.titulo.replace(/\s+/g, '_')}.md`;
        a.click();
    } else {
        const noteToExport = tempNoteData.id ? tempNoteData : plano.neuroAnnotations[plano.neuroAnnotations.length-1];
        if(!noteToExport) return;
        
        fullMd = generateConsolidatedReport(noteToExport);
        const blob = new Blob([fullMd], { type: 'text/markdown' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `CAPITULO_${noteToExport.chapterTitle.replace(/\s+/g, '_')}.md`;
        a.click();
    }
}

// --- DIÁRIO DE BORDO (LOGBOOK) ---

export function openLogbook(planoIndex) {
    currentPlanoIndex = planoIndex;
    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;
    const note = (plano.neuroAnnotations || []).slice(-1)[0];
    
    if(note) tempNoteData = migrateLegacyData(note);
    
    renderLogbookUI(note);
    document.getElementById('logbook-modal').classList.add('visivel');
    
    const closeBtn = document.getElementById('close-logbook-modal');
    if (closeBtn) closeBtn.onclick = () => document.getElementById('logbook-modal').classList.remove('visivel');
    
    // INJETAR O BOTÃO MODO FOCO NO LOGBOOK SE NÃO EXISTIR
    const logbookHeader = document.querySelector('#logbook-modal .reavaliacao-modal-header');
    if (logbookHeader && !document.getElementById('toggle-focus-logbook')) {
        // Garante que o container tenha estilo flexível para alinhar
        if (logbookHeader.style.display !== 'flex') {
            logbookHeader.style.display = 'flex';
            logbookHeader.style.justifyContent = 'space-between';
            logbookHeader.style.alignItems = 'center';
        }

        let controlsDiv = logbookHeader.querySelector('.logbook-controls');
        if (!controlsDiv) {
            controlsDiv = document.createElement('div');
            controlsDiv.className = 'logbook-controls';
            controlsDiv.style.display = 'flex';
            controlsDiv.style.alignItems = 'center';
            controlsDiv.style.gap = '12px';
            
            // Move o botão de fechar existente para dentro do container
            if (closeBtn && closeBtn.parentNode === logbookHeader) {
                logbookHeader.removeChild(closeBtn);
                controlsDiv.appendChild(closeBtn);
            }
            logbookHeader.appendChild(controlsDiv);
        }

        const btnFocus = document.createElement('button');
        btnFocus.id = 'toggle-focus-logbook';
        btnFocus.className = 'btn-expand-modal';
        btnFocus.title = 'Modo Foco';
        btnFocus.style.background = 'none';
        btnFocus.style.border = 'none';
        btnFocus.style.color = 'rgba(255,255,255,0.8)';
        btnFocus.style.cursor = 'pointer';
        btnFocus.innerHTML = '<span class="material-symbols-outlined">open_in_full</span>';
        
        if (controlsDiv.firstChild) {
            controlsDiv.insertBefore(btnFocus, controlsDiv.firstChild);
        } else {
            controlsDiv.appendChild(btnFocus);
        }

        btnFocus.addEventListener('click', function() {
            const modalContent = this.closest('.reavaliacao-modal-content');
            modalContent.classList.toggle('modal-expanded');
            const icon = this.querySelector('span');
            icon.textContent = modalContent.classList.contains('modal-expanded') ? 'close_fullscreen' : 'open_in_full';
        });
    }

    document.getElementById('btn-new-session-logbook').onclick = () => {
        if (!note) { openNoteModal(planoIndex); return; }
        tempNoteData = migrateLegacyData(note); 
        window.handleNewSession();
        document.getElementById('logbook-modal').classList.remove('visivel');
        openNoteModal(planoIndex);
    };
}

function renderLogbookUI(note) {
    const container = document.getElementById('logbook-content');
    if (!note) { container.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Nenhum registro iniciado para este plano.</p>'; return; }

    let progressHTML = '';
    if (note.pageStart && note.pageEnd) {
        progressHTML = `
        <div id="chapter-progress-wrapper" style="padding: 10px 15px; background: #fff; border-bottom: 1px solid #eee; margin-bottom: 15px; border-radius: 6px;">
            <div style="display:flex; justify-content: space-between; font-size: 0.8em; color: #666; margin-bottom: 5px;">
                <span>Cobertura do Capítulo</span>
                <button id="btn-view-timeline" class="btn-history-small" style="border:none; background:none; color:var(--neuro-accent); cursor:pointer; padding:0;">
                    Ver Linha do Tempo <span class="material-symbols-outlined" style="font-size:1.1em; vertical-align:middle;">open_in_new</span>
                </button>
            </div>
            <div class="progress-track" id="chapter-coverage-bar"></div>
        </div>`;
    }

    let html = `
    <!-- Header com Ação de Consolidação -->
    <div style="background: #eef2f7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid var(--neuro-primary);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <span class="logbook-chapter-title" style="margin-bottom:5px;">${note.chapterTitle}</span>
                <div class="logbook-meta-info"><strong>Tema:</strong> ${note.theme || 'Não definido'}</div>
                <div class="logbook-meta-info"><strong>Intervalo Global:</strong> Pág. ${note.pageStart || '?'} - ${note.pageEnd || '?'}</div>
            </div>
            <button class="btn-neuro-action" style="background-color: var(--neuro-primary); color: white; border:none;" onclick="window.dispatchLogbookAction('consolidate', '${note.id}')">
                <span class="material-symbols-outlined">inventory_2</span> Consolidar Capítulo
            </button>
        </div>
    </div>

    ${progressHTML}
    
    <div class="session-timeline">`;
    
    (note.sessions || []).forEach((session, idx) => {
        const pagesBadge = (session.pStart && session.pEnd) 
            ? `<span style="font-size:0.75em; background:#d3540022; color:#d35400; padding:2px 6px; border-radius:4px; margin-left:8px;">Pág. ${session.pStart}-${session.pEnd}</span>` 
            : '';

        html += `
            <div class="session-card">
                <span class="session-date">${new Date(session.date).toLocaleDateString()} • ARQUIVADA</span>
                <div class="session-topic">
                    ${session.sessionTopic || 'Sessão Histórica'}
                    ${pagesBadge}
                </div>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="btn-neuro-action" style="padding:4px 8px; font-size:0.8em;" onclick="window.dispatchLogbookAction('edit', '${note.id}', '${session.id}')">
                        <span class="material-symbols-outlined" style="font-size:1.1em;">edit</span> Editar
                    </button>
                    <button class="btn-neuro-action" style="padding:4px 8px; font-size:0.8em;" onclick="window.dispatchLogbookAction('download', '${note.id}', '${session.id}')">
                        <span class="material-symbols-outlined" style="font-size:1.1em;">download</span> MD
                    </button>
                </div>
            </div>`;
    });

    const currentPagesBadge = (note.currentSession.pStart && note.currentSession.pEnd)
        ? `<span style="font-size:0.75em; background:#27ae6022; color:#27ae60; padding:2px 6px; border-radius:4px; margin-left:8px;">Pág. ${note.currentSession.pStart}-${note.currentSession.pEnd}</span>` 
        : '';

    html += `
        <div class="session-card active-session">
            <span class="session-date" style="color:var(--neuro-accent);">HOJE (RASCUNHO)</span>
            <div class="session-topic">
                ${note.currentSession.sessionTopic || 'Sessão Atual'}
                ${currentPagesBadge}
            </div>
            <button class="btn-neuro-action" style="margin-top:8px; border-color:var(--neuro-accent); color:var(--neuro-accent);" onclick="window.dispatchLogbookAction('edit-current')">
                <span class="material-symbols-outlined" style="font-size:1.1em;">play_arrow</span> Continuar
            </button>
        </div></div>`;

    container.innerHTML = html;

    setTimeout(() => {
        renderVisualizations(note);
    }, 100);
}

function renderVisualizations(note) {
    const bar = document.getElementById('chapter-coverage-bar');
    if(bar && note.pageStart && note.pageEnd) {
        const totalPages = note.pageEnd - note.pageStart + 1;
        const allSessions = [...(note.sessions || []), note.currentSession];
        
        bar.innerHTML = '';
        
        allSessions.forEach(s => {
            if(!s.pStart || !s.pEnd) return;
            
            const relativeStart = s.pStart - note.pageStart;
            const percentStart = (relativeStart / totalPages) * 100;
            const percentWidth = ((s.pEnd - s.pStart + 1) / totalPages) * 100;
            
            const seg = document.createElement('div');
            seg.className = 'progress-segment';
            seg.style.left = `${Math.max(0, percentStart)}%`;
            seg.style.width = `${Math.min(100, percentWidth)}%`;
            seg.title = `Pág. ${s.pStart}-${s.pEnd}: ${s.sessionTopic || 'Sessão'}`;
            
            bar.appendChild(seg);
        });
    }
    
    document.getElementById('btn-view-timeline')?.addEventListener('click', () => openTimelineModal(note));
}

function openTimelineModal(note) {
    const content = document.getElementById('timeline-content');
    if (!content) return;

    const allSessions = [...(note.sessions || []), note.currentSession].sort((a,b) => (a.pStart || 0) - (b.pStart || 0));
    
    content.innerHTML = allSessions.map(s => {
        const thesis = s.insights.find(i => i.type === 'thesis')?.text || '<em>Nenhuma tese registrada nesta sessão.</em>';
        return `
            <div class="timeline-node">
                <div style="font-size:0.75em; color:#999; text-transform:uppercase; margin-bottom:5px;">
                    Pág. ${s.pStart || '?'}-${s.pEnd || '?'} • ${new Date(s.date).toLocaleDateString()}
                </div>
                <div style="font-family: var(--neuro-font-serif); color: #2c3e50; font-size: 1.05em; line-height: 1.5;">
                    "${thesis}"
                </div>
            </div>
        `;
    }).join('');
    
    const modal = document.getElementById('timeline-modal');
    if (modal) {
        modal.classList.add('visivel');
        const closeBtn = document.getElementById('close-timeline');
        if (closeBtn) closeBtn.onclick = () => modal.classList.remove('visivel');
    }
}

window.dispatchLogbookAction = (action, noteId, sessionId) => {
    const plano = state.getPlanos()[currentPlanoIndex];
    
    if (action === 'consolidate') {
        const targetNote = plano.neuroAnnotations.find(n => n.id === noteId);
        if(targetNote) {
            tempNoteData = migrateLegacyData(targetNote); 
            downloadMarkdown(plano); 
        }
        return;
    }

    document.getElementById('logbook-modal').classList.remove('visivel');

    if (action === 'edit') {
        editSessionFromHistory(currentPlanoIndex, noteId, sessionId);
    } else if (action === 'download') {
        const note = plano.neuroAnnotations.find(n => n.id === noteId);
        const session = note.sessions.find(s => s.id === sessionId);
        downloadMarkdown(plano, session);
    } else if (action === 'edit-current') {
        openNoteModal(currentPlanoIndex);
    }
};

window.updateContextData = (type) => {
    const c = document.getElementById('neuro-chapter').value;
    const s = parseInt(document.getElementById('neuro-range-start').value);
    const e = parseInt(document.getElementById('neuro-range-end').value);
    const t = document.getElementById('neuro-session-topic').value;

    if (tempNoteData.chapterTitle !== c) { tempNoteData.chapterTitle = c; isDirty = true; }
    if (tempNoteData.pageStart !== s) { tempNoteData.pageStart = s; isDirty = true; }
    if (tempNoteData.pageEnd !== e) { tempNoteData.pageEnd = e; isDirty = true; }
    if (tempNoteData.currentSession.sessionTopic !== t) { tempNoteData.currentSession.sessionTopic = t; isDirty = true; }
    if (isDirty) scheduleAutoSave();
};

window.updateFlagData = (key, val) => {
    tempNoteData.currentSession.flags[key] = val; isDirty = true; scheduleAutoSave();
};