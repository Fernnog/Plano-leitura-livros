// modules/validators.js
// RESPONSABILIDADE ÚNICA: Centralizar regras de negócio, validações de integridade
// e verificação de qualidade cognitiva dos inputs.

/**
 * Valida se o intervalo da sessão está contido no intervalo do capítulo/livro.
 * Impede que o usuário registre leituras "fantasmas" fora do escopo.
 * 
 * @param {number|string} sessionStart - Página inicial da sessão atual
 * @param {number|string} sessionEnd - Página final da sessão atual
 * @param {number|string} chapterStart - Página inicial do capítulo (limite inferior)
 * @param {number|string} chapterEnd - Página final do capítulo (limite superior)
 */
export function validateSessionRange(sessionStart, sessionEnd, chapterStart, chapterEnd) {
    const sStart = parseInt(sessionStart);
    const sEnd = parseInt(sessionEnd);
    const cStart = parseInt(chapterStart);
    const cEnd = parseInt(chapterEnd);

    if (isNaN(sStart) || isNaN(sEnd)) {
        return { valid: false, msg: "Por favor, insira números de página válidos para o início e fim da sessão." };
    }

    if (sStart > sEnd) {
        return { valid: false, msg: "A página inicial não pode ser maior que a final." };
    }

    // Só valida limites do capítulo se eles estiverem definidos no contexto macro
    if (!isNaN(cStart) && !isNaN(cEnd)) {
        if (sStart < cStart || sEnd > cEnd) {
            return { 
                valid: false, 
                msg: `Fora do escopo! O capítulo atual está definido entre as páginas ${cStart} e ${cEnd}. Ajuste o intervalo ou o contexto macro.` 
            };
        }
    }

    return { valid: true };
}

/**
 * Validador de Qualidade Cognitiva (Sugestão de Arquitetura).
 * Garante que campos essenciais (como Tese) tenham densidade suficiente.
 * 
 * @param {string} text - O texto a ser validado
 * @param {number} minLength - Tamanho mínimo exigido (default: 15)
 */
export function validateCognitiveQuality(text, minLength = 15) {
    if (!text || text.trim().length < minLength) {
        return {
            valid: false,
            msg: `O cérebro precisa de elaboração. Escreva pelo menos ${minLength} caracteres para criar uma trilha de memória forte.`
        };
    }
    return { valid: true };
}
