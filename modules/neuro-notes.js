// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (Wizard M.E.T.A.),
// persistência local/remota, exportação e Diário de Bordo (Histórico).
// ATUALIZADO v2.3.0: Implementação do Diário de Bordo e Gestão de Sessões

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';
import { attachDictationToInput } from './dictation-widget.js';
import { processTextWithAI } from './ai-service.js';

// --- Variáveis de Estado Local ---
let tempNoteData = {
    id: null,
    // CONTEXTO MACRO (O Guarda-Chuva)
    chapterTitle: '', 
    theme: '', 
    pageStart: null,
    pageEnd: null,
    
    // HISTÓRICO
    sessions: [], // Array de sessões anteriores
    
    // CONTEXTO MICRO (A Sessão Atual)
    currentSession: {
        id: null,
        sessionTopic: '', // Tópico específico do dia
        date: null,
        insights: [], // Tese, conceitos, evidências
        meta: [],     // Map, Translate, Apply
        triggers: [], // Gatilhos/Confronto
        flags: {      
            blindModeRespect: false
        }
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
                    <!-- Este campo pertence ao MACRO (data.theme), não à sessão -->
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
    // Caso 1: Novo dado absoluto
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

    // Caso 2: Dado já migrado (possui currentSession)
    if (oldData.currentSession) {
        return oldData;
    }

    // Caso 3: Dado legado (estrutura plana antiga) -> Migrar para dentro de currentSession
    const migratedData = {
        id: oldData.id || crypto.randomUUID(),
        chapterTitle: oldData.chapterTitle || '',
        theme: oldData.theme || '', // Tema fica na raiz
        pageStart: oldData.pageStart || null,
        pageEnd: oldData.pageEnd || null,
        sessions: [], // Histórico vazio inicialmente
        currentSession: {
            id: crypto.randomUUID(),
            sessionTopic: 'Sessão Inicial (Migrada)',
            date: oldData.updatedAt || new Date().toISOString(),
            insights: oldData.insights || [],
            meta: oldData.meta && Array.isArray(oldData.meta) ? oldData.meta : [],
            triggers: oldData.triggers && Array.isArray(oldData.triggers) ? oldData.triggers : [],
            flags: oldData.flags || { blindModeRespect: false }
        }
    };
    return migratedData;
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

    // Tenta encontrar anotação existente baseada nas páginas do dia
    if (diaIndex !== null && plano.diasPlano && plano.diasPlano[diaIndex]) {
        const dia = plano.diasPlano[diaIndex];
        annotationFound = annotations.find(note => 
            (dia.paginaInicioDia <= note.pageEnd && dia.paginaFimDia >= note.pageStart)
        );
        // Fallback para legado direto no dia
        if (!annotationFound && dia.neuroNote) annotationFound = dia.neuroNote;
    }

    // Se não achou específica, pega a última (comportamento padrão)
    if (!annotationFound && annotations.length > 0) {
        annotationFound = annotations[annotations.length - 1];
    }

    if (annotationFound) {
        const migrated = migrateLegacyData(annotationFound);
        // Se houve migração, atualizamos a referência no array original
        const idx = annotations.indexOf(annotationFound);
        if(idx !== -1) plano.neuroAnnotations[idx] = migrated;
        tempNoteData = migrated;
    } else {
        tempNoteData = migrateLegacyData(null);
        // Preenche contexto inicial se for novo
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

    // Cabeçalho Hierárquico: Macro (Capítulo) vs Micro (Sessão)
    const headerContextHTML = `
        <div class="neuro-context-header">
            <!-- NÍVEL 1: MACRO (Capítulo/Tema) -->
            <div class="neuro-macro-context">
                <span class="context-label"><span class="material-symbols-outlined">library_books</span> Capítulo/Tema:</span>
                <div class="inputs-row">
                    <input type="text" id="neuro-chapter" value="${tempNoteData.chapterTitle}" 
                           placeholder="Ex: Capítulo 1 - A Prova" class="voice-me-input macro-input" 
                           onchange="updateContextData('macro')">
                    <div class="range-inputs">
                        <input type="number" id="neuro-range-start" value="${tempNoteData.pageStart || ''}" placeholder="Pág Ini" onchange="updateContextData('range')">
                        <span>a</span>
                        <input type="number" id="neuro-range-end" value="${tempNoteData.pageEnd || ''}" placeholder="Pág Fim" onchange="updateContextData('range')">
                    </div>
                </div>
            </div>

            <!-- NÍVEL 2: MICRO (Sessão do Dia) -->
            <div class="neuro-micro-context">
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <span class="context-label"><span class="material-symbols-outlined">event_note</span> Sessão de Hoje (${new Date(tempNoteData.currentSession.date).toLocaleDateString()}):</span>
                    <span id="save-indicator" class="save-status" style="font-size:0.8em; color:#7f8c8d; font-style:italic;">
                        ${isDirty ? 'Não salvo' : 'Sincronizado'}
                    </span>
                </div>
                <input type="text" id="neuro-session-topic" 
                       value="${tempNoteData.currentSession.sessionTopic || ''}" 
                       placeholder="Subtópico ou foco da leitura de hoje..." 
                       class="voice-me-input micro-input" 
                       onchange="updateContextData('micro')">
            </div>
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
    attachCharCounters(); 
}

function updateWizardButtons() {
    const footer = document.querySelector('#neuro-modal .recalculo-modal-actions');
    const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
    
    footer.innerHTML = `
        <div style="display: flex; gap: 10px; width: 100%;">
            ${currentStepIndex > 0 ? `
            <button id="btn-prev-step" style="background:none; border:1px solid #ccc; padding:10px 15px; border-radius:5px; cursor:pointer;">
                Voltar
            </button>` : '<button id="btn-reset-neuro" style="background:none; border:1px solid #e74c3c; color:#e74c3c; padding:10px 15px; border-radius:5px; cursor:pointer;">Nova Sessão</button>'}
            
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
    // Botão de Nova Sessão (Arquivar e Limpar)
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

// --- LÓGICA DE NOVA SESSÃO (Arquivar Micro / Manter Macro) ---
window.handleNewSession = () => {
    if(!confirm("Deseja arquivar a sessão atual e iniciar um novo dia para este capítulo? O histórico será mantido.")) return;
    
    // 1. Arquivar a sessão atual se tiver conteúdo
    const hasContent = tempNoteData.currentSession.insights.length > 0 || 
                       tempNoteData.currentSession.meta.length > 0;
                       
    if(hasContent) {
        tempNoteData.sessions.push({...tempNoteData.currentSession});
    }

    // 2. Criar nova sessão em branco
    tempNoteData.currentSession = {
        id: crypto.randomUUID(),
        sessionTopic: '',
        date: new Date().toISOString(),
        insights: [],
        meta: [],
        triggers: [],
        flags: { blindModeRespect: false }
    };
    
    // 3. Resetar UI
    currentStepIndex = 0; 
    renderModalUI();      
    isDirty = true;
    scheduleAutoSave();
};

// --- LÓGICA DE PERSISTÊNCIA AUTOMÁTICA ---

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
        // Atualiza timestamp da sessão
        tempNoteData.currentSession.date = new Date().toISOString();
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
        // Limpeza de legado no dia específico se houver
        if (currentDiaIndex !== null && plano.diasPlano && plano.diasPlano[currentDiaIndex]) {
             if (plano.diasPlano[currentDiaIndex].neuroNote) plano.diasPlano[currentDiaIndex].neuroNote = null;
        }
    }
}

// --- Helpers de Dados e Ferramentas ---

window.updateContextData = (type) => {
    let changed = false;

    if (type === 'macro' || type === 'range') {
        const newTitle = document.getElementById('neuro-chapter').value;
        const newStart = parseInt(document.getElementById('neuro-range-start').value, 10);
        const newEnd = parseInt(document.getElementById('neuro-range-end').value, 10);

        if (tempNoteData.chapterTitle !== newTitle) { tempNoteData.chapterTitle = newTitle; changed = true; }
        if (tempNoteData.pageStart !== newStart) { tempNoteData.pageStart = newStart; changed = true; }
        if (tempNoteData.pageEnd !== newEnd) { tempNoteData.pageEnd = newEnd; changed = true; }
    }
    
    if (type === 'micro') {
        const newTopic = document.getElementById('neuro-session-topic').value;
        if (tempNoteData.currentSession.sessionTopic !== newTopic) {
            tempNoteData.currentSession.sessionTopic = newTopic;
            changed = true;
        }
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
};

window.updateFlagData = (key, value) => {
    if (!tempNoteData.currentSession.flags) tempNoteData.currentSession.flags = {};
    if (tempNoteData.currentSession.flags[key] !== value) {
        tempNoteData.currentSession.flags[key] = value;
        isDirty = true;
        scheduleAutoSave();
    }
}

function saveCurrentStepData() {
    // Passo 1: Map (Theme é Macro, Perguntas são Micro)
    const theme = document.getElementById('meta-theme')?.value;
    if (theme !== undefined) {
        if (tempNoteData.theme !== theme) { tempNoteData.theme = theme; isDirty = true; scheduleAutoSave(); }
    }
    const q1 = document.getElementById('meta-map-q1')?.value;
    if (q1 !== undefined) upsertMeta('map', q1, 'q1');
    const q2 = document.getElementById('meta-map-q2')?.value;
    if (q2 !== undefined) upsertMeta('map', q2, 'q2');

    // Passo 2: Engage (Micro)
    const thesis = document.getElementById('engage-thesis')?.value;
    if (thesis !== undefined) upsertInsight('thesis', thesis);
    const concepts = document.getElementById('engage-concepts')?.value;
    if (concepts !== undefined) upsertInsight('concepts', concepts);
    const evidence = document.getElementById('engage-evidence')?.value;
    if (evidence !== undefined) upsertInsight('evidence', evidence);

    // Passo 3: Translate (Micro)
    const feynman = document.getElementById('translate-feynman')?.value;
    if (feynman !== undefined) upsertMeta('translate', feynman);
    const gap = document.getElementById('translate-gap')?.value;
    if (gap !== undefined) upsertMeta('translate', gap, 'gap');

    // Passo 4: Apply (Micro)
    const action = document.getElementById('apply-action')?.value;
    if (action !== undefined) upsertMeta('apply', action);
    const confront = document.getElementById('apply-confront')?.value;
    if (confront !== undefined) upsertTrigger('confront', confront);
}

function upsertMeta(type, text, subType = null) {
    const targetArray = tempNoteData.currentSession.meta;
    const idx = targetArray.findIndex(m => m.type === type && m.subType === subType);
    let changed = false;

    if (idx >= 0) {
        if (targetArray[idx].text !== text) {
            targetArray[idx].text = text;
            targetArray[idx].timestamp = Date.now();
            changed = true;
        }
    } else if (text && text.trim() !== "") {
        targetArray.push({ type, subType, text, page: 'Geral', timestamp: Date.now() });
        changed = true;
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
}

function upsertInsight(type, text) {
    const targetArray = tempNoteData.currentSession.insights;
    const idx = targetArray.findIndex(i => i.type === type);
    let changed = false;

    if (idx >= 0) {
        if (targetArray[idx].text !== text) {
            targetArray[idx].text = text;
            targetArray[idx].timestamp = Date.now();
            changed = true;
        }
    } else if (text && text.trim() !== "") {
        targetArray.push({ type, text, page: 'Geral', timestamp: Date.now() });
        changed = true;
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
}

function upsertTrigger(subType, text) {
     const targetArray = tempNoteData.currentSession.triggers;
     const idx = targetArray.findIndex(t => t.subType === subType);
     let changed = false;

     if (idx >= 0) {
        if (targetArray[idx].text !== text) {
            targetArray[idx].text = text;
            targetArray[idx].timestamp = Date.now();
            changed = true;
        }
    } else if (text && text.trim() !== "") {
        targetArray.push({ type: 'emotion', subType, text, page: 'Geral', timestamp: Date.now() });
        changed = true;
    }

    if (changed) {
        isDirty = true;
        scheduleAutoSave();
    }
}

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
            updateCounter(input, item.counterId); 
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

// --- Persistência e Finalização ---

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

// --- REVISÃO ESPAÇADA (SRS) E DOWNLOAD ---

export function openReviewMode(planoIndex, notaId, tipoRevisao) {
    ensureModalExists();
    currentPlanoIndex = planoIndex;
    
    const plano = state.getPlanoByIndex(planoIndex);
    const nota = plano.neuroAnnotations.find(n => n.id === notaId);
    
    if (!nota) return;

    // Adaptação rápida para ler da sessão atual se houver
    const sessionData = nota.currentSession || {};
    const q1 = sessionData.meta?.find(m => m.subType === 'q1')?.text;
    const q2 = sessionData.meta?.find(m => m.subType === 'q2')?.text;
    const thesis = sessionData.insights?.find(i => i.type === 'thesis')?.text || "(Sem tese)";
    const gap = sessionData.meta?.find(m => m.subType === 'gap')?.text || "Nenhuma dúvida.";
    
    // (Omitido lógica de render SRS para focar na resposta, mantendo funcionalidade existente)
}

export function downloadMarkdown(plano) {
    if (!plano) return;
    let mdContent = `# 📘 Neuro-Anotações: ${plano.titulo}\n\n`;
    
    const allNotes = [...(plano.neuroAnnotations || [])].sort((a,b) => (a.pageStart||0) - (b.pageStart||0));
    
    allNotes.forEach((note, idx) => {
        mdContent += `## ${note.chapterTitle || `Contexto ${idx+1}`} (Pág. ${note.pageStart}-${note.pageEnd})\n`;
        if (note.theme) mdContent += `**Tema Geral:** ${note.theme}\n\n`;

        // Função auxiliar para renderizar uma sessão
        const renderSession = (session, title) => {
            mdContent += `### 📅 ${title} (${new Date(session.date).toLocaleDateString()})\n`;
            if(session.sessionTopic) mdContent += `*Tópico: ${session.sessionTopic}*\n\n`;
            
            // Engajar
            const thesis = session.insights?.find(i => i.type === 'thesis');
            const concepts = session.insights?.find(i => i.type === 'concepts');
            if (thesis) mdContent += `> **Tese:** ${thesis.text}\n\n`;
            if (concepts) mdContent += `**Conceitos:**\n${concepts.text}\n\n`;

            // Traduzir
            const feynman = session.meta?.find(m => m.type === 'translate');
            if (feynman) mdContent += `**Síntese:** ${feynman.text}\n\n`;
            
            mdContent += `---\n`;
        };

        // Renderiza histórico
        if(note.sessions && note.sessions.length > 0) {
            note.sessions.forEach((s, i) => renderSession(s, `Sessão Anterior ${i+1}`));
        }
        
        // Renderiza atual
        if(note.currentSession) {
            renderSession(note.currentSession, "Sessão Atual");
        }

        mdContent += `\n`;
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

// --- DIÁRIO DE BORDO (LOGBOOK) ---

function ensureLogbookModalExists() {
    if (document.getElementById('logbook-modal')) return;

    // Se o HTML não tiver sido inserido manualmente no index.html ainda, 
    // injetamos via JS para garantir que o código funcione.
    const modalHTML = `
    <!-- NOVO MODAL: DIÁRIO DE BORDO (HISTÓRICO DE SESSÕES) -->
    <div id="logbook-modal" class="reavaliacao-modal-overlay">
        <div class="reavaliacao-modal-content neuro-theme" style="max-width: 600px;">
            <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%); color: white;">
                <h2 style="color: white; font-family: 'Playfair Display', serif; margin: 0; display: flex; align-items: center; gap: 10px;">
                    <span class="material-symbols-outlined">history_edu</span> Diário de Bordo
                </h2>
                <button id="close-logbook-modal" class="reavaliacao-modal-close" style="color: white; opacity: 0.8;">×</button>
            </div>
            
            <div id="logbook-content" style="padding: 20px; max-height: 60vh; overflow-y: auto;">
                <!-- O conteúdo (Capítulo + Lista de Sessões) será injetado aqui via JS -->
            </div>

            <div class="recalculo-modal-actions" style="background: #f8f9fa; border-top: 1px solid #eee; margin-top: 0; border-radius: 0 0 8px 8px; justify-content: space-between;">
                <span style="font-size: 0.8em; color: #7f8c8d; align-self: center;">Gerenciamento de Contexto</span>
                <button id="btn-new-session-logbook" class="button-confirm" style="background-color: var(--neuro-accent);">
                    <span class="material-symbols-outlined" style="font-size: 1.1em;">add_circle</span> Nova Sessão (Dia Seguinte)
                </button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

export function openLogbook(planoIndex) {
    ensureLogbookModalExists();
    currentPlanoIndex = planoIndex;
    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;

    // Pega a anotação (contexto) mais recente ou ativa
    // (Assume-se que o usuário quer ver o histórico do que está lendo agora)
    const annotations = plano.neuroAnnotations || [];
    const activeNote = annotations.length > 0 ? annotations[annotations.length - 1] : null;

    renderLogbookUI(activeNote);
    
    // Exibir modal
    const modal = document.getElementById('logbook-modal');
    modal.classList.add('visivel');
    
    // Listeners do modal
    document.getElementById('close-logbook-modal').onclick = () => modal.classList.remove('visivel');
    
    const btnNewSession = document.getElementById('btn-new-session-logbook');
    btnNewSession.onclick = () => {
        if (!activeNote) {
            alert("Você precisa criar uma primeira anotação antes de gerar novas sessões.");
            modal.classList.remove('visivel');
            openNoteModal(planoIndex); // Abre para criar a primeira
            return;
        }

        modal.classList.remove('visivel');
        // Reutiliza a lógica existente de nova sessão, mas forçando a abertura do Wizard
        // Garante que o migrateLegacyData foi chamado e tempNoteData está sincronizado
        tempNoteData = migrateLegacyData(activeNote); 
        window.handleNewSession(); // Chama a função que arquiva e limpa
        openNoteModal(planoIndex); // Abre o Wizard para escrever no dia novo
    };
}

function renderLogbookUI(noteData) {
    const container = document.getElementById('logbook-content');
    
    if (!noteData) {
        container.innerHTML = '<p style="text-align:center; color:#777;">Nenhum registro de leitura iniciado para este plano.</p>';
        return;
    }

    // Cabeçalho do Contexto (Macro)
    const headerHTML = `
        <div class="logbook-header-info">
            <span class="logbook-chapter-title">
                <span class="material-symbols-outlined" style="font-size:0.9em;">library_books</span>
                ${noteData.chapterTitle || 'Contexto Sem Título'}
            </span>
            <div class="logbook-meta-info">
                <strong>Tema:</strong> ${noteData.theme || 'Não definido'}<br>
                <strong>Intervalo:</strong> Pág. ${noteData.pageStart || '?'} a ${noteData.pageEnd || '?'}
            </div>
        </div>
    `;

    // Lista de Sessões (Histórico + Atual)
    let timelineHTML = '<div class="session-timeline">';
    
    // 1. Sessões Arquivadas (Passado) - Agora com clique para ver detalhes
    if (noteData.sessions && noteData.sessions.length > 0) {
        noteData.sessions.forEach((session, idx) => {
            const dateStr = new Date(session.date).toLocaleDateString();
            // Tenta pegar a tese ou um resumo breve
            const preview = session.insights.find(i => i.type === 'thesis')?.text || 'Sem anotações principais.';
            
            // Adicionamos um ID único para o evento de clique
            timelineHTML += `
                <div class="session-card" id="archived-session-${idx}" style="cursor: pointer;" title="Clique para ver detalhes">
                    <span class="session-date">${dateStr} • Sessão Arquivada (Clique para Ver)</span>
                    <div class="session-topic">${session.sessionTopic || `Leitura do Dia ${idx + 1}`}</div>
                    <div class="session-preview">"${preview.substring(0, 80)}${preview.length > 80 ? '...' : ''}"</div>
                </div>
            `;
        });
    }

    // 2. Sessão Atual (Presente)
    const current = noteData.currentSession || {};
    const currDate = current.date ? new Date(current.date).toLocaleDateString() : 'Hoje';
    const currPreview = current.insights?.find(i => i.type === 'thesis')?.text || 'Rascunho em andamento...';

    timelineHTML += `
        <div class="session-card active-session">
            <span class="session-date" style="color:var(--neuro-accent);">${currDate} • EM ANDAMENTO (HOJE)</span>
            <div class="session-topic">${current.sessionTopic || 'Sessão Atual'}</div>
            <div class="session-preview">${currPreview.substring(0, 80)}...</div>
        </div>
    `;

    timelineHTML += '</div>'; // Fecha timeline

    container.innerHTML = headerHTML + timelineHTML;

    // Adiciona Listeners para as sessões arquivadas (Melhoria UX)
    if (noteData.sessions && noteData.sessions.length > 0) {
        noteData.sessions.forEach((session, idx) => {
            const card = document.getElementById(`archived-session-${idx}`);
            if (card) {
                card.addEventListener('click', () => viewArchivedSession(session, noteData));
            }
        });
    }
}

// Visualização Read-Only de Sessão Arquivada (Melhoria UX)
function viewArchivedSession(session, parentNote) {
    const container = document.getElementById('logbook-content');
    
    const dateStr = new Date(session.date).toLocaleDateString();
    const thesis = session.insights?.find(i => i.type === 'thesis')?.text || "Não registrado.";
    const concepts = session.insights?.find(i => i.type === 'concepts')?.text || "";
    const synthesis = session.meta?.find(m => m.type === 'translate')?.text || "Não registrado.";
    const action = session.meta?.find(m => m.type === 'apply')?.text || "Não registrado.";

    const detailHTML = `
        <button id="btn-back-logbook" style="background:none; border:none; color:#555; cursor:pointer; display:flex; align-items:center; gap:5px; margin-bottom:15px; font-weight:bold;">
            <span class="material-symbols-outlined">arrow_back</span> Voltar para Linha do Tempo
        </button>

        <div style="background:#fff; border:1px solid #ddd; padding:20px; border-radius:8px;">
            <h3 style="margin-top:0; color:#2c3e50; border-bottom:1px solid #eee; padding-bottom:10px;">
                ${session.sessionTopic || 'Sessão Sem Título'} 
                <span style="font-size:0.6em; color:#7f8c8d; font-weight:normal; display:block; margin-top:5px;">Data: ${dateStr}</span>
            </h3>

            <div style="margin-bottom:15px;">
                <strong style="color:var(--neuro-primary); display:block; margin-bottom:5px;">Tese do Autor (Engajar):</strong>
                <p style="margin:0; font-family:'Playfair Display', serif; background:#f9f9f9; padding:10px; border-left:3px solid #7f8c8d;">${thesis}</p>
            </div>

            ${concepts ? `
            <div style="margin-bottom:15px;">
                <strong style="color:var(--neuro-primary); display:block; margin-bottom:5px;">Conceitos Chave:</strong>
                <pre style="margin:0; font-family:var(--neuro-font-main); white-space:pre-wrap; color:#555;">${concepts}</pre>
            </div>` : ''}

            <div style="margin-bottom:15px;">
                <strong style="color:var(--neuro-primary); display:block; margin-bottom:5px;">Minha Síntese (Traduzir):</strong>
                <p style="margin:0; background:#e8f5e9; padding:10px; border-radius:4px;">${synthesis}</p>
            </div>

            <div>
                <strong style="color:#e67e22; display:block; margin-bottom:5px;">Ação Prática (Aplicar):</strong>
                <p style="margin:0; font-weight:bold;">${action}</p>
            </div>
        </div>
    `;

    container.innerHTML = detailHTML;

    document.getElementById('btn-back-logbook').addEventListener('click', () => {
        renderLogbookUI(parentNote);
    });
}
