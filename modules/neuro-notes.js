// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (Wizard M.E.T.A.),
// persistência local/remota, exportação e Diário de Bordo (Histórico).
// ATUALIZADO v2.4.0: Suporte a Edição de Histórico e Download Individual de Sessões.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';
import { attachDictationToInput } from './dictation-widget.js';
import { processTextWithAI } from './ai-service.js';

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

// NOVO: Controle de Edição de Histórico
let editingSessionId = null; 

// --- Configuração dos Passos do Wizard (M.E.T.A. v2.1) ---
const WIZARD_STEPS = [
    {
        id: 'map',
        title: 'M - Mapear (Priming)',
        icon: 'map',
        guide: '<strong>Priming:</strong> O cérebro ignora o que não busca. Defina o tema e suas perguntas.',
        validation: () => {
             const theme = document.getElementById('meta-theme')?.value;
             const q1 = document.getElementById('meta-map-q1')?.value;
             return theme && theme.length > 3 && q1 && q1.length > 3;
        },
        render: (data) => `
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
                date: new Date().toISOString(),
                insights: [],
                meta: [],
                triggers: [],
                flags: { blindModeRespect: false }
            }
        };
    }
    if (oldData.currentSession) return oldData;

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
            date: oldData.updatedAt || new Date().toISOString(),
            insights: oldData.insights || [],
            meta: oldData.meta || [],
            triggers: oldData.triggers || [],
            flags: oldData.flags || { blindModeRespect: false }
        }
    };
}

// --- Gerenciamento do Modal Principal ---

function ensureModalExists() {
    if (document.getElementById('neuro-modal')) return;
    const modalHTML = `
    <div id="neuro-modal" class="reavaliacao-modal-overlay">
        <div class="reavaliacao-modal-content neuro-theme" style="max-width: 800px; padding: 0; display: flex; flex-direction: column; max-height: 90vh;">
            <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #1a252f 0%, #2c3e50 100%); padding: 15px 20px; border-radius: 8px 8px 0 0; color: white; flex-shrink: 0;">
                <h2 style="color: white; font-family: 'Playfair Display', serif; margin:0; display:flex; align-items:center; gap:10px;">
                    <span class="material-symbols-outlined">psychology_alt</span> Wizard Neuro-Retenção
                </h2>
                <button id="close-neuro-modal" class="reavaliacao-modal-close" style="color: white; opacity: 0.8;">×</button>
            </div>
            <div id="neuro-modal-body" class="neuro-modal-body" style="padding: 20px; overflow-y: auto; flex-grow: 1;"></div>
            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0; flex-shrink: 0;"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('close-neuro-modal').addEventListener('click', closeNoteModal);
}

export function openNoteModal(planoIndex, diaIndex = null) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    currentDiaIndex = diaIndex;
    currentStepIndex = 0;
    isDirty = false;
    editingSessionId = null; // Reset de modo de edição histórica

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
        }
    }

    renderModalUI();
    document.getElementById('neuro-modal').classList.add('visivel');
}

// NOVO: Função para carregar uma sessão específica no Wizard
export function editSessionFromHistory(planoIndex, annotationId, sessionId) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    currentStepIndex = 0;
    isDirty = false;
    editingSessionId = sessionId;

    const plano = state.getPlanoByIndex(planoIndex);
    const annotation = plano.neuroAnnotations.find(n => n.id === annotationId);
    
    if (!annotation) return;

    tempNoteData = JSON.parse(JSON.stringify(annotation)); // Deep copy
    
    // Busca a sessão no histórico
    const sessionToEdit = tempNoteData.sessions.find(s => s.id === sessionId);
    if (!sessionToEdit) return;

    // Coloca os dados da sessão histórica como "current" para o Wizard trabalhar
    tempNoteData.currentSession = sessionToEdit;

    renderModalUI();
    document.getElementById('neuro-modal').classList.add('visivel');
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
    const headerTitle = document.querySelector('#neuro-modal h2');
    
    // Altera título se estiver em modo de edição
    headerTitle.innerHTML = editingSessionId 
        ? `<span class="material-symbols-outlined" style="color:var(--neuro-accent);">history_edu</span> Edição de Histórico`
        : `<span class="material-symbols-outlined">psychology_alt</span> Wizard Neuro-Retenção`;

    const step = WIZARD_STEPS[currentStepIndex];

    const headerContextHTML = `
        <div class="neuro-context-header" style="${editingSessionId ? 'border-color:var(--neuro-accent); background:#fff9f5;' : ''}">
            <div class="neuro-macro-context">
                <span class="context-label"><span class="material-symbols-outlined">library_books</span> Capítulo/Tema:</span>
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
                <input type="text" id="neuro-session-topic" value="${tempNoteData.currentSession.sessionTopic || ''}" class="voice-me-input micro-input" onchange="updateContextData('micro')">
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
    if (step.validation && !step.validation()) {
        alert("⚠️ Guardrail Ativado: Por favor, preencha os campos essenciais para garantir sua retenção.");
        return;
    }
    currentStepIndex++;
    renderModalUI();
}

window.handleNewSession = () => {
    if(!confirm("Deseja arquivar a sessão atual e iniciar um novo dia?")) return;
    const hasContent = tempNoteData.currentSession.insights.length > 0 || tempNoteData.currentSession.meta.length > 0;
    if(hasContent) tempNoteData.sessions.push({...tempNoteData.currentSession});
    tempNoteData.currentSession = { id: crypto.randomUUID(), sessionTopic: '', date: new Date().toISOString(), insights: [], meta: [], triggers: [], flags: { blindModeRespect: false } };
    currentStepIndex = 0; editingSessionId = null; 
    renderModalUI(); isDirty = true; scheduleAutoSave();
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

    // LÓGICA DE SALVAMENTO DIFERENCIADA (PASSADO vs PRESENTE)
    const annotation = plano.neuroAnnotations.find(n => n.id === tempNoteData.id);
    if (annotation) {
        annotation.chapterTitle = tempNoteData.chapterTitle;
        annotation.theme = tempNoteData.theme;
        annotation.pageStart = tempNoteData.pageStart;
        annotation.pageEnd = tempNoteData.pageEnd;

        if (editingSessionId) {
            // Atualiza no array de sessões passadas
            const sIdx = annotation.sessions.findIndex(s => s.id === editingSessionId);
            if (sIdx !== -1) annotation.sessions[sIdx] = { ...tempNoteData.currentSession };
        } else {
            // Atualiza sessão de hoje
            annotation.currentSession = { ...tempNoteData.currentSession };
        }
    } else {
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

// --- EXPORTAÇÃO ---

export function downloadMarkdown(plano, singleSession = null) {
    if (!plano) return;
    let md = `# 📘 Neuro-Anotações: ${plano.titulo}\n\n`;
    
    const render = (session, title) => {
        let sMd = `### 📅 ${title} (${new Date(session.date).toLocaleDateString()})\n`;
        if(session.sessionTopic) sMd += `*Tópico: ${session.sessionTopic}*\n\n`;
        const thesis = session.insights?.find(i => i.type === 'thesis');
        if (thesis) sMd += `> **Tese:** ${thesis.text}\n\n`;
        const feynman = session.meta?.find(m => m.type === 'translate');
        if (feynman) sMd += `**Síntese:** ${feynman.text}\n\n`;
        return sMd + `---\n\n`;
    };

    if (singleSession) {
        md += render(singleSession, "Sessão Avulsa");
    } else {
        (plano.neuroAnnotations || []).forEach(note => {
            md += `## ${note.chapterTitle} (Pág. ${note.pageStart}-${note.pageEnd})\n`;
            note.sessions.forEach((s, i) => md += render(s, `Sessão ${i+1}`));
            md += render(note.currentSession, "Sessão Atual");
        });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `NeuroNotes_${plano.titulo.replace(/\s+/g, '_')}.md`;
    a.click();
}

// --- DIÁRIO DE BORDO (LOGBOOK) ---

export function openLogbook(planoIndex) {
    currentPlanoIndex = planoIndex;
    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;
    const note = (plano.neuroAnnotations || []).slice(-1)[0];
    renderLogbookUI(note);
    document.getElementById('logbook-modal').classList.add('visivel');
    document.getElementById('close-logbook-modal').onclick = () => document.getElementById('logbook-modal').classList.remove('visivel');
    document.getElementById('btn-new-session-logbook').onclick = () => {
        if (!note) { openNoteModal(planoIndex); return; }
        tempNoteData = migrateLegacyData(note); window.handleNewSession();
        document.getElementById('logbook-modal').classList.remove('visivel');
        openNoteModal(planoIndex);
    };
}

function renderLogbookUI(note) {
    const container = document.getElementById('logbook-content');
    if (!note) { container.innerHTML = '<p>Nenhum registro iniciado.</p>'; return; }

    let html = `<div class="logbook-header-info">
        <span class="logbook-chapter-title">${note.chapterTitle}</span>
        <div class="logbook-meta-info"><strong>Tema:</strong> ${note.theme || 'N/D'} | Pág. ${note.pageStart}-${note.pageEnd}</div>
    </div><div class="session-timeline">`;
    
    // Render de Histórico com Botões de Ação
    (note.sessions || []).forEach((session, idx) => {
        html += `
            <div class="session-card">
                <span class="session-date">${new Date(session.date).toLocaleDateString()} • ARQUIVADA</span>
                <div class="session-topic">${session.sessionTopic || 'Sessão Histórica'}</div>
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

    html += `
        <div class="session-card active-session">
            <span class="session-date" style="color:var(--neuro-accent);">HOJE</span>
            <div class="session-topic">${note.currentSession.sessionTopic || 'Sessão Atual'}</div>
            <button class="btn-neuro-action" style="margin-top:8px; border-color:var(--neuro-accent); color:var(--neuro-accent);" onclick="window.dispatchLogbookAction('edit-current')">
                <span class="material-symbols-outlined" style="font-size:1.1em;">play_arrow</span> Continuar
            </button>
        </div></div>`;

    container.innerHTML = html;
}

// Dispatcher global para os cliques nos botões do logbook
window.dispatchLogbookAction = (action, noteId, sessionId) => {
    const plano = state.getPlanos()[currentPlanoIndex];
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