import {
    autofraction,
    diffChange,
    enlargeInserts,
    envAt,
    moveRange,
    Range,
    reverseTaboutTarget,
    Stop,
    taboutTarget,
} from "./engine";
import {matchSnippet, matchVisual, MatchEnv, Snippet} from "./snippets";

export interface Config {
    snippets: boolean;
    autofraction: boolean;
    tabout: boolean;
    exitOnTab: boolean;
    matrix: boolean;
    enlarge: boolean;
    autoPair: boolean;
    colorBrackets: boolean;
    matchBrackets: boolean;
    highlightCommands: boolean;
    fractionSymbol: string;
    breakingChars: string;
    fractionExcluded: string;
    matrixEnvs: string;
    enlargeTriggers: string;
    wordDelimiters: string;
    snippetSource: string; // "" = built-in defaults
    variableSource: string; // "" = built-in defaults
}

export interface Engine {
    cfg: Config;
    snippets: Snippet[];
    vars: Record<string, string>;
}

// The textarea, seen through what the controller needs.
export interface Host {
    value(): string;
    selection(): [number, number];
    // Replaces [from, to) with text (undoable); must end in a call to onChange().
    replace(from: number, to: number, text: string): void;
    select(start: number, end: number): void;
    exit(): void;
}

export interface Keys {
    key: string;
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
}

interface Frame {
    groups: Range[][]; // by tabstop number; the last group ends the snippet
    index: number;
}

const list = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
const CLOSERS: Record<string, string> = {")": "(", "]": "[", "}": "{"};
const OPENERS: Record<string, string> = {"(": ")", "[": "]", "{": "}"};

export class Controller {
    frames: Frame[] = [];
    private prev: string;
    private hint: number = undefined;
    private grow = true;
    // Where a snippet just ended in a command ("\\to"), with the text at that time.
    private cmdEnd: {pos: number; value: string} = null;

    constructor(private host: Host, private engine: () => Engine, private inline: boolean, private onUpdate: () => void = () => undefined) {
        this.prev = host.value();
    }

    private get cfg() {
        return this.engine().cfg;
    }

    private get env(): MatchEnv {
        const e = this.engine();
        return {ctx: {vars: e.vars, inline: this.inline}, wordDelimiters: e.cfg.wordDelimiters};
    }

    // Returns true when the key was handled and its default must be stopped.
    onKey(k: Keys): boolean {
        if (k.ctrl || k.meta) {
            return false;
        }
        if (k.key === "Tab") {
            return k.alt ? false : k.shift ? this.onShiftTab() : this.onTab();
        }
        if (k.alt) {
            return false;
        }
        if (k.key === "Enter") {
            return !k.shift && this.matrixEnter();
        }
        if (k.key === "Backspace") {
            return this.pairBackspace();
        }
        if ([...k.key].length === 1) {
            return this.onChar(k.key);
        }
        return false;
    }

    private onChar(key: string): boolean {
        const cfg = this.cfg;
        const value = this.host.value();
        const [start, end] = this.host.selection();
        if (start !== end) {
            if (cfg.snippets) {
                const hit = matchVisual(this.engine().snippets, key, value.slice(start, end), this.env);
                if (hit) {
                    this.insert(start, end, hit.text, hit.stops);
                    return true;
                }
            }
            if (key === "/" && cfg.autofraction) {
                return this.fraction(value, start, end);
            }
            return false;
        }
        if (cfg.autoPair && CLOSERS[key] && value[start] === key && this.balanced(value, CLOSERS[key], key)) {
            this.host.select(start + 1, start + 1);
            return true;
        }
        // "->" gives "\\to"; a letter typed next must not run into it.
        if (/[A-Za-z]/.test(key) && this.cmdEnd && this.cmdEnd.pos === start && this.cmdEnd.value === value) {
            this.host.replace(start, start, " ");
            return this.onChar(key) || (this.host.replace(start + 1, start + 1, key), true);
        }
        if (cfg.snippets) {
            const hit = matchSnippet(this.engine().snippets, value.slice(0, start) + key, true, this.env);
            if (hit) {
                // The key goes in first so that undo brings back what was typed.
                this.edit(start, start, key, true);
                this.insert(hit.from, start + 1, hit.text, hit.stops);
                return true;
            }
        }
        if (key === "/" && cfg.autofraction) {
            return this.fraction(value, start, end);
        }
        return false;
    }

    private fraction(value: string, start: number, end: number): boolean {
        const cfg = this.cfg;
        let excluded: string[] = [];
        try {
            excluded = (JSON.parse(cfg.fractionExcluded) as string[][]).map(e => e[0]);
        } catch {
            // keep none
        }
        const ins = autofraction(value, start, end, {symbol: cfg.fractionSymbol, breakingChars: cfg.breakingChars, excluded});
        if (!ins) {
            return false;
        }
        if (start === end) {
            this.edit(start, start, "/", true);
            ins.to++;
        }
        this.insert(ins.from, ins.to, ins.text, ins.stops);
        return true;
    }

    private onTab(): boolean {
        const cfg = this.cfg;
        const value = this.host.value();
        const [start, end] = this.host.selection();
        if (cfg.snippets && start === end) {
            const hit = matchSnippet(this.engine().snippets, value.slice(0, start), false, this.env);
            if (hit) {
                this.insert(hit.from, start, hit.text, hit.stops);
                return true;
            }
        }
        if (this.frames.length) {
            this.next();
            return true;
        }
        if (cfg.matrix && list(cfg.matrixEnvs).includes(envAt(value, start))) {
            this.host.replace(start, end, " & ");
            return true;
        }
        if (!cfg.tabout) {
            return false;
        }
        this.enlarge();
        const v = this.host.value();
        const pos = this.host.selection()[1];
        const target = taboutTarget(v, pos);
        if (target !== null) {
            this.host.select(target, target);
        } else if (v.slice(pos).trim()) {
            this.host.select(v.length, v.length);
        } else if (cfg.exitOnTab) {
            this.host.exit();
        }
        return true;
    }

    private onShiftTab(): boolean {
        const frame = this.frames[this.frames.length - 1];
        if (frame) {
            if (frame.index > 0) {
                frame.index--;
                this.selectGroup(frame);
            }
            return true;
        }
        if (!this.cfg.tabout) {
            return false;
        }
        const value = this.host.value();
        const pos = this.host.selection()[0];
        const target = reverseTaboutTarget(value, pos);
        this.host.select(target ?? 0, target ?? 0);
        return true;
    }

    private matrixEnter(): boolean {
        const cfg = this.cfg;
        const value = this.host.value();
        const [start, end] = this.host.selection();
        if (!cfg.matrix || !list(cfg.matrixEnvs).includes(envAt(value, start))) {
            return false;
        }
        this.host.replace(start, end, this.inline ? " \\\\ " : " \\\\\n");
        return true;
    }

    private pairBackspace(): boolean {
        const value = this.host.value();
        const [start, end] = this.host.selection();
        if (!this.cfg.autoPair || start !== end || start === 0 || OPENERS[value[start - 1]] !== value[start]) {
            return false;
        }
        if (value[start - 2] === "\\") {
            return false;
        }
        this.host.replace(start - 1, start + 1, "");
        return true;
    }

    // Typing a closer over an existing one only makes sense if the text is balanced.
    private balanced(value: string, open: string, close: string): boolean {
        let n = 0;
        for (let i = 0; i < value.length; i++) {
            if (value[i] === "\\") {
                i++;
            } else if (value[i] === open) {
                n++;
            } else if (value[i] === close) {
                n--;
            }
        }
        return n <= 0;
    }

    // Inserts a snippet and moves to its first tabstop.
    private insert(from: number, to: number, text: string, stops: Stop[]) {
        this.edit(from, to, text, true);
        const groups = new Map<number, Range[]>();
        for (const s of stops) {
            if (!groups.has(s.n)) {
                groups.set(s.n, []);
            }
            groups.get(s.n).push({start: from + s.start, end: from + s.end});
        }
        const sorted = [...groups.keys()].sort((a, b) => a - b).map(n => groups.get(n));
        if (sorted.length) {
            const frame: Frame = {groups: sorted, index: 0};
            if (sorted.length > 1) {
                this.frames.push(frame);
            }
            this.selectGroup(frame);
        } else {
            const pos = from + text.length;
            this.host.select(pos, pos);
        }
        this.enlarge();
        if (!sorted.length && /\\[A-Za-z]+$/.test(text)) {
            this.cmdEnd = {pos: this.host.selection()[0], value: this.host.value()};
        }
        this.onUpdate();
    }

    private next() {
        const frame = this.frames[this.frames.length - 1];
        this.mirror(frame.groups[frame.index]);
        frame.index++;
        if (frame.index >= frame.groups.length - 1) {
            this.frames.pop();
        }
        this.selectGroup(frame);
        this.onUpdate();
    }

    private selectGroup(frame: Frame) {
        const r = frame.groups[Math.min(frame.index, frame.groups.length - 1)][0];
        this.host.select(r.start, r.end);
    }

    // Repeated placeholders (${0:f} … ${0:f}) take the text of the first one.
    private mirror(group: Range[]) {
        if (group.length < 2) {
            return;
        }
        const sel = this.host.selection();
        const keep = {start: sel[0], end: sel[1]};
        const text = this.host.value().slice(group[0].start, group[0].end);
        for (let i = group.length - 1; i > 0; i--) {
            const r = group[i];
            if (this.host.value().slice(r.start, r.end) !== text) {
                this.track(keep, r.start, r.end, text);
            }
        }
        this.host.select(keep.start, keep.end);
    }

    // Brackets around \sum, \frac, … become \left( … \right).
    private enlarge() {
        const cfg = this.cfg;
        if (!cfg.enlarge) {
            return;
        }
        const inserts = enlargeInserts(this.host.value(), list(cfg.enlargeTriggers));
        if (!inserts.length) {
            return;
        }
        const sel = this.host.selection();
        const keep = {start: sel[0], end: sel[1]};
        for (const ins of inserts) {
            this.track(keep, ins.pos, ins.pos, ins.text);
        }
        this.host.select(keep.start, keep.end);
    }

    // An edit that is not typing; `sel` (the selection to restore) moves with it,
    // except that a cursor right at an insertion stays in front of it.
    private track(sel: Range, from: number, to: number, text: string) {
        const before = this.host.value();
        this.edit(from, to, text, false);
        const c = diffChange(before, this.host.value(), from);
        if (c && !(c.from === c.oldTo && sel.start === sel.end && sel.start === c.from)) {
            moveRange(sel, c.from, c.oldTo, c.newTo, false);
        }
    }

    private edit(from: number, to: number, text: string, grow: boolean) {
        this.hint = from;
        this.grow = grow;
        this.host.replace(from, to, text);
        this.grow = true;
    }

    // After every change of the text (typing, snippets, undo).
    onChange(inputType?: string) {
        const value = this.host.value();
        if (inputType && inputType.startsWith("history")) {
            this.frames = [];
        } else if (this.frames.length) {
            const c = diffChange(this.prev, value, this.hint);
            if (c) {
                // A snippet whose whole area was replaced or deleted is gone.
                this.frames = this.frames.filter(f => {
                    const all = f.groups.flat();
                    return !(c.oldTo > c.from && c.from <= Math.min(...all.map(r => r.start)) && c.oldTo >= Math.max(...all.map(r => r.end)));
                });
                for (const f of this.frames) {
                    f.groups.forEach((g, gi) => {
                        for (const r of g) {
                            moveRange(r, c.from, c.oldTo, c.newTo, this.grow && gi === f.index);
                        }
                    });
                }
            }
        }
        this.hint = undefined;
        this.prev = value;
        this.onUpdate();
    }

    setHint(pos: number) {
        this.hint = pos;
    }

    // Leaving a snippet's area ends it.
    onSelection() {
        const [start, end] = this.host.selection();
        let changed = false;
        while (this.frames.length) {
            const f = this.frames[this.frames.length - 1];
            const all = f.groups.flat();
            const lo = Math.min(...all.map(r => r.start));
            const hi = Math.max(...all.map(r => r.end));
            if (start >= lo && end <= hi) {
                break;
            }
            this.frames.pop();
            changed = true;
        }
        if (changed) {
            this.onUpdate();
        }
    }

    // Tabstops still ahead, for drawing.
    pendingStops(): Range[] {
        const out: Range[] = [];
        for (const f of this.frames) {
            for (let i = f.index + 1; i < f.groups.length; i++) {
                out.push(...f.groups[i]);
            }
        }
        return out;
    }
}
