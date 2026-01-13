// modules/neuro-notes.js
// RESPONSABILIDADE: Gerenciar o Wizard M.E.T.A, sub-períodos de sessões e a consolidação temática do capítulo.
// V2.5.0 - Implementação de Agregação Temática e Validação de Hierarquia de Páginas.

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
        pStart: null, // Novo: Início da página na sessão
        pEnd: null,   // Novo: Fim da página na sessão
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
let editingSessionId = null; 

// --- Configuração dos Passos do Wizard (M.E.T.A.) ---
const WIZARD_STEPS = [
    {
        id: 'map',
        title: 'M - Mapear (Priming)',
        icon: 'map',
        guide: '<strong>Priming:</strong> Defina o sub-tema e o intervalo de páginas que você explorará nesta sessão específica.',
        validation: () => {
             const theme = document.getElementById('meta-theme')?.value;
             const q1 = document.getElementById('meta-map-q1')?.value;
             const pS = parseInt(document.getElementById('session-p-start')?.value);
             const pE = parseInt(document.getElementById('session-p-end')?.value);
             
             // Prioridade 3: Validação de Hierarquia
             if (pS < tempNoteData.pageStart || pE > tempNoteData.pageEnd) {
                 alert(`Atenção: O intervalo da sessão (${pS}-${pE}) deve estar dentro do intervalo do capítulo (${tempNoteData.pageStart}-${tempNoteData.pageEnd})`);
                 return false;
             }
             return theme && theme.length > 2 && q1 && q1.length > 2 && !isNaN(pS) && !isNaN(pE);
        },
        render: (data) => `
            <div class="neuro-input-group">
                <label>Sub-tema desta Sessão</label>
                <input type="text" id="meta-theme" class="neuro-textarea-card voice-me-input" placeholder="Ex: A metáfora do oleiro..." value="${data.currentSession.sessionTopic || ''}">
            </div>
            
            <div class="neuro-input-group" style="background: #fdf6ec; padding: 10px; border-radius: 8px; border: 1px solid #f39c1244;">
                <label style="color: #d35400; font-weight: bold;">Sub-período (Páginas de hoje):</label>
                <div class="range-inputs" style="display: flex; gap: 10px; align-items: center;">
                    <input type="number" id="session-p-start" class="macro-input" style="width: 80px;" placeholder="De" value="${data.currentSession.pStart || ''}" onchange="updateSessionRange()">
                    <span>até</span>
                    <input type="number" id="session-p-end" class="macro-input" style="width: 80px;" placeholder="Até" value="${data.currentSession.pEnd || ''}" onchange="updateSessionRange()">
                    <small style="color: #7f8c8d;">Capítulo: ${data.pageStart}-${data.pageEnd}</small>
                </div>
            </div>

            <div class="neuro-input-group">
                <label>O que eu busco aprender nestas páginas?</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="meta-map-q1" class="neuro-textarea-card voice-me-input" placeholder="Minha pergunta-guia..." value="${data.currentSession.meta.find(m => m.subType === 'q1')?.text || ''}" style="flex-grow: 1;">
                    ${createMicBtn('meta-map-q1')}
                </div>
            </div>
        `
    },
    {
        id: 'engage',
        title: 'E - Engajar (Voz do Autor)',
        icon: 'menu_book',
        guide: '<strong>Voz do Autor:</strong> Registre as teses centrais e evidências contidas neste intervalo de páginas.',
        validation: () => document.getElementById('engage-thesis')?.value.trim().length > 5,
        render: (data) => `
            <div class="neuro-input-group">
                <label>O que o autor afirma nestas páginas?</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <textarea id="engage-thesis" class="neuro-textarea-card voice-author-input" rows="3" placeholder="A tese defendida pelo autor é..." style="flex-grow: 1;">${data.currentSession.insights.find(i => i.type === 'thesis')?.text || ''}</textarea>
                    ${createMicBtn('engage-thesis')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Evidências / Citações Chave</label>
                <textarea id="engage-concepts" class="neuro-textarea-card voice-author-input" rows="2" placeholder="Ex: 'O homem é a medida...' ou referências bibliográficas">${data.currentSession.insights.find(i => i.type === 'concepts')?.text || ''}</textarea>
            </div>
        `
    },
    {
        id: 'translate',
        title: 'T - Traduzir (Recuperação)',
        icon: 'psychology',
        guide: '<strong>Minha Voz:</strong> Explique o sub-tema com suas palavras. O "Modo Cego" oculta as notas do passo anterior para forçar a memória.',
        render: (data) => `
            <div style="margin-bottom: 20px; padding: 10px; background: #eee; border-radius: 5px; filter: blur(4px); transition: filter 0.3s;" onmouseenter="this.style.filter='none'" onmouseleave="this.style.filter='blur(4px)'">
                <small>Notas do Autor (Recuperação Ativa):</small><br>
                <em>${data.currentSession.insights.find(i => i.type === 'thesis')?.text || 'Sem notas para exibir.'}</em>
            </div>
            <div class="neuro-input-group">
                <label>Minha explicação (O que entendi agora):</label>
                <div style="display: flex; gap: 8px; align-items: flex-start;">
                    <textarea id="translate-feynman" class="neuro-textarea-card voice-me-input" rows="4" placeholder="Eu explicaria isso assim..." style="flex-grow: 1;">${data.currentSession.meta.find(m => m.type === 'translate')?.text || ''}</textarea>
                    ${createMicBtn('translate-feynman')}
                </div>
            </div>
        `
    },
    {
        id: 'apply',
        title: 'A - Aplicar (C.A.P.E.)',
        icon: 'rocket_launch',
        guide: '<strong>Consolidação:</strong> Como este sub-tema se conecta ao todo e qual a ação prática?',
        render: (data) => `
             <div class="neuro-input-group">
                <label>Confronto ou Conexão Bíblica/Filosófica</label>
                <input type="text" id="apply-confront" class="neuro-textarea-card voice-me-input" placeholder="Isso se conecta com..." value="${data.currentSession.triggers.find(t => t.subType === 'confront')?.text || ''}">
            </div>
            <div class="neuro-input-group">
                <label>Micro-Ação baseada nestas páginas</label>
                <input type="text" id="apply-action" class="neuro-textarea-card voice-me-input" placeholder="Vou praticar isto através de..." value="${data.currentSession.meta.find(m => m.type === 'apply')?.text || ''}">
            </div>
        `
    }
];

// --- Motor de Consolidação Temática (Prioridade 2) ---

export function downloadConsolidatedMarkdown(plano) {
    if (!plano || !plano.neuroAnnotations) return;

    // Pega a anotação de capítulo ativa (a última ou a selecionada)
    const note = tempNoteData.id ? plano.neuroAnnotations.find(n => n.id === tempNoteData.id) : plano.neuroAnnotations[0];
    if (!note) return;

    let md = `# 📘 CONSOLIDAÇÃO TEMÁTICA: ${note.chapterTitle}\n\n`;
    md += `**TEMA MACRO:** ${note.theme || 'Não definido'}\n`;
    md += `**INTERVALO TOTAL:** Páginas ${note.pageStart} a ${note.pageEnd}\n`;
    md += `**SESSÕES TOTALIZADAS:** ${ (note.sessions?.length || 0) + 1 }\n\n`;
    md += `---\n\n`;

    const allSessions = [...(note.sessions || []), note.currentSession];

    allSessions.forEach((session, index) => {
        md += `## 🕒 Sessão ${index + 1}: ${session.sessionTopic || 'Sem Tópico'}\n`;
        md += `**Sub-período:** Pág. ${session.pStart || '?'} até ${session.pEnd || '?'}\n`;
        md += `**Data:** ${new Date(session.date).toLocaleDateString()}\n\n`;

        // Voz do Autor
        const thesis = session.insights.find(i => i.type === 'thesis');
        const concepts = session.insights.find(i => i.type === 'concepts');
        if (thesis || concepts) {
            md += `### ✍️ Voz do Autor (O que o texto diz)\n`;
            if (thesis) md += `> **Tese:** ${thesis.text}\n\n`;
            if (concepts) md += `**Evidências:**\n${concepts.text}\n\n`;
        }

        // Minha Voz
        const translate = session.meta.find(m => m.type === 'translate');
        if (translate) {
            md += `### 🧠 Minha Voz (Síntese e Tradução)\n`;
            md += `${translate.text}\n\n`;
        }

        // Aplicação
        const action = session.meta.find(m => m.type === 'apply');
        const connect = session.triggers.find(t => t.subType === 'confront');
        if (action || connect) {
            md += `### 🚀 Praxis (Aplicação e Conexões)\n`;
            if (connect) md += `* **Conexão:** ${connect.text}\n`;
            if (action) md += `* **Ação:** ${action.text}\n`;
        }
        
        md += `\n---\n\n`;
    });

    md += `\n*Documento gerado pelo sistema de Gerenciamento de Leitura Cognitiva.*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `CONSOLIDADO_${note.chapterTitle.replace(/\s+/g, '_')}.md`;
    a.click();
}

// --- Funções de Interface e Wizard ---

function ensureModalExists() {
    if (document.getElementById('neuro-modal')) return;
    const modalHTML = `
    <div id="neuro-modal" class="reavaliacao-modal-overlay">
        <div class="reavaliacao-modal-content neuro-theme" style="max-width: 800px; padding: 0; display: flex; flex-direction: column; max-height: 90vh;">
            <div class="reavaliacao-modal-header" style="background: linear-gradient(135deg, #1a252f 0%, #2c3e50 100%); padding: 15px 20px; border-radius: 8px 8px 0 0; color: white;">
                <h2 style="color: white; font-family: 'Playfair Display', serif; margin:0; display:flex; align-items:center; gap:10px;">
                    <span class="material-symbols-outlined">psychology_alt</span> Wizard Neuro-Retenção
                </h2>
                <button id="close-neuro-modal" class="reavaliacao-modal-close" style="color: white; opacity: 0.8;">×</button>
            </div>
            <div id="neuro-modal-body" class="neuro-modal-body" style="padding: 20px; overflow-y: auto; flex-grow: 1;"></div>
            <div class="recalculo-modal-actions" style="padding: 15px 20px; border-top: 1px solid #eee; background: #fafafa; border-radius: 0 0 8px 8px; margin-top:0;"></div>
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
    editingSessionId = null;

    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;

    // Busca anotação compatível ou a última
    let annotationFound = (plano.neuroAnnotations || []).find(note => {
        if (diaIndex !== null && plano.diasPlano[diaIndex]) {
            const dia = plano.diasPlano[diaIndex];
            return (dia.paginaInicioDia <= note.pageEnd && dia.paginaFimDia >= note.pageStart);
        }
        return false;
    }) || (plano.neuroAnnotations?.[plano.neuroAnnotations.length - 1]);

    tempNoteData = migrateLegacyData(annotationFound);
    
    // Se for um novo dia de um capítulo existente, pré-seta o sub-período
    if (diaIndex !== null && plano.diasPlano[diaIndex] && !tempNoteData.currentSession.pStart) {
        tempNoteData.currentSession.pStart = plano.diasPlano[diaIndex].paginaInicioDia;
        tempNoteData.currentSession.pEnd = plano.diasPlano[diaIndex].paginaFimDia;
    }

    renderModalUI();
    document.getElementById('neuro-modal').classList.add('visivel');
}

function renderModalUI() {
    const modalBody = document.getElementById('neuro-modal-body');
    const step = WIZARD_STEPS[currentStepIndex];

    const headerContextHTML = `
        <div class="neuro-context-header">
            <div class="neuro-macro-context">
                <span class="context-label">Contexto do Capítulo:</span>
                <div class="inputs-row">
                    <input type="text" id="neuro-chapter" value="${tempNoteData.chapterTitle}" class="macro-input" onchange="updateContextData('chapter')">
                    <div class="range-inputs">
                        <input type="number" id="neuro-range-start" value="${tempNoteData.pageStart || ''}" onchange="updateContextData('range')">
                        <span>a</span>
                        <input type="number" id="neuro-range-end" value="${tempNoteData.pageEnd || ''}" onchange="updateContextData('range')">
                    </div>
                </div>
            </div>
            <div id="save-indicator" class="save-status">${isDirty ? 'Aguardando...' : 'Sincronizado ✓'}</div>
        </div>`;
    
    const progressHTML = WIZARD_STEPS.map((s, idx) => `<div class="neuro-step-indicator ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}"></div>`).join('');

    modalBody.innerHTML = `
        ${headerContextHTML}
        <div class="neuro-wizard-progress">${progressHTML}</div>
        <div class="wizard-step-container">
            <div class="wizard-step-title"><span class="material-symbols-outlined">${step.icon}</span> ${step.title}</div>
            <div class="neuro-guide-box"><span class="material-symbols-outlined">lightbulb</span><div>${step.guide}</div></div>
            <div id="step-content">${step.render(tempNoteData)}</div>
        </div>`;

    updateWizardButtons();
    attachToolsToInputs();
}

function updateWizardButtons() {
    const footer = document.querySelector('#neuro-modal .recalculo-modal-actions');
    const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;
    
    footer.innerHTML = `
        <div style="display: flex; gap: 10px; width: 100%;">
            ${currentStepIndex > 0 ? `<button id="btn-prev-step" class="button-cancel">Voltar</button>` : `<button id="btn-reset-neuro" style="background:none; border:1px solid #e74c3c; color:#e74c3c; padding:8px 12px; border-radius:5px; cursor:pointer;">Nova Sessão</button>`}
            <div style="flex-grow:1;"></div>
            ${isLastStep ? `<button id="btn-save-neuro" class="button-confirm" style="background-color: #27ae60;">Concluir Sessão</button>` : `<button id="btn-next-step" class="button-confirm">Próximo Passo</button>`}
        </div>`;

    document.getElementById('btn-next-step')?.addEventListener('click', () => {
        if (WIZARD_STEPS[currentStepIndex].validation()) {
            saveCurrentStepData();
            currentStepIndex++;
            renderModalUI();
        }
    });
    document.getElementById('btn-prev-step')?.addEventListener('click', () => { saveCurrentStepData(); currentStepIndex--; renderModalUI(); });
    document.getElementById('btn-save-neuro')?.addEventListener('click', async () => { saveCurrentStepData(); await saveNote(); });
    document.getElementById('btn-reset-neuro')?.addEventListener('click', handleNewSession);
}

// --- Lógica de Dados e Persistência ---

function saveCurrentStepData() {
    const topic = document.getElementById('meta-theme')?.value;
    if (topic) tempNoteData.currentSession.sessionTopic = topic;

    const q1 = document.getElementById('meta-map-q1')?.value; if (q1) upsertMeta('map', q1, 'q1');
    const thesis = document.getElementById('engage-thesis')?.value; if (thesis) upsertInsight('thesis', thesis);
    const concepts = document.getElementById('engage-concepts')?.value; if (concepts) upsertInsight('concepts', concepts);
    const feynman = document.getElementById('translate-feynman')?.value; if (feynman) upsertMeta('translate', feynman);
    const action = document.getElementById('apply-action')?.value; if (action) upsertMeta('apply', action);
    const connect = document.getElementById('apply-confront')?.value; if (connect) upsertTrigger('confront', connect);
    
    isDirty = true;
    scheduleAutoSave();
}

export function updateSessionRange() {
    const pS = parseInt(document.getElementById('session-p-start').value);
    const pE = parseInt(document.getElementById('session-p-end').value);
    tempNoteData.currentSession.pStart = pS;
    tempNoteData.currentSession.pEnd = pE;
    isDirty = true;
    scheduleAutoSave();
}

function upsertMeta(type, text, subType = null) {
    const target = tempNoteData.currentSession.meta;
    const idx = target.findIndex(m => m.type === type && m.subType === subType);
    if (idx >= 0) target[idx].text = text;
    else target.push({ type, subType, text, timestamp: Date.now() });
}

function upsertInsight(type, text) {
    const target = tempNoteData.currentSession.insights;
    const idx = target.findIndex(i => i.type === type);
    if (idx >= 0) target[idx].text = text;
    else target.push({ type, text, timestamp: Date.now() });
}

function upsertTrigger(subType, text) {
     const target = tempNoteData.currentSession.triggers;
     const idx = target.findIndex(t => t.subType === subType);
     if (idx >= 0) target[idx].text = text;
     else target.push({ type: 'emotion', subType, text, timestamp: Date.now() });
}

async function saveNote() {
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    const idx = plano.neuroAnnotations.findIndex(n => n.id === tempNoteData.id);
    
    if (idx >= 0) plano.neuroAnnotations[idx] = JSON.parse(JSON.stringify(tempNoteData));
    else plano.neuroAnnotations.push(JSON.parse(JSON.stringify(tempNoteData)));

    await firestoreService.salvarPlanos(state.getCurrentUser(), state.getPlanos());
    closeNoteModal();
    ui.renderApp(state.getPlanos(), state.getCurrentUser());
}

function scheduleAutoSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        if (!isDirty) return;
        const si = document.getElementById('save-indicator');
        if (si) si.innerText = "Sincronizado ✓";
        isDirty = false;
        // O salvamento real ocorre no saveNote ou ao fechar o modal
    }, 2000);
}

function closeNoteModal() {
    document.getElementById('neuro-modal').classList.remove('visivel');
}

// --- Helpers e Migração ---

function migrateLegacyData(oldData) {
    const template = {
        id: crypto.randomUUID(),
        chapterTitle: 'Novo Capítulo',
        theme: '',
        pageStart: 1,
        pageEnd: 10,
        sessions: [],
        currentSession: {
            id: crypto.randomUUID(),
            sessionTopic: '',
            date: new Date().toISOString(),
            pStart: null,
            pEnd: null,
            insights: [],
            meta: [],
            triggers: [],
            flags: { blindModeRespect: false }
        }
    };

    if (!oldData) return template;
    
    // Se for dado antigo, tenta mapear para a nova estrutura de sessões
    if (!oldData.sessions) {
        const newData = { ...template, ...oldData };
        newData.sessions = [];
        return newData;
    }
    
    return JSON.parse(JSON.stringify(oldData));
}

function createMicBtn(targetId) {
    return `<button type="button" id="mic-${targetId}" class="btn-neuro-mic"><span class="material-symbols-outlined">mic</span></button>`;
}

function attachToolsToInputs() {
    setTimeout(() => {
        document.querySelectorAll('textarea, input[type="text"]').forEach(input => {
            const mic = document.getElementById(`mic-${input.id}`);
            if (mic) attachDictationToInput(input, mic);
        });
    }, 100);
}

function handleNewSession() {
    if (!confirm("Arquivar sessão atual e iniciar uma nova para este capítulo?")) return;
    saveCurrentStepData();
    tempNoteData.sessions.push(JSON.parse(JSON.stringify(tempNoteData.currentSession)));
    tempNoteData.currentSession = {
        id: crypto.randomUUID(),
        sessionTopic: '',
        date: new Date().toISOString(),
        pStart: tempNoteData.currentSession.pEnd + 1,
        pEnd: null,
        insights: [],
        meta: [],
        triggers: [],
        flags: { blindModeRespect: false }
    };
    currentStepIndex = 0;
    renderModalUI();
}

window.updateContextData = (field) => {
    if (field === 'chapter') tempNoteData.chapterTitle = document.getElementById('neuro-chapter').value;
    if (field === 'range') {
        tempNoteData.pageStart = parseInt(document.getElementById('neuro-range-start').value);
        tempNoteData.pageEnd = parseInt(document.getElementById('neuro-range-end').value);
    }
    isDirty = true;
    scheduleAutoSave();
};

// --- Diário de Bordo ---

export function openLogbook(planoIndex) {
    const plano = state.getPlanoByIndex(planoIndex);
    const note = plano.neuroAnnotations?.[plano.neuroAnnotations.length - 1];
    
    const container = document.getElementById('logbook-content');
    if (!note) {
        container.innerHTML = '<p>Inicie uma anotação para ver o histórico do capítulo.</p>';
    } else {
        let html = `
            <div class="logbook-header-info">
                <strong>Capítulo:</strong> ${note.chapterTitle} | Pág. ${note.pageStart}-${note.pageEnd}
                <button class="btn-neuro-action" style="margin-top:10px; width:100%;" onclick="window.dispatchLogbookAction('consolidate', ${planoIndex})">
                    <span class="material-symbols-outlined">inventory_2</span> Consolidação do Capítulo (.md)
                </button>
            </div>
            <div class="session-timeline">`;
        
        const all = [...(note.sessions || []), note.currentSession];
        all.reverse().forEach((s, idx) => {
            html += `
                <div class="session-card ${idx === 0 ? 'active-session' : ''}">
                    <span class="session-date">${new Date(s.date).toLocaleDateString()}</span>
                    <div class="session-topic">${s.sessionTopic || 'Sessão de Estudo'}</div>
                    <small>Páginas: ${s.pStart || '?'}-${s.pEnd || '?'}</small>
                </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    }
    
    document.getElementById('logbook-modal').classList.add('visivel');
    
    window.dispatchLogbookAction = (action, pIdx) => {
        if (action === 'consolidate') {
            const p = state.getPlanoByIndex(pIdx);
            downloadConsolidatedMarkdown(p);
        }
    };
}
