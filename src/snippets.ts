import {insideMacro, Insert, parseTabstops} from "./engine";

// Snippets use the obsidian-latex-suite format:
// {trigger, replacement, options, priority?, description?, excludedMacros?}
// options: r regex, A auto, w word boundary, v visual (on a selection),
// m any math, M block math only, n inline math only; t/c (text, code) never fire here.
export interface SnippetContext {
    vars: Record<string, string>;
    inline: boolean;
}

type Replacement = string | ((match: any, ctx: SnippetContext) => string | false | null | undefined);

export interface RawSnippet {
    trigger: string | RegExp;
    replacement: Replacement;
    options?: string;
    priority?: number;
    description?: string;
    excludedMacros?: string[];
}

export interface Snippet {
    raw: RawSnippet;
    regex: RegExp;
    isRegex: boolean;
    auto: boolean;
    visual: boolean;
    word: boolean;
    block: boolean;
    inline: boolean;
    priority: number;
    length: number;
}

export const DEFAULT_WORD_DELIMITERS = "., +-\n\t:;!?\\/{}[]()=~$'\"|`<>*^%#@&";

export function parseVariables(src: string): Record<string, string> {
    const obj = JSON.parse(src);
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
        const name = k.replace(/^\$\{(.*)\}$/, "$1");
        vars[name] = String(v);
    }
    return vars;
}

function expandVars(src: string, vars: Record<string, string>): string {
    return src.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (m, name) => vars[name] ?? m);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function evalSnippets(src: string): RawSnippet[] {
    // The snippet file is the user's own code, as in obsidian-latex-suite.
    // Also accepts the file as written for obsidian-latex-suite ("export default [...];").
    const body = src.trim().replace(/^export\s+default\s+/, "").replace(/;\s*$/, "");
    const list = new Function(`"use strict";\nreturn (${body}\n);`)();
    if (!Array.isArray(list)) {
        throw new Error("the snippets must be an array");
    }
    return list;
}

export function compileSnippets(list: RawSnippet[], vars: Record<string, string>): Snippet[] {
    const out: Snippet[] = [];
    list.forEach((raw, i) => {
        if (!raw || raw.trigger === undefined || raw.replacement === undefined) {
            throw new Error(`snippet #${i + 1} needs a trigger and a replacement`);
        }
        const opts = raw.options || "";
        const anyMode = !/[tTmMnc]/.test(opts);
        const block = anyMode || /[mM]/.test(opts);
        const inline = anyMode || /[mn]/.test(opts);
        if (!block && !inline) {
            return;
        }
        const isRegex = raw.trigger instanceof RegExp || opts.includes("r");
        let source: string;
        let flags = "";
        if (raw.trigger instanceof RegExp) {
            source = raw.trigger.source;
            flags = raw.trigger.flags.replace(/[gy]/g, "");
        } else {
            source = isRegex ? raw.trigger : escapeRe(raw.trigger);
        }
        const length = source.length;
        if (isRegex) {
            source = expandVars(source, vars);
            // "([^\\])foo" must also match at the very start of the formula.
            source = source.replace(/^\(\[\^((?:\\.|[^\]])*)\]\)/, "(^|[^$1])");
        }
        let regex: RegExp;
        try {
            regex = new RegExp(`(?:${source})$`, flags);
        } catch (e) {
            // eslint-disable-next-line preserve-caught-error
            throw new Error(`snippet #${i + 1} (${String(raw.trigger)}): ${(e as Error).message}`);
        }
        out.push({
            raw,
            regex,
            isRegex,
            auto: opts.includes("A"),
            visual: opts.includes("v"),
            word: opts.includes("w"),
            block,
            inline,
            priority: raw.priority || 0,
            length,
        });
    });
    // Higher priority first, then longer triggers.
    return out.map((s, i) => ({s, i}))
        .sort((a, b) => b.s.priority - a.s.priority || b.s.length - a.s.length || a.i - b.i)
        .map(x => x.s);
}

function replace(s: Snippet, match: RegExpExecArray, ctx: SnippetContext, visual?: string): string | false {
    const rep = s.raw.replacement;
    let r: string;
    if (typeof rep === "function") {
        const res = rep(s.isRegex ? match : match[0], ctx);
        if (res === false || res === null || res === undefined) {
            return false;
        }
        r = String(res);
    } else {
        r = rep;
        if (s.isRegex) {
            r = r.replace(/\[\[(\d+)\]\]/g, (_, n) => match[+n + 1] ?? "");
        }
    }
    if (visual !== undefined) {
        r = r.split("${VISUAL}").join(visual);
    }
    return r;
}

export interface MatchEnv {
    ctx: SnippetContext;
    wordDelimiters: string;
}

// `before` is the text before the cursor (for auto snippets including the key
// being typed). Returns the replacement for before.slice(from).
export function matchSnippet(
    snippets: Snippet[],
    before: string,
    auto: boolean,
    env: MatchEnv,
): {from: number; text: string; stops: Insert["stops"]} | null {
    // While a command name is being typed ("\sum"), snippets that would fire on
    // its tail ("sum") stay quiet.
    const cmd = auto && /[A-Za-z]$/.test(before) ? /\\[A-Za-z]*$/.exec(before) : null;
    for (const s of snippets) {
        if (s.auto !== auto || s.visual || !(env.ctx.inline ? s.inline : s.block)) {
            continue;
        }
        const m = s.regex.exec(before);
        if (!m || m[0] === "") {
            continue;
        }
        const from = m.index;
        if (s.word && from > 0 && !env.wordDelimiters.includes(before[from - 1])) {
            continue;
        }
        if (cmd && from > cmd.index) {
            continue;
        }
        if (s.raw.excludedMacros && insideMacro(before, from, s.raw.excludedMacros)) {
            continue;
        }
        const r = replace(s, m, env.ctx);
        if (r === false) {
            continue;
        }
        const {text, stops} = parseTabstops(r);
        return {from, text, stops};
    }
    return null;
}

export function matchVisual(snippets: Snippet[], key: string, selection: string, env: MatchEnv): {text: string; stops: Insert["stops"]} | null {
    for (const s of snippets) {
        if (!s.visual || !(env.ctx.inline ? s.inline : s.block)) {
            continue;
        }
        const m = s.regex.exec(key);
        if (!m || m.index !== 0) {
            continue;
        }
        const r = replace(s, m, env.ctx, selection);
        if (r === false) {
            continue;
        }
        return parseTabstops(r);
    }
    return null;
}
