// Pure LaTeX text logic: no DOM, so it can be tested in Node.

export type TokKind = "open" | "close" | "cmd" | "comment";

export interface Tok {
    start: number;
    end: number;
    kind: TokKind;
    text: string;
}

export interface Pair {
    open: Tok;
    close: Tok;
    depth: number;
}

export interface Stop {
    n: number;
    start: number;
    end: number;
}

const OPEN_CMDS: Record<string, string> = {
    "\\{": "\\}",
    "\\lbrace": "\\rbrace",
    "\\lbrack": "\\rbrack",
    "\\langle": "\\rangle",
    "\\lvert": "\\rvert",
    "\\lVert": "\\rVert",
    "\\lceil": "\\rceil",
    "\\lfloor": "\\rfloor",
    "\\ulcorner": "\\urcorner",
};
const CLOSE_CMDS = new Set(Object.values(OPEN_CMDS));
const PLAIN: Record<string, string> = {"(": ")", "[": "]", "{": "}"};
const isLetter = (c: string) => /[A-Za-z]/.test(c);

// Reads one control sequence at i (s[i] === "\\"): a letter run or a single symbol.
function readCmd(s: string, i: number): string {
    let j = i + 1;
    if (j < s.length && isLetter(s[j])) {
        while (j < s.length && isLetter(s[j])) {
            j++;
        }
    } else if (j < s.length) {
        j++;
    }
    return s.slice(i, j);
}

// Brackets, control sequences and comments; plain text is skipped. \left X and
// \right X become one token each so that they pair with each other whatever X is.
export function tokenize(s: string): Tok[] {
    const toks: Tok[] = [];
    let i = 0;
    while (i < s.length) {
        const c = s[i];
        if (c === "\\") {
            const cmd = readCmd(s, i);
            let end = i + cmd.length;
            if (cmd === "\\left" || cmd === "\\right") {
                let j = end;
                while (j < s.length && s[j] === " ") {
                    j++;
                }
                if (j < s.length) {
                    end = s[j] === "\\" ? j + readCmd(s, j).length : j + 1;
                    toks.push({start: i, end, kind: cmd === "\\left" ? "open" : "close", text: s.slice(i, end)});
                    i = end;
                    continue;
                }
            }
            const kind: TokKind = OPEN_CMDS[cmd] ? "open" : CLOSE_CMDS.has(cmd) ? "close" : "cmd";
            toks.push({start: i, end, kind, text: cmd});
            i = end;
        } else if (c === "%") {
            let j = s.indexOf("\n", i);
            if (j < 0) {
                j = s.length;
            }
            toks.push({start: i, end: j, kind: "comment", text: s.slice(i, j)});
            i = j;
        } else if (PLAIN[c]) {
            toks.push({start: i, end: i + 1, kind: "open", text: c});
            i++;
        } else if (c === ")" || c === "]" || c === "}") {
            toks.push({start: i, end: i + 1, kind: "close", text: c});
            i++;
        } else {
            i++;
        }
    }
    return toks;
}

function compatible(open: string, close: string): boolean {
    if (open.startsWith("\\left")) {
        return close.startsWith("\\right");
    }
    if (close.startsWith("\\right")) {
        return false;
    }
    if (PLAIN[open] === close || OPEN_CMDS[open] === close) {
        return true;
    }
    // Interval notation: [a, b), (a, b]
    return (open === "(" || open === "[") && (close === ")" || close === "]");
}

export function pairBrackets(toks: Tok[]): {pairs: Pair[]; unmatched: Tok[]} {
    const pairs: Pair[] = [];
    const unmatched: Tok[] = [];
    const stack: Tok[] = [];
    for (const t of toks) {
        if (t.kind === "open") {
            stack.push(t);
        } else if (t.kind === "close") {
            const top = stack[stack.length - 1];
            if (top && compatible(top.text, t.text)) {
                stack.pop();
                pairs.push({open: top, close: t, depth: stack.length});
            } else {
                unmatched.push(t);
            }
        }
    }
    unmatched.push(...stack);
    return {pairs, unmatched};
}

// The pair to highlight for a cursor: one touching the cursor, else the innermost
// pair around it.
export function pairAtCursor(pairs: Pair[], pos: number): Pair | null {
    const touching = pairs.find(p => p.close.end === pos) || pairs.find(p => p.open.start === pos);
    if (touching) {
        return touching;
    }
    let best: Pair = null;
    for (const p of pairs) {
        if (p.open.end <= pos && pos <= p.close.start && (!best || p.open.start > best.open.start)) {
            best = p;
        }
    }
    return best;
}

// Tab: the end of the next closing delimiter after the cursor.
export function taboutTarget(s: string, pos: number): number | null {
    for (const t of tokenize(s)) {
        if (t.end > pos && t.kind === "close") {
            return t.end;
        }
    }
    return null;
}

// Shift+Tab: the start of the previous opening delimiter.
export function reverseTaboutTarget(s: string, pos: number): number | null {
    let target: number = null;
    for (const t of tokenize(s)) {
        if (t.start >= pos) {
            break;
        }
        if (t.kind === "open") {
            target = t.start;
        }
    }
    return target;
}

export function envAt(s: string, pos: number): string | null {
    const re = /\\(begin|end)\s*\{([^}]*)\}/g;
    const stack: string[] = [];
    let m: RegExpExecArray;
    while ((m = re.exec(s)) && m.index + m[0].length <= pos) {
        if (m[1] === "begin") {
            stack.push(m[2].trim());
        } else if (stack[stack.length - 1] === m[2].trim()) {
            stack.pop();
        }
    }
    return stack.length ? stack[stack.length - 1] : null;
}

// Positions of the "{" that are still open at pos, innermost last.
function openBraces(s: string, pos: number): number[] {
    const stack: number[] = [];
    for (let i = 0; i < pos; i++) {
        if (s[i] === "\\") {
            i++;
        } else if (s[i] === "{") {
            stack.push(i);
        } else if (s[i] === "}") {
            stack.pop();
        }
    }
    return stack;
}

// Is pos inside a group opened by one of `opens` (each ending with "{"), e.g. "^{".
export function insideGroup(s: string, pos: number, opens: string[]): boolean {
    return openBraces(s, pos).some(b => opens.some(o => s.slice(0, b + 1).endsWith(o)));
}

// Is pos inside the argument of one of the macros, e.g. ["ce", "pu"].
export function insideMacro(s: string, pos: number, names: string[]): boolean {
    return names.length > 0 && insideGroup(s, pos, names.map(n => `\\${n}{`));
}

export const GREEK =
    "alpha|beta|gamma|Gamma|delta|Delta|epsilon|varepsilon|zeta|eta|theta|vartheta|Theta|iota|kappa|lambda|Lambda|mu|nu|xi|Xi|omicron|pi|Pi|rho|varrho|sigma|Sigma|tau|upsilon|Upsilon|phi|varphi|Phi|chi|psi|Psi|omega|Omega";

function matchBackward(s: string, i: number, open: string, close: string): number | null {
    let depth = 0;
    for (let k = i; k >= 0; k--) {
        if (s[k] === close) {
            depth++;
        } else if (s[k] === open) {
            depth--;
            if (depth === 0) {
                return k;
            }
        }
    }
    return null;
}

export interface Insert {
    from: number;
    to: number;
    text: string;
    stops: Stop[]; // relative to `from`
}

export interface FractionOptions {
    symbol: string;
    breakingChars: string;
    excluded: string[];
}

// "x/" -> "\frac{x}{}": the numerator runs back to a space or a breaking
// character, skipping over bracketed groups. With a selection, the selection.
export function autofraction(s: string, start: number, end: number, opt: FractionOptions): Insert | null {
    if (insideGroup(s, start, opt.excluded)) {
        return null;
    }
    let from = start;
    if (start === end) {
        // Spaces after greek letters stay part of the numerator: "\alpha b/".
        const cur = s.slice(0, start).replace(new RegExp(`(${GREEK}) ([^ ])`, "g"), "$1#$2");
        from = 0;
        for (let i = cur.length - 1; i >= 0; i--) {
            const c = cur[i];
            if (c === ")" || c === "]" || c === "}") {
                const j = matchBackward(cur, i, c === ")" ? "(" : c === "]" ? "[" : "{", c);
                if (j === null) {
                    return null;
                }
                i = j;
                continue;
            }
            if ((" $([{\n" + opt.breakingChars).includes(c)) {
                from = i + 1;
                break;
            }
        }
        if (from === start) {
            return null;
        }
    }
    let num = s.slice(from, end);
    if (num.startsWith("(") && num.endsWith(")")) {
        const toks = tokenize(num);
        const p = pairBrackets(toks).pairs.find(q => q.open.start === 0);
        if (p && p.close.end === num.length) {
            num = num.slice(1, -1);
        }
    }
    const head = `${opt.symbol}{`;
    const stops: Stop[] = [];
    let text = head;
    if (num) {
        text += num;
    } else {
        stops.push({n: 0, start: text.length, end: text.length});
    }
    text += "}{";
    stops.push({n: 1, start: text.length, end: text.length});
    text += "}";
    stops.push({n: 2, start: text.length, end: text.length});
    return {from, to: end, text, stops};
}

const ENLARGE_OPENERS = new Set(["(", "[", "\\{", "\\lbrace", "\\lbrack", "\\langle", "\\lvert", "\\lVert", "\\lceil", "\\lfloor"]);

// "\left"/"\right" insertions for bracket pairs whose content has a tall operator,
// sorted from the end of the text so they can be applied in order.
export function enlargeInserts(s: string, triggers: string[]): {pos: number; text: string}[] {
    if (!triggers.length) {
        return [];
    }
    const tall = new RegExp(`\\\\(?:${triggers.join("|")})(?![A-Za-z])`);
    const out: {pos: number; text: string}[] = [];
    for (const p of pairBrackets(tokenize(s)).pairs) {
        if (!ENLARGE_OPENERS.has(p.open.text)) {
            continue;
        }
        const before = s.slice(0, p.open.start);
        if (/\\(?:left|right|middle|[bB]igg?[lrm]?)\s*$/.test(before) || (p.open.text === "[" && /\\sqrt\s*$/.test(before))) {
            continue;
        }
        if (/\\(?:right|[bB]igg?[rm]?)\s*$/.test(s.slice(0, p.close.start))) {
            continue;
        }
        if (tall.test(s.slice(p.open.end, p.close.start))) {
            out.push({pos: p.open.start, text: "\\left"}, {pos: p.close.start, text: "\\right"});
        }
    }
    return out.sort((a, b) => b.pos - a.pos);
}

// "${1:x}" and "$1" placeholders -> plain text plus stop ranges.
export function parseTabstops(r: string): {text: string; stops: Stop[]} {
    let text = "";
    const stops: Stop[] = [];
    let i = 0;
    while (i < r.length) {
        const c = r[i];
        if (c === "$") {
            const plain = /^\$(\d+)/.exec(r.slice(i));
            if (plain) {
                stops.push({n: +plain[1], start: text.length, end: text.length});
                i += plain[0].length;
                continue;
            }
            const braced = /^\$\{(\d+)(:|\})/.exec(r.slice(i));
            if (braced) {
                let j = i + braced[0].length;
                let inner = "";
                if (braced[2] === ":") {
                    let depth = 1;
                    const k0 = j;
                    while (j < r.length) {
                        if (r[j] === "\\") {
                            j += 2;
                            continue;
                        }
                        if (r[j] === "{") {
                            depth++;
                        } else if (r[j] === "}" && --depth === 0) {
                            break;
                        }
                        j++;
                    }
                    inner = r.slice(k0, j);
                    j++;
                }
                stops.push({n: +braced[1], start: text.length, end: text.length + inner.length});
                text += inner;
                i = j;
                continue;
            }
        }
        text += c;
        i++;
    }
    return {text, stops};
}

// Ranges of a text that move with edits (tabstops).
export interface Range {
    start: number;
    end: number;
}

// Splits a text change into [from, oldTo) -> [from, newTo). `hint` (the selection
// start before the change) keeps a repeated character from being misplaced.
export function diffChange(oldS: string, newS: string, hint?: number): {from: number; oldTo: number; newTo: number} | null {
    if (oldS === newS) {
        return null;
    }
    const max = Math.min(oldS.length, newS.length);
    const cap = hint === undefined ? max : Math.min(max, hint);
    let p = 0;
    while (p < cap && oldS[p] === newS[p]) {
        p++;
    }
    let q = 0;
    while (q < oldS.length - p && q < newS.length - p && oldS[oldS.length - 1 - q] === newS[newS.length - 1 - q]) {
        q++;
    }
    return {from: p, oldTo: oldS.length - q, newTo: newS.length - q};
}

// `grow`: an insertion touching the range's edge goes into the range (the range
// being typed into) instead of next to it.
export function moveRange(r: Range, from: number, oldTo: number, newTo: number, grow: boolean): void {
    const delta = newTo - oldTo;
    if (from === oldTo) {
        if (from < r.start || (from === r.start && !grow)) {
            r.start += delta;
            r.end += delta;
        } else if (from < r.end || (from === r.end && grow)) {
            r.end += delta;
        }
        return;
    }
    if (oldTo <= r.start) {
        r.start += delta;
        r.end += delta;
    } else if (from >= r.end) {
        // after the range
    } else if (from >= r.start && oldTo <= r.end) {
        r.end += delta;
    } else {
        r.start = Math.min(r.start, from);
        r.end = Math.max(r.end + delta, newTo);
    }
}
