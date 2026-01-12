// modules/neuro-notes.js
// RESPONSABILIDADE ÚNICA: Gerenciar lógica de anotações cognitivas (Wizard M.E.T.A.),
// persistência local/remota e exportação.
// ATUALIZADO v2.0.1: Persistência Granular (Auto-Save), Debounce e Lazy Initialization.

import * as state from './state.js';
import * as firestoreService from './firestore-service.js';
import * as ui from './ui.js';
import { attachDictationToInput } from './dictation-widget.js';
import { processTextWithAI } from './ai-service.js';

// --- Variáveis de Estado Local ---
let tempNoteData = {
    id: null,
    chapterTitle: '',
    pageStart: null,
    pageEnd: null,
    insights: [], // Array para tese, conceitos (Engage)
    meta: [],     // Array para Map, Translate, Apply
    triggers: []  // Array para Gatilhos/Confronto
};

let currentPlanoIndex = null;
let currentDiaIndex = null;
let currentStepIndex = 0; // Controle do passo atual do Wizard

// --- Variáveis de Controle de Persistência (v2.0.1) ---
let saveTimeout = null;
let isDirty = false; // Indica se houve alteração real pendente de salvamento

// --- Configuração dos Passos do Wizard (M.E.T.A.) ---
const WIZARD_STEPS = [
    {
        id: 'map',
        title: 'M - Mapear (Intenção)',
        icon: 'map',
        guide: '<strong>Priming:</strong> O cérebro ignora o que não busca. Antes de ler, defina 2 perguntas que você quer responder.',
        validation: () => {
             const q1 = document.getElementById('meta-map-q1')?.value;
             const q2 = document.getElementById('meta-map-q2')?.value;
             return q1 && q1.trim().length > 3 && q2 && q2.trim().length > 3;
        },
        render: (data) => `
            <div class="neuro-input-group">
                <label>Pergunta Guia 1 (O que quero entender?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="meta-map-q1" class="neuro-textarea-card voice-me-input" placeholder="Ex: Qual é o argumento central deste capítulo?" value="${data.meta.find(m => m.subType === 'q1')?.text || ''}" style="flex-grow: 1;">
                    ${createMagicBtn('meta-map-q1')}
                    ${createMicBtn('meta-map-q1')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Pergunta Guia 2 (O que quero aplicar?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <input type="text" id="meta-map-q2" class="neuro-textarea-card voice-me-input" placeholder="Ex: Como isso muda minha prática?" value="${data.meta.find(m => m.subType === 'q2')?.text || ''}" style="flex-grow: 1;">
                    ${createMagicBtn('meta-map-q2')}
                    ${createMicBtn('meta-map-q2')}
                </div>
            </div>
        `
    },
    {
        id: 'engage',
        title: 'E - Engajar (Voz do Autor)',
        icon: 'menu_book',
        guide: '<strong>Leitura Ativa:</strong> Registre o que o AUTOR disse. Seja fiel ao texto. Não misture sua opinião agora.',
        validation: () => document.getElementById('engage-thesis')?.value.trim().length > 5,
        render: (data) => `
            <div class="neuro-input-group">
                <label>Frase-Tese do Autor (O que ele está afirmando?)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="engage-thesis" class="neuro-textarea-card voice-author-input" rows="3" placeholder="O autor argumenta que..." style="flex-grow: 1;">${data.insights.find(i => i.type === 'thesis')?.text || ''}</textarea>
                    ${createMagicBtn('engage-thesis')}
                    ${createMicBtn('engage-thesis')}
                </div>
            </div>
            <div class="neuro-input-group">
                <label>Conceitos Chave / Evidências</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="engage-concepts" class="neuro-textarea-card voice-author-input" rows="3" placeholder="- Conceito A&#10;- Conceito B" style="flex-grow: 1;">${data.insights.find(i => i.type === 'concepts')?.text || ''}</textarea>
                    ${createMagicBtn('engage-concepts')}
                    ${createMicBtn('engage-concepts')}
                </div>
            </div>
        `
    },
    {
        id: 'translate',
        title: 'T - Traduzir (Recuperação)',
        icon: 'psychology',
        guide: '<strong>Modo Cego:</strong> Sem olhar suas notas anteriores (ocultas abaixo), explique o conceito com suas palavras (Técnica Feynman).',
        render: (data) => `
            <div style="margin-bottom: 20px; padding: 10px; background: #eee; border-radius: 5px;" class="blind-mode-overlay">
                <strong>Notas Anteriores (Ocultas para fortalecer memória):</strong><br>
                <em>${data.insights.find(i => i.type === 'thesis')?.text || '...'}</em>
            </div>
            
            <div class="neuro-input-group">
                <label>Minha Síntese (Minha Voz)</label>
                <div style="display: flex; gap: 8px; align-items: flex-start; width: 100%;">
                    <textarea id="translate-feynman" class="neuro-textarea-card voice-me-input" rows="4" placeholder="Basicamente, isso significa que..." style="flex-grow: 1;">${data.meta.find(m => m.type === 'translate')?.text || ''}</textarea>
                    ${createMagicBtn('translate-feynman')}
                    ${createMicBtn('translate-feynman')}
                </div>
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
        pageStart: null,
        pageEnd: null,
        insights: [],
        meta: [],
        triggers: []
    };

    const newData = {
        id: oldData.id || crypto.randomUUID(),
        chapterTitle: oldData.chapterTitle || '',
        pageStart: oldData.pageStart || null,
        pageEnd: oldData.pageEnd || null,
        insights: oldData.insights || [],
        meta: oldData.meta && Array.isArray(oldData.meta) ? oldData.meta : [],
        triggers: oldData.triggers && Array.isArray(oldData.triggers) ? oldData.triggers : []
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
    currentStepIndex = 0; // Reseta para o primeiro passo
    isDirty = false; // Reseta estado de salvamento

    const plano = state.getPlanoByIndex(planoIndex);
    if (!plano) return;

    let annotationFound = null;
    const annotations = plano.neuroAnnotations || [];

    // Lógica de Contexto
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

    // Inicialização Inteligente (Lazy Initialization)
    if (annotationFound) {
        // Se já existe, usamos a referência direta do estado para permitir reactive updates
        // Garantimos migração se necessário, mas mantendo a referência se possível
        // ou atualizando o array do plano.
        const migrated = migrateLegacyData(annotationFound);
        // Atualiza no array para garantir estrutura nova
        const idx = annotations.indexOf(annotationFound);
        if(idx !== -1) plano.neuroAnnotations[idx] = migrated;
        tempNoteData = migrated;
    } else {
        // Se NÃO existe, criamos um objeto "flutuante".
        // Ele NÃO é adicionado ao plano ainda (evita rascunhos fantasmas).
        // Será adicionado na primeira chamada de 'ensureAttachedToPlan' via 'upsert'.
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
    // Se houver salvamento pendente ao fechar, força execução imediata (tentativa)
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
    
    // Reseta Título do Modal para o padrão Wizard
    headerTitle.innerHTML = `<span class="material-symbols-outlined">psychology_alt</span> Wizard Neuro-Retenção`;

    const step = WIZARD_STEPS[currentStepIndex];

    // Configuração de Título e Páginas com Indicador de Status (v2.0.1)
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
    
    // Indicadores de Progresso
    const progressHTML = WIZARD_STEPS.map((s, idx) => `
        <div class="neuro-step-indicator ${idx === currentStepIndex ? 'active' : ''} ${idx < currentStepIndex ? 'completed' : ''}"></div>
    `).join('');

    // Renderiza Corpo
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
        // Ao navegar, salvamos o estado dos inputs do passo atual no objeto
        saveCurrentStepData(); 
        currentStepIndex--;
        renderModalUI();
    });
    document.getElementById('btn-save-neuro')?.addEventListener('click', async () => {
        saveCurrentStepData();
        await saveNote(); // SaveNote final fecha o modal
    });
    document.getElementById('btn-reset-neuro')?.addEventListener('click', handleResetNeuro);
}

function handleNextStep() {
    const step = WIZARD_STEPS[currentStepIndex];
    saveCurrentStepData(); 

    // Guardrail: Validação Obrigatória
    if (step.validation && !step.validation()) {
        alert("⚠️ Guardrail Ativado: Por favor, preencha os campos essenciais para garantir sua retenção.");
        return;
    }

    currentStepIndex++;
    renderModalUI();
}

// --- LÓGICA DE PERSISTÊNCIA AUTOMÁTICA (v2.0.1) ---

function scheduleAutoSave() {
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) {
        saveIndicator.innerText = "Salvando em breve...";
        saveIndicator.style.color = "#e67e22"; // Laranja
    }
    
    // Cancela o timer anterior se o usuário continuou digitando
    if (saveTimeout) clearTimeout(saveTimeout);

    // Agenda o salvamento para 2 segundos após parar de digitar
    saveTimeout = setTimeout(async () => {
        await performSilentSave();
    }, 2000);
}

async function performSilentSave() {
    if (!isDirty) return; // Nada mudou, não gasta cota

    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) saveIndicator.innerText = "Sincronizando...";

    try {
        tempNoteData.updatedAt = new Date().toISOString();
        
        // Garante que o objeto está no plano antes de salvar
        ensureAttachedToPlan();

        // Persiste no Firestore
        const currentUser = state.getCurrentUser();
        if (currentUser) {
            await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        }
        
        if (saveIndicator) {
            saveIndicator.innerText = "Salvo ✓";
            saveIndicator.style.color = "#27ae60"; // Verde
        }
        isDirty = false; // Reseta flag
        saveTimeout = null;

        // Atualiza UI em background sem reload total
        // (Opcional, depende de quão reativa precisa ser a lista principal)
    } catch (e) {
        console.warn("Erro no auto-save:", e);
        if (saveIndicator) {
            saveIndicator.innerText = "⚠️ Offline (Salvo local)";
            saveIndicator.style.color = "#c0392b";
        }
        // Dados permanecem em memória e isDirty true, tentará na próxima
    }
}

function ensureAttachedToPlan() {
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    if (!plano) return;
    
    if (!plano.neuroAnnotations) plano.neuroAnnotations = [];

    // Verifica se este objeto (referência ou ID) já está no array
    const exists = plano.neuroAnnotations.find(n => n.id === tempNoteData.id);
    
    if (!exists) {
        // Se é um "rascunho flutuante", agora ele vira oficial
        plano.neuroAnnotations.push(tempNoteData);
        // Limpa legado se houver
        if (currentDiaIndex !== null && plano.diasPlano && plano.diasPlano[currentDiaIndex]) {
             if (plano.diasPlano[currentDiaIndex].neuroNote) plano.diasPlano[currentDiaIndex].neuroNote = null;
        }
    }
}

// --- Helpers de Dados e Ferramentas (Refatorados para Dirty Check) ---

// Atualiza título e range no objeto global
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

// Captura dados do DOM para o objeto tempNoteData
function saveCurrentStepData() {
    // Passo 1: Map
    const q1 = document.getElementById('meta-map-q1')?.value;
    if (q1 !== undefined) upsertMeta('map', q1, 'q1');
    const q2 = document.getElementById('meta-map-q2')?.value;
    if (q2 !== undefined) upsertMeta('map', q2, 'q2');

    // Passo 2: Engage
    const thesis = document.getElementById('engage-thesis')?.value;
    if (thesis !== undefined) upsertInsight('thesis', thesis);
    const concepts = document.getElementById('engage-concepts')?.value;
    if (concepts !== undefined) upsertInsight('concepts', concepts);

    // Passo 3: Translate
    const feynman = document.getElementById('translate-feynman')?.value;
    if (feynman !== undefined) upsertMeta('translate', feynman);

    // Passo 4: Apply
    const action = document.getElementById('apply-action')?.value;
    if (action !== undefined) upsertMeta('apply', action);
    const confront = document.getElementById('apply-confront')?.value;
    if (confront !== undefined) upsertTrigger('confront', confront);
    
    // Atualiza cabeçalho também (garantia)
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
    } else if (text && text.trim() !== "") { // Só insere se tiver texto
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

// Reconecta ferramentas de IA (Mic/Magic) aos novos inputs e adiciona listeners de Auto-Save (Backup)
function attachToolsToInputs() {
    setTimeout(() => {
        const inputs = document.querySelectorAll('textarea, input[type="text"]');
        inputs.forEach(input => {
            // Backup Auto-Save no Blur (caso feche sem digitar mais nada)
            input.addEventListener('blur', () => {
                if (isDirty) scheduleAutoSave(); // Ou force performSilentSave() se preferir agressividade
            });

            // Dictation
            const micBtn = document.getElementById(`mic-${input.id}`);
            if (micBtn) attachDictationToInput(input, micBtn);

            // AI Correction
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
                        input.dispatchEvent(new Event('input')); // Dispara input para ativar isDirty via listeners normais se houver
                        // Força dirty manualmente pois mudamos programaticamente
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
    // Este botão agora atua como "Concluir e Fechar", já que o dado é salvo automaticamente.
    // Ele força uma sincronização final imediata.

    const pStart = parseInt(tempNoteData.pageStart, 10);
    const pEnd = parseInt(tempNoteData.pageEnd, 10);
    
    if (isNaN(pStart) || isNaN(pEnd)) {
        alert('Defina o intervalo de páginas no topo antes de concluir.');
        return;
    }

    if (saveTimeout) clearTimeout(saveTimeout); // Cancela debounce pendente
    isDirty = true; // Garante que performSilentSave rode
    
    // Assegura estrutura correta
    ensureAttachedToPlan();

    ui.toggleLoading(true);
    try {
        await performSilentSave(); // Aguarda save final
        
        ui.toggleLoading(false);
        closeNoteModal();
        // Atualiza a UI principal para refletir novos ícones/status
        const currentUser = state.getCurrentUser();
        if (currentUser) ui.renderApp(state.getPlanos(), currentUser);
        
    } catch (error) {
        ui.toggleLoading(false);
        console.error("Erro ao salvar final:", error);
        alert('Sua nota está salva localmente, mas houve erro ao sincronizar. Tente novamente.');
    }
}

async function handleResetNeuro() {
    if (!confirm("Isso apagará o progresso atual deste contexto e resetará para o início. Continuar?")) return;
    
    // Se estava salvo no plano, removemos ou limpamos
    const plano = state.getPlanoByIndex(currentPlanoIndex);
    if (plano && plano.neuroAnnotations) {
        const idx = plano.neuroAnnotations.indexOf(tempNoteData);
        if (idx !== -1) {
            plano.neuroAnnotations.splice(idx, 1);
            isDirty = true;
            scheduleAutoSave(); // Sincroniza a remoção
        }
    }

    tempNoteData = migrateLegacyData(null); // Reseta objeto em memória
    currentStepIndex = 0;
    renderModalUI();
}

// --- NOVO: LÓGICA DE REVISÃO ESPAÇADA (SRS) - PRIORIDADES 2 e 3 ---

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

    // Conteúdo: Pergunta (Visível) vs Resposta (Oculta)
    // Tenta pegar a pergunta guia 1, ou a 2, ou um fallback
    const pergunta = nota.meta?.find(m => m.subType === 'q1')?.text 
                  || nota.meta?.find(m => m.subType === 'q2')?.text 
                  || "Qual a tese central deste trecho?";
                  
    // Tenta pegar a síntese própria (Translate) ou a tese do autor
    const respostaOriginal = nota.meta?.find(m => m.type === 'translate')?.text 
                          || nota.insights?.find(i => i.type === 'thesis')?.text 
                          || "(Sem anotação original)";

    modalBody.innerHTML = `
        <div class="cape-alert-box" style="background: #f3e5f5; color: #8e44ad; border-color: #9b59b6;">
            🧠 <strong>Esforço Cognitivo:</strong> Tente responder mentalmente antes de revelar.
        </div>

        <div class="neuro-input-group">
            <label style="font-size:1.1em; color:#2c3e50;">Pergunta / Desafio:</label>
            <div style="font-size: 1.2em; font-weight: bold; margin: 10px 0 20px 0; font-family: 'Playfair Display', serif;">
                "${pergunta}"
            </div>
            
            <textarea id="review-attempt" class="neuro-textarea-card" rows="4" placeholder="Digite sua lembrança aqui (opcional)..."></textarea>
            ${createMicBtn('review-attempt')}
        </div>

        <div id="review-feedback-area" style="display: none; animation: fadeIn 0.5s;">
            <div style="background: #fafafa; padding: 15px; border-radius: 8px; border-left: 4px solid #27ae60; margin-bottom: 20px;">
                <label style="font-size:0.8em; text-transform:uppercase; color:#27ae60; font-weight:bold;">Sua Anotação Original:</label>
                <p style="margin-top:5px; font-style:italic; color:#333;">"${respostaOriginal}"</p>
            </div>
            
            <div style="text-align: center;">
                <p style="margin-bottom:10px;">Como foi sua recuperação?</p>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button id="btn-review-success" class="button-confirm" style="background: #27ae60; padding:10px 20px;">
                        Lembrei Bem
                    </button>
                    <button id="btn-review-fail" class="button-confirm" style="background: #e67e22; padding:10px 20px;">
                        Preciso Melhorar
                    </button>
                </div>
            </div>
        </div>
    `;

    // Ações do Rodapé (Personalizado para Revisão)
    const footer = document.querySelector('#neuro-modal .recalculo-modal-actions');
    footer.innerHTML = `
        <button id="btn-reveal-answer" class="button-confirm" style="width:100%; background-color:#8e44ad;">
            👀 Conferir Resposta Original
        </button>
    `;

    // Listeners Internos
    document.getElementById('btn-reveal-answer').addEventListener('click', function() {
        document.getElementById('review-feedback-area').style.display = 'block';
        this.style.display = 'none'; // Esconde botão de revelar
    });

    attachToolsToInputs(); // Reativa o microfone se houver

    // Função interna para processar a conclusão
    const processarConclusao = async (sucesso) => {
        await concluirRevisao(planoIndex, notaId, tipoRevisao, sucesso);
    };

    // Usando setTimeout para garantir que os botões existam no DOM após o reveal
    const btnSuccess = document.getElementById('btn-review-success');
    const btnFail = document.getElementById('btn-review-fail');
    
    if(btnSuccess) btnSuccess.addEventListener('click', () => processarConclusao(true));
    if(btnFail) btnFail.addEventListener('click', () => processarConclusao(false));
}

async function concluirRevisao(planoIndex, notaId, tipoRevisaoFull, sucesso) {
    const plano = state.getPlanoByIndex(planoIndex);
    const nota = plano.neuroAnnotations.find(n => n.id === notaId);
    
    // Mapeia string "D+1..." para chave "d1"
    let key = '';
    if (tipoRevisaoFull.includes('D+1')) key = 'd1';
    else if (tipoRevisaoFull.includes('D+3')) key = 'd3';
    else if (tipoRevisaoFull.includes('D+7')) key = 'd7';

    if (key) {
        if (!nota.reviewsDone) nota.reviewsDone = {};
        nota.reviewsDone[key] = true;
    }

    state.updatePlano(planoIndex, plano);
    
    // Feedback visual imediato e fechamento
    ui.toggleLoading(true);
    try {
        const currentUser = state.getCurrentUser();
        await firestoreService.salvarPlanos(currentUser, state.getPlanos());
        
        document.getElementById('neuro-modal').classList.remove('visivel');
        
        // Re-renderiza a aplicação para atualizar a fila de revisões (o card deve sumir)
        ui.renderApp(state.getPlanos(), currentUser);
        
    } catch(e) {
        console.error("Erro ao salvar revisão:", e);
        alert("Erro ao salvar revisão. Tente novamente.");
    } finally {
        ui.toggleLoading(false);
    }
}


// --- Exportação (Compatibilidade com novos Subtipos) ---

export function downloadMarkdown(plano) {
    if (!plano) return;
    let mdContent = `# 📘 Neuro-Anotações: ${plano.titulo}\n\n`;
    
    const allNotes = [...(plano.neuroAnnotations || [])].sort((a,b) => (a.pageStart||0) - (b.pageStart||0));
    
    allNotes.forEach((note, idx) => {
        mdContent += `## ${note.chapterTitle || `Sessão ${idx+1}`} (Pág. ${note.pageStart}-${note.pageEnd})\n\n`;
        
        // Mapear (Intenção)
        const q1 = note.meta?.find(m => m.subType === 'q1');
        const q2 = note.meta?.find(m => m.subType === 'q2');
        if (q1 || q2) {
            mdContent += `### 🗺️ Mapear (Intenção)\n`;
            if (q1) mdContent += `- **Entender:** ${q1.text}\n`;
            if (q2) mdContent += `- **Aplicar:** ${q2.text}\n`;
            mdContent += `\n`;
        }

        // Engajar (Autor)
        const thesis = note.insights?.find(i => i.type === 'thesis');
        const concepts = note.insights?.find(i => i.type === 'concepts');
        if (thesis || concepts) {
            mdContent += `### 📖 Engajar (Voz do Autor)\n`;
            if (thesis) mdContent += `> **Tese:** ${thesis.text}\n\n`;
            if (concepts) mdContent += `**Conceitos:**\n${concepts.text}\n\n`;
        }

        // Traduzir (Eu)
        const feynman = note.meta?.find(m => m.type === 'translate');
        if (feynman) {
            mdContent += `### 🧠 Traduzir (Minha Síntese)\n${feynman.text}\n\n`;
        }

        // Aplicar
        const action = note.meta?.find(m => m.type === 'apply');
        const confront = note.triggers?.find(t => t.subType === 'confront');
        if (action || confront) {
            mdContent += `### 🚀 Aplicar (Praxis)\n`;
            if (confront) mdContent += `- **Confronto:** ${confront.text}\n`;
            if (action) mdContent += `- **Ação 24h:** ${action.text}\n`;
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

// Necessário para o botão de salvar externo no main.js, caso usado
export function extractNoteDataFromDOM() {
    return tempNoteData;
}
