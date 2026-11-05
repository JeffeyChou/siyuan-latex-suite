import {Config, Engine} from "./controller";
import {compileSnippets, DEFAULT_WORD_DELIMITERS, evalSnippets, parseVariables} from "./snippets";
import DEFAULT_SNIPPETS from "./defaults/snippets.js?raw";
import DEFAULT_VARIABLES from "./defaults/variables.json?raw";

export {DEFAULT_SNIPPETS, DEFAULT_VARIABLES};

export const DEFAULT_CONFIG: Config = {
    snippets: true,
    autofraction: true,
    tabout: true,
    exitOnTab: true,
    matrix: true,
    enlarge: true,
    autoPair: true,
    colorBrackets: true,
    matchBrackets: true,
    highlightCommands: true,
    fractionSymbol: "\\frac",
    breakingChars: "+-=\t",
    fractionExcluded: "[[\"^{\", \"}\"], [\"\\\\pu{\", \"}\"]]",
    matrixEnvs: "pmatrix, cases, align, gather, bmatrix, Bmatrix, vmatrix, Vmatrix, array, matrix, aligned, gathered, split",
    enlargeTriggers: "sum, int, frac, prod, bigcup, bigcap",
    wordDelimiters: DEFAULT_WORD_DELIMITERS,
    snippetSource: "",
    variableSource: "",
};

// Throws on a broken snippet or variable source.
export function buildEngine(cfg: Config): Engine {
    const vars = parseVariables(cfg.variableSource || DEFAULT_VARIABLES);
    const snippets = compileSnippets(evalSnippets(cfg.snippetSource || DEFAULT_SNIPPETS), vars);
    return {cfg, snippets, vars};
}
