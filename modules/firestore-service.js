// modules/firestore-service.js
import { doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { db } from '../config/firebase-config.js';

/**
 * Carrega e processa os planos de leitura.
 * Assegura que a estrutura 'neuroAnnotations' seja preservada com todos os subtipos do Wizard.
 */
export async function carregarPlanos(user) {
    if (!user) return [];

    const docRef = doc(db, 'users', user.uid);
    console.log("[Firestore] Carregando planos...");

    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            await setDoc(docRef, { planos: [] });
            return [];
        }

        const planosDoFirestore = docSnap.data().planos || [];

        const planosProcessados = planosDoFirestore.map((plano) => {
            if (!plano || !plano.titulo) return null;

            const dataInicio = new Date(plano.dataInicio);
            const dataFim = new Date(plano.dataFim);

            if (isNaN(dataInicio) || isNaN(dataFim)) return null;

            // --- PRESERVAÇÃO ESTRUTURAL (WIZARD NEURO) ---
            // Garante que 'neuroAnnotations' seja um array.
            // O Firestore armazena objetos JSON completos, então os campos 'subType', 'q1', 'q2'
            // gerados pelo Wizard serão carregados automaticamente sem necessidade de mapeamento manual,
            // desde que o array exista.
            let neuroAnnotations = plano.neuroAnnotations || [];

            // Processamento dos Dias (Legado e Datas)
            const diasProcessados = plano.diasPlano ? plano.diasPlano.map(dia => ({
                ...dia,
                data: dia.data ? new Date(dia.data) : null,
                lido: Boolean(dia.lido || false),
                neuroNote: dia.neuroNote || null // Mantém legado para visualização se necessário
            })) : [];

            return {
                ...plano,
                id: plano.id || crypto.randomUUID(),
                dataInicio,
                dataFim,
                diasPlano: diasProcessados,
                neuroAnnotations: neuroAnnotations, // Estrutura vital para o Wizard
                paginasLidas: Number(plano.paginasLidas) || 0,
                isPaused: plano.isPaused || false,
                dataPausa: plano.dataPausa ? new Date(plano.dataPausa) : null,
            };
        }).filter(p => p !== null);

        return planosProcessados;

    } catch (error) {
        console.error('[Firestore] Erro ao carregar:', error);
        throw new Error("Erro ao carregar dados.");
    }
}

/**
 * Salva os planos no Firestore.
 * O Wizard adiciona campos como 'subType' aos objetos dentro de 'neuroAnnotations'.
 * Esta função apenas serializa as datas e passa o objeto completo para o banco.
 */
export async function salvarPlanos(user, planosParaSalvar) {
    if (!user) throw new Error("Usuário não logado.");

    const docRef = doc(db, 'users', user.uid);
    console.log("[Firestore] Salvando planos...");

    const planosParaFirestore = planosParaSalvar.map(plano => {
        if (!plano) return null;
        
        return {
            ...plano,
            dataInicio: plano.dataInicio.toISOString(),
            dataFim: plano.dataFim.toISOString(),
            diasPlano: plano.diasPlano.map(dia => ({
                ...dia,
                data: (dia.data instanceof Date) ? dia.data.toISOString() : null,
                neuroNote: dia.neuroNote || null
            })),
            // O Firestore aceita objetos aninhados dinâmicos.
            // As propriedades q1, q2, thesis, etc., criadas pelo Wizard
            // serão salvas aqui automaticamente.
            neuroAnnotations: plano.neuroAnnotations || [],
            isPaused: plano.isPaused || false,
            dataPausa: (plano.isPaused && plano.dataPausa instanceof Date) ? plano.dataPausa.toISOString() : null,
        };
    }).filter(p => p !== null);

    try {
        await setDoc(docRef, { planos: planosParaFirestore }, { merge: true });
        console.log('[Firestore] Salvo com sucesso.');
    } catch (error) {
        console.error('[Firestore] Erro ao salvar:', error);
        throw new Error('Erro grave ao salvar.');
    }
}
