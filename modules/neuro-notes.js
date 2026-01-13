// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (Wizard M.E.T.A.),
// persistência local/remota e exportação.
// ATUALIZADO v2.1.0: Protocolo C.A.P.E. Refinado & S.R.S. Avançado

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';
import { attachDictationToInput } from './dictation-widget.js';
import { processTextWithAI } from './ai-service.js';

// --- Variáveis de Estado Local ---
let tempNoteData = {
    id: null,
    chapterTitle: '',
    theme: '', // NOVO: Tema Central (1 linha)
    pageStart: null,
    pageEnd: null,
    insights: [], // Array para tese, conceitos, evidências
    meta: [],     // Array para Map, Translate (gap), Apply
    triggers: [], // Array para Gatilhos/Confronto
    flags: {      // NOVO: Controle de comportamento
        blindModeRespect: false
    }
};

let currentPlanoIndex = null;
let currentDiaIndex = null;
let currentStepIndex = 0;
let saveTimeout = null;
let isDirty = false;

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
                    <input type="text" id="meta-map-q1" class="neuro-textarea-card voice-me-input" placeholder="Ex: Qual é o argumento central?" value="${data.meta.find(m => m.subType === 'q1')?.text || ''}" style="flex-grow: 1;">
                    ${createMicBtn('meta-map-q1')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Pergunta Guia 2 (O que quero aplicar?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="meta-map-q2" class="neuro-textarea-card voice-me-input" placeholder="Ex: Como isso muda minha prática?" value="${data.meta.find(m => m.subType === 'q2')?.text || ''}" style="flex-grow: 1;">
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
                        <textarea id="engage-thesis" class="neuro-textarea-card voice-author-input" rows="3" maxlength="900" placeholder="O autor argumenta que..." style="flex-grow: 1;">${data.insights.find(i => i.type === 'thesis')?.text || ''}</textarea>
                        ${createMagicBtn('engage-thesis')}
                        ${createMicBtn('engage-thesis')}
                    </div>
                    <span id="counter-engage-thesis" class="char-counter">0/900 (Forçar Síntese)</span>
                </div>
            </div>
            
            <div class="neuro-input-group">
                <label>Conceitos Chave (Bullets)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="engage-concepts" class="neuro-textarea-card voice-author-input" rows="2" placeholder="- Conceito A&#10;- Conceito B" style="flex-grow: 1;">${data.insights.find(i => i.type === 'concepts')?.text || ''}</textarea>
                    ${createMicBtn('engage-concepts')}
                </div>
            </div>

            <div class="neuro-input-group">
                <label>Evidência / Referência (O que sustenta a tese?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="engage-evidence" class="neuro-textarea-card voice-author-input" placeholder="Ex: Citação de Romanos 5 ou Exemplo do Barco..." value="${data.insights.find(i => i.type === 'evidence')?.text || ''}" style="flex-grow: 1;">
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
                <em>${data.insights.find(i => i.type === 'thesis')?.text || '...'}</em>
            </div>
            
            <div class="neuro-input-group">
                <label>Minha Síntese (Técnica Feynman)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="translate-feynman" class="neuro-textarea-card voice-me-input" rows="4" placeholder="Basicamente, isso significa que..." style="flex-grow: 1;">${data.meta.find(m => m.type === 'translate')?.text || ''}</textarea>
                    ${createMagicBtn('translate-feynman')}
                    ${createMicBtn('translate-feynman')}
                </div>
            </div>

            <div class="neuro-input-group" style="border-left: 3px solid #e67e22; padding-left: 10px;">
                <label style="color:#e67e22;">Ponto de Confusão (O que não ficou claro?)</label>
                <input type="text" id="translate-gap" class="neuro-textarea-card" placeholder="Ex: Não entendi a relação entre X e Y..." value="${data.meta.find(m => m.subType === 'gap')?.text || ''}">
            </div>

            <div style="margin-top:15px; display:flex; align-items:center; gap:8px;">
                <input type="checkbox" id="check-blind-mode" ${data.flags?.blindModeRespect ? 'checked' : ''} onchange="updateFlagData('blindModeRespect', this.checked)">
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
                    <input type="text" id="apply-confront" class="neuro-textarea-card voice-me-input" placeholder="Confrontou minha ideia de que..." value="${data.triggers.find(t => t.subType === 'confront')?.text || ''}" style="flex-grow: 1;">
                    ${createMagicBtn('apply-confront')}
                    ${createMicBtn('apply-confront')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Micro-Ação (Para as próximas 24h)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="apply-action" class="neuro-textarea-card voice-me-input" placeholder="Vou..." value="${data.meta.find(m => m.type === 'apply')?.text || ''}" style="flex-grow: 1;">
                    ${createMagicBtn('apply-action')}
                    ${createMicBtn('apply-action')}
                </div>
            </div>
        `
    }
];

// --- Helpers de Botões ---
function createMicBtn(targetId) {
    return `
    <button type="button" id="mic-${targetId}" class="btn-neuro-mic" title="Ditar com IA">
        <span class="material-symbols-outlined">mic</span>
    </button>`;
}

function createMagicBtn(targetId) {
    return `
    <button type="button" id="magic-${targetId}" class="btn-neuro-magic" title="Corrigir texto com IA">
        <span class="material-symbols-outlined">auto_fix_high</span>
    </button>`;
}

// --- Migração e Inicialização ---

function migrateLegacyData(oldData) {
    if (!oldData) return {
        id: crypto.randomUUID(),
        chapterTitle: '',
        theme: '',
        pageStart: null,
        pageEnd: null,
        insights: [],
        meta: [],
        triggers: [],
        flags: { blindModeRespect: false }
    };

    const newData = {
        id: oldData.id || crypto.randomUUID(),
        chapterTitle: oldData.chapterTitle || '',
        theme: oldData.theme || '',
        pageStart: oldData.pageStart || null,
        pageEnd: oldData.pageEnd || null,
        insights: oldData.insights || [],
        meta: oldData.meta && Array.isArray(oldData.meta) ? oldData.meta : [],
        triggers: oldData.triggers && Array.isArray(oldData.triggers) ? oldData.triggers : [],
        flags: oldData.flags || { blindModeRespect: false }
    };
    return newData;
}

// --- Gerenciamento do Modal ---

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
            
            <div id="neuro-modal-body" class="neuro-modal-body" style="padding: 20px; overflow-y: auto; flex-grow: 1;">
                <!-- Conteúdo Injetado Pelo Wizard -->
            </div>

            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0; flex-shrink: 0;">
                 <!-- Botões Injetados Pelo Wizard -->
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('close-neuro-modal').addEventListener('click', closeNoteModal);
}

export function openNoteModal(planoIndex, diaIndex = null) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    currentDiaIndex = diaIndex;
    currentStepIndex = 0;
    isDirty = false;

    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;

    let annotationFound = null;
    const annotations = plano.neuroAnnotations || [];

    if (diaIndex !== null && plano.diasPlano && plano.diasPlano[diaIndex]) {
        const dia = plano.diasPlano[diaIndex];
        annotationFound = annotations.find(note => 
            (dia.paginaInicioDia <= note.pageEnd && dia.paginaFimDia >= note.pageStart)
        );
        if (!annotationFound && dia.neuroNote) annotationFound = dia.neuroNote;
    }

    if (!annotationFound && annotations.length > 0) {
        annotationFound = annotations[annotations.length - 1];
    }

    if (annotationFound) {
        const migrated = migrateLegacyData(annotationFound);
        const idx = annotations.indexOf(annotationFound);
        if(idx !== -1) plano.neuroAnnotations[idx] = migrated;
        tempNoteData = migrated;
    } else {
        tempNoteData = migrateLegacyData(null);
        if (diaIndex !== null && plano.diasPlano[diaIndex]) {
            const dia = plano.diasPlano[diaIndex];
            tempNoteData.chapterTitle = `Leitura Pág. ${dia.paginaInicioDia} - ${dia.paginaFimDia}`;
            tempNoteData.pageStart = dia.paginaInicioDia;
            tempNoteData.pageEnd = dia.paginaFimDia;
        } else {
            tempNoteData.chapterTitle = 'Novo Contexto';
        }
    }

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
    
    headerTitle.innerHTML = `<span class="material-symbols-outlined">psychology_alt</span> Wizard Neuro-Retenção`;

    const step = WIZARD_STEPS[currentStepIndex];

    const headerContextHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
             <span style="font-size:0.8em; font-weight:bold; color:#555;">Contexto da Anotação</span>
             <span id="save-indicator" style="font-size:0.8em; color:#7f8c8d; font-style:italic; transition: color 0.3s;">
                ${isDirty ? 'Não salvo' : 'Sincronizado'}
             </span>
        </div>
        <div style="display:flex; gap:10px; margin-bottom:20px; align-items:center; background:#fff; padding:10px; border-radius:6px; border:1px solid #eee;">
             <input type="text" id="neuro-chapter" value="${tempNoteData.chapterTitle}" placeholder="Título do Contexto" class="voice-me-input" style="flex:2; padding:8px; border:1px solid #ddd; border-radius:4px;" onchange="updateContextData()">
             <input type="number" id="neuro-range-start" value="${tempNoteData.pageStart || ''}" placeholder="Início" style="width:70px; padding:8px; border:1px solid #ddd; border-radius:4px;" onchange="updateContextData()">
             <input type="number" id="neuro-range-end" value="${tempNoteData.pageEnd || ''}" placeholder="Fim" style="width:70px; padding:8px; border:1px solid #ddd; border-radius:4px;" onchange="updateContextData()">
        </div>
    `;
    
    const progressHTML = WIZARD_STEPS.map((s, idx) => `
        <div class="neuro-step-indicator ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}"></div>
    `).join('');

    modalBody.innerHTML = `
        ${headerContextHTML}
        <div class="neuro-wizard-progress">${progressHTML}</div>
        
        <div class="wizard-step-container fade-in">
            <div class="wizard-step-title">
                <span class="material-symbols-outlined">${step.icon}</span> ${step.title}
            </div>
            
            <div class="neuro-guide-box">
                <span class="material-symbols-outlined">lightbulb</span>
                <div>${step.guide}</div>
            </div>

            <div id="step-content">
                ${step.render(tempNoteData)}
            </div>
        </div>
    `;

    updateWizardButtons();
    attachToolsToInputs();
    attachCharCounters(); // Novo: Ativa contadores
}

function updateWizardButtons() {
    const footer = document.querySelector('#neuro-modal .recalculo-modal-actions');
    const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
    
    footer.innerHTML = `
        <div style="display: flex; gap: 10px; width: 100%;">
            ${currentStepIndex > 0 ? `
            <button id="btn-prev-step" style="background:none; border:1px solid #ccc; padding:10px 15px; border-radius:5px; cursor:pointer;">
                Voltar
            </button>` : '<button id="btn-reset-neuro" style="background:none; border:1px solid #e74c3c; color:#e74c3c; padding:10px 15px; border-radius:5px; cursor:pointer;">Resetar</button>'}
            
            <div style="flex-grow:1;"></div>

            ${isLastStep ? `
            <button id="btn-save-neuro" class="button-confirm" style="background-color: #27ae60; padding: 10px 25px;">
                Concluir Sessão
            </button>` : `
            <button id="btn-next-step" class="button-confirm" style="background-color: var(--neuro-accent); padding: 10px 25px; display:flex; align-items:center; gap:5px;">
                Próximo Passo <span class="material-symbols-outlined" style="font-size:1em;">arrow_forward</span>
            </button>`}
        </div>
    `;

    document.getElementById('btn-next-step')?.addEventListener('click', handleNextStep);
    document.getElementById('btn-prev-step')?.addEventListener('click', () => {
        saveCurrentStepData(); 
        currentStepIndex--;
        renderModalUI();
    });
    document.getElementById('btn-save-neuro')?.addEventListener('click', async () => {
        saveCurrentStepData();
        await saveNote(); 
    });
    document.getElementById('btn-reset-neuro')?.addEventListener('click', handleResetNeuro);
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

// --- LÓGICA DE PERSISTÊNCIA AUTOMÁTICA (v2.1) ---

function scheduleAutoSave() {
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) {
        saveIndicator.innerText = "Salvando em breve...";
        saveIndicator.style.color = "#e67e22";
    }
    
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        await performSilentSave();
    }, 2000);
}

async function performSilentSave() {
    if (!isDirty) return;

    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) saveIndicator.innerText = "Sincronizando...";

    try {
        tempNoteData.updatedAt = new Date().toISOString();
        ensureAttachedToPlan();

        const currentUser = state.getCurrentUser();
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        }
        
        if (saveIndicator) {
            saveIndicator.innerText = "Salvo ✓";
            saveIndicator.style.color = "#27ae60";
        }
        isDirty = false;
        saveTimeout = null;
    } catch (e) {
        console.warn("Erro no auto-save:", e);
        if (saveIndicator) {
            saveIndicator.innerText = "⚠️ Offline (Salvo local)";
            saveIndicator.style.color = "#c0392b";
        }
    }
}

function ensureAttachedToPlan() {
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    if (!plano) return;
    
    if (!plano.neuroAnnotations) plano.neuroAnnotations = [];

    const exists = plano.neuroAnnotations.find(n => n.id === tempNoteData.id);
    
    if (!exists) {
        plano.neuroAnnotations.push(tempNoteData);
        if (currentDiaIndex !== null && plano.diasPlano && plano.diasPlano[currentDiaIndex]) {
             if (plano.diasPlano[currentDiaIndex].neuroNote) plano.diasPlano[currentDiaIndex].neuroNote = null;
        }
    }
}

// --- Helpers de Dados e Ferramentas ---

window.updateContextData = () => {
    const newTitle = document.getElementById('neuro-chapter').value;
    const newStart = parseInt(document.getElementById('neuro-range-start').value, 10);
    const newEnd = parseInt(document.getElementById('neuro-range-end').value, 10);

    let changed = false;
    if (tempNoteData.chapterTitle !== newTitle) { tempNoteData.chapterTitle = newTitle; changed = true; }
    if (tempNoteData.pageStart !== newStart) { tempNoteData.pageStart = newStart; changed = true; }
    if (tempNoteData.pageEnd !== newEnd) { tempNoteData.pageEnd = newEnd; changed = true; }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
};

window.updateFlagData = (key, value) => {
    if (!tempNoteData.flags) tempNoteData.flags = {};
    if (tempNoteData.flags[key] !== value) {
        tempNoteData.flags[key] = value;
        isDirty = true;
        scheduleAutoSave();
    }
}

function saveCurrentStepData() {
    // Passo 1: Map (Atualizado com Theme)
    const theme = document.getElementById('meta-theme')?.value;
    if (theme !== undefined) {
        if (tempNoteData.theme !== theme) { tempNoteData.theme = theme; isDirty = true; scheduleAutoSave(); }
    }
    const q1 = document.getElementById('meta-map-q1')?.value;
    if (q1 !== undefined) upsertMeta('map', q1, 'q1');
    const q2 = document.getElementById('meta-map-q2')?.value;
    if (q2 !== undefined) upsertMeta('map', q2, 'q2');

    // Passo 2: Engage (Atualizado com Evidence)
    const thesis = document.getElementById('engage-thesis')?.value;
    if (thesis !== undefined) upsertInsight('thesis', thesis);
    const concepts = document.getElementById('engage-concepts')?.value;
    if (concepts !== undefined) upsertInsight('concepts', concepts);
    const evidence = document.getElementById('engage-evidence')?.value;
    if (evidence !== undefined) upsertInsight('evidence', evidence);

    // Passo 3: Translate (Atualizado com Gap)
    const feynman = document.getElementById('translate-feynman')?.value;
    if (feynman !== undefined) upsertMeta('translate', feynman);
    const gap = document.getElementById('translate-gap')?.value;
    if (gap !== undefined) upsertMeta('translate', gap, 'gap');

    // Passo 4: Apply
    const action = document.getElementById('apply-action')?.value;
    if (action !== undefined) upsertMeta('apply', action);
    const confront = document.getElementById('apply-confront')?.value;
    if (confront !== undefined) upsertTrigger('confront', confront);
    
    if (document.getElementById('neuro-chapter')) {
        window.updateContextData();
    }
}

function upsertMeta(type, text, subType = null) {
    const idx = tempNoteData.meta.findIndex(m => m.type === type && m.subType === subType);
    let changed = false;

    if (idx >= 0) {
        if (tempNoteData.meta[idx].text !== text) {
            tempNoteData.meta[idx].text = text;
            tempNoteData.meta[idx].timestamp = Date.now();
            changed = true;
        }
    } else if (text && text.trim() !== "") {
        tempNoteData.meta.push({ type, subType, text, page: 'Geral', timestamp: Date.now() });
        changed = true;
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
}

function upsertInsight(type, text) {
    const idx = tempNoteData.insights.findIndex(i => i.type === type);
    let changed = false;

    if (idx >= 0) {
        if (tempNoteData.insights[idx].text !== text) {
            tempNoteData.insights[idx].text = text;
            tempNoteData.insights[idx].timestamp = Date.now();
            changed = true;
        }
    } else if (text && text.trim() !== "") {
        tempNoteData.insights.push({ type, text, page: 'Geral', timestamp: Date.now() });
        changed = true;
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
}

function upsertTrigger(subType, text) {
     const idx = tempNoteData.triggers.findIndex(t => t.subType === subType);
     let changed = false;

     if (idx >= 0) {
        if (tempNoteData.triggers[idx].text !== text) {
            tempNoteData.triggers[idx].text = text;
            tempNoteData.triggers[idx].timestamp = Date.now();
            changed = true;
        }
    } else if (text && text.trim() !== "") {
        tempNoteData.triggers.push({ type: 'emotion', subType, text, page: 'Geral', timestamp: Date.now() });
        changed = true;
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
}

// Novo: Ativa contadores de caracteres para guardrails
function attachCharCounters() {
    const updateCounter = (input, counterId) => {
        const counter = document.getElementById(counterId);
        if (!counter) return;
        const current = input.value.length;
        const max = input.getAttribute('maxlength');
        counter.innerText = `${current}/${max}`;
        
        if (current > max * 0.9) counter.classList.add('limit-reached');
        else if (current > max * 0.7) counter.classList.add('limit-near');
        else counter.classList.remove('limit-reached', 'limit-near');
    };

    const inputsWithCounters = [
        { inputId: 'meta-theme', counterId: 'counter-meta-theme' },
        { inputId: 'engage-thesis', counterId: 'counter-engage-thesis' }
    ];

    inputsWithCounters.forEach(item => {
        const input = document.getElementById(item.inputId);
        if (input) {
            updateCounter(input, item.counterId); // Init
            input.addEventListener('input', () => updateCounter(input, item.counterId));
        }
    });
}

function attachToolsToInputs() {
    setTimeout(() => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                if (isDirty) scheduleAutoSave();
            });

            const micBtn = document.getElementById(`mic-${input.id}`);
            if (micBtn) attachDictationToInput(input, micBtn);

            const magicBtn = document.getElementById(`magic-${input.id}`);
            if (magicBtn) {
                magicBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    const originalText = input.value;
                    if (!originalText.trim()) return;

                    const originalIcon = magicBtn.innerHTML;
                    magicBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span>';
                    magicBtn.disabled = true;
                    input.disabled = true;

                    try {
                        const correctedText = await processTextWithAI(originalText);
                        input.value = correctedText;
                        input.dispatchEvent(new Event('input'));
                        isDirty = true; 
                        scheduleAutoSave();
                    } catch (error) {
                        console.error("Erro na correção:", error);
                        alert("Erro na IA.");
                    } finally {
                        magicBtn.innerHTML = originalIcon;
                        magicBtn.disabled = false;
                        input.disabled = false;
                    }
                });
            }
        });
    }, 50);
}

// --- Persistência e Reset ---

async function saveNote() {
    const pStart = parseInt(tempNoteData.pageStart, 10);
    const pEnd = parseInt(tempNoteData.pageEnd, 10);
    
    if (isNaN(pStart) || isNaN(pEnd)) {
        alert('Defina o intervalo de páginas no topo antes de concluir.');
        return;
    }

    if (saveTimeout) clearTimeout(saveTimeout);
    isDirty = true;
    
    ensureAttachedToPlan();

    ui.toggleLoading(true);
    try {
        await performSilentSave();
        
        ui.toggleLoading(false);
        closeNoteModal();
        const currentUser = state.getCurrentUser();
        if (currentUser) ui.renderApp(state.getPlanos(), currentUser);
        
    } catch (error) {
        ui.toggleLoading(false);
        console.error("Erro ao salvar final:", error);
        alert('Erro ao sincronizar. Tente novamente.');
    }
}

async function handleResetNeuro() {
    if (!confirm("Isso apagará o progresso atual deste contexto. Continuar?")) return;
    
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    if (plano && plano.neuroAnnotations) {
        const idx = plano.neuroAnnotations.indexOf(tempNoteData);
        if (idx !== -1) {
            plano.neuroAnnotations.splice(idx, 1);
            isDirty = true;
            scheduleAutoSave();
        }
    }

    tempNoteData = migrateLegacyData(null);
    currentStepIndex = 0;
    renderModalUI();
}

// --- REVISÃO ESPAÇADA (SRS) ATUALIZADA (Protocolo D+1/D+7) ---

export function openReviewMode(planoIndex, notaId, tipoRevisao) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    
    const plano = state.getPlanoByIndex(planoIndex);
    const nota = plano.neuroAnnotations.find(n => n.id === notaId);
    
    if (!nota) {
        alert("Nota não encontrada para revisão.");
        return;
    }

    const modal = document.getElementById('neuro-modal');
    const modalBody = document.getElementById('neuro-modal-body');
    const modalTitle = document.querySelector('#neuro-modal h2');
    
    modal.classList.add('visivel');
    modalTitle.innerHTML = `<span class="material-symbols-outlined">school</span> Revisão Ativa: ${tipoRevisao}`;

    // Dados de Recuperação
    const q1 = nota.meta?.find(m => m.subType === 'q1')?.text;
    const q2 = nota.meta?.find(m => m.subType === 'q2')?.text;
    const thesis = nota.insights?.find(i => i.type === 'thesis')?.text || "(Sem tese registrada)";
    const gap = nota.meta?.find(m => m.subType === 'gap')?.text || "Nenhuma dúvida registrada.";
    
    let conteudoEspecifico = '';

    // LÓGICA CONDICIONAL DE REVISÃO (SRS)
    if (tipoRevisao.includes('D+1')) {
        // D+1: Checagem Rápida (Mapear + Tese)
        conteudoEspecifico = `
            <div class="cape-alert-box" style="background: #e3f2fd; color: #1565c0; border-color: #2196f3;">
                🚀 <strong>Revisão D+1 (Flash):</strong> Responda mentalmente às perguntas de intenção e verifique se a Tese ainda está fresca.
            </div>
            <div class="neuro-input-group">
                <p><strong>1. Intenção (Mapear):</strong></p>
                <ul style="list-style: none; padding-left: 0; font-style: italic;">
                    <li>Q1: "${q1 || 'Não definida'}"</li>
                    <li>Q2: "${q2 || 'Não definida'}"</li>
                </ul>
            </div>
            <div class="neuro-input-group">
                <label>Recuperação da Tese (Tente reescrever a ideia central):</label>
                <textarea id="review-attempt" class="neuro-textarea-card" rows="3" placeholder="A tese central era..."></textarea>
                ${createMicBtn('review-attempt')}
            </div>
        `;
    } else if (tipoRevisao.includes('D+7')) {
        // D+7: Ensino e Consolidação (Feynman + Gap)
        conteudoEspecifico = `
            <div class="cape-alert-box" style="background: #f3e5f5; color: #8e44ad; border-color: #9b59b6;">
                🗣️ <strong>Revisão D+7 (Ensino):</strong> Imagine que você está explicando este conceito para um amigo em 90 segundos.
            </div>
            <div class="neuro-input-group">
                <label>Desafio de Ensino (Explique em voz alta ou escreva):</label>
                <textarea id="review-attempt" class="neuro-textarea-card" rows="5" placeholder="Veja bem, o ponto principal aqui é..."></textarea>
                ${createMicBtn('review-attempt')}
            </div>
            <div style="margin-top:15px; background:#fff3e0; padding:10px; border-radius:5px;">
                <strong>Verificação de Lacuna (Gap):</strong><br>
                <small>Na leitura original, você teve dúvida em: <em>"${gap}"</em>. Isso ficou claro agora?</small>
            </div>
        `;
    } else {
        // D+3: Padrão (Fallback)
        conteudoEspecifico = `
            <div class="cape-alert-box">🧠 <strong>Revisão de Manutenção:</strong> Recupere a ideia principal.</div>
            <div class="neuro-input-group">
                <label>Resumo Rápido:</label>
                <textarea id="review-attempt" class="neuro-textarea-card" rows="3"></textarea>
                ${createMicBtn('review-attempt')}
            </div>
        `;
    }

    modalBody.innerHTML = `
        ${conteudoEspecifico}
        
        <div id="review-feedback-area" style="display: none; animation: fadeIn 0.5s; margin-top:20px;">
            <div style="background: #fafafa; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-bottom: 20px;">
                <label style="font-size:0.8em; text-transform:uppercase; color:#27ae60; font-weight:bold;">Gabarito (Tese Original):</label>
                <p style="margin-top:5px; font-style:italic; color:#333;">"${thesis}"</p>
            </div>
            <div style="text-align: center;">
                <p>Classifique sua recuperação:</p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button id="btn-review-success" class="button-confirm" style="background: #27ae60;">Lembrei Bem</button>
                    <button id="btn-review-fail" class="button-confirm" style="background: #e67e22;">Preciso Melhorar</button>
                </div>
            </div>
        </div>
    `;

    const footer = document.querySelector('#neuro-modal .recalculo-modal-actions');
    footer.innerHTML = `
        <button id="btn-reveal-answer" class="button-confirm" style="width:100%; background-color:#8e44ad;">
            👀 Conferir Resposta Original
        </button>
    `;

    document.getElementById('btn-reveal-answer').addEventListener('click', function() {
        document.getElementById('review-feedback-area').style.display = 'block';
        this.style.display = 'none';
    });

    attachToolsToInputs();

    const processarConclusao = async (sucesso) => {
        await concluirRevisao(planoIndex, notaId, tipoRevisao, sucesso);
    };

    // Delay para garantir que listeners peguem os elementos criados no reveal
    // Usando delegação ou checagem posterior seria melhor, mas mantendo padrão do projeto:
    document.getElementById('neuro-modal-body').addEventListener('click', (e) => {
        if(e.target.id === 'btn-review-success') processarConclusao(true);
        if(e.target.id === 'btn-review-fail') processarConclusao(false);
    });
}

async function concluirRevisao(planoIndex, notaId, tipoRevisaoFull, sucesso) {
    const plano = state.getPlanoByIndex(planoIndex);
    const nota = plano.neuroAnnotations.find(n => n.id === notaId);
    
    let key = '';
    if (tipoRevisaoFull.includes('D+1')) key = 'd1';
    else if (tipoRevisaoFull.includes('D+3')) key = 'd3';
    else if (tipoRevisaoFull.includes('D+7')) key = 'd7';

    if (key) {
        if (!nota.reviewsDone) nota.reviewsDone = {};
        nota.reviewsDone[key] = true;
    }

    state.updatePlano(planoIndex, plano);
    
    ui.toggleLoading(true);
    try {
        const currentUser = state.getCurrentUser();
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        document.getElementById('neuro-modal').classList.remove('visivel');
        ui.renderApp(state.getPlanos(), currentUser);
    } catch(e) {
        console.error("Erro ao salvar revisão:", e);
        alert("Erro ao salvar revisão.");
    } finally {
        ui.toggleLoading(false);
    }
}

export function downloadMarkdown(plano) {
    if (!plano) return;
    let mdContent = `# 📘 Neuro-Anotações: ${plano.titulo}\n\n`;
    
    const allNotes = [...(plano.neuroAnnotations || [])].sort((a,b) => (a.pageStart||0) - (b.pageStart||0));
    
    allNotes.forEach((note, idx) => {
        mdContent += `## ${note.chapterTitle || `Sessão ${idx+1}`} (Pág. ${note.pageStart}-${note.pageEnd})\n`;
        if (note.theme) mdContent += `**Tema:** ${note.theme}\n\n`;
        
        // Mapear
        const q1 = note.meta?.find(m => m.subType === 'q1');
        const q2 = note.meta?.find(m => m.subType === 'q2');
        if (q1 || q2) {
            mdContent += `### 🗺️ Mapear\n`;
            if (q1) mdContent += `- **Q1:** ${q1.text}\n`;
            if (q2) mdContent += `- **Q2:** ${q2.text}\n`;
            mdContent += `\n`;
        }

        // Engajar
        const thesis = note.insights?.find(i => i.type === 'thesis');
        const concepts = note.insights?.find(i => i.type === 'concepts');
        const evidence = note.insights?.find(i => i.type === 'evidence');
        if (thesis || concepts || evidence) {
            mdContent += `### 📖 Engajar\n`;
            if (thesis) mdContent += `> **Tese:** ${thesis.text}\n\n`;
            if (evidence) mdContent += `**Evidência:** ${evidence.text}\n\n`;
            if (concepts) mdContent += `**Conceitos:**\n${concepts.text}\n\n`;
        }

        // Traduzir
        const feynman = note.meta?.find(m => m.type === 'translate');
        const gap = note.meta?.find(m => m.subType === 'gap');
        if (feynman || gap) {
            mdContent += `### 🧠 Traduzir\n`;
            if (feynman) mdContent += `${feynman.text}\n`;
            if (gap) mdContent += `\n> *Ponto de Confusão: ${gap.text}*\n`;
            mdContent += `\n`;
        }

        // Aplicar
        const action = note.meta?.find(m => m.type === 'apply');
        const confront = note.triggers?.find(t => t.subType === 'confront');
        if (action || confront) {
            mdContent += `### 🚀 Aplicar\n`;
            if (confront) mdContent += `- **Confronto:** ${confront.text}\n`;
            if (action) mdContent += `- **Ação:** ${action.text}\n`;
        }
        mdContent += `---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `NeuroNotes_${plano.titulo.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export function extractNoteDataFromDOM() {
    return tempNoteData;
}
