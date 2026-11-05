import {pairAtCursor, pairBrackets, Range, tokenize} from "./engine";

export interface HighlightOptions {
    colors: boolean;
    match: boolean;
    commands: boolean;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// HTML for the layer under the (transparent) textarea text: the same characters,
// with brackets colored by depth, the pair at the cursor marked, and markers for
// the tabstops still ahead.
export function renderHighlight(value: string, cursor: number | null, opt: HighlightOptions, pending: Range[]): string {
    const cls: string[][] = Array.from({length: value.length}, (): string[] => []);
    const mark = (start: number, end: number, c: string) => {
        for (let i = start; i < end; i++) {
            cls[i].push(c);
        }
    };
    const toks = tokenize(value);
    for (const t of toks) {
        if (t.kind === "comment") {
            mark(t.start, t.end, "lsx-comment");
        } else if (t.kind === "cmd" && opt.commands) {
            mark(t.start, t.end, "lsx-cmd");
        }
    }
    const {pairs, unmatched} = pairBrackets(toks);
    if (opt.colors) {
        for (const p of pairs) {
            mark(p.open.start, p.open.end, `lsx-b${p.depth % 3}`);
            mark(p.close.start, p.close.end, `lsx-b${p.depth % 3}`);
        }
        for (const t of unmatched) {
            mark(t.start, t.end, "lsx-unmatched");
        }
    }
    if (opt.match && cursor !== null) {
        const p = pairAtCursor(pairs, cursor);
        if (p) {
            mark(p.open.start, p.open.end, "lsx-match");
            mark(p.close.start, p.close.end, "lsx-match");
        }
    }
    const markers = new Map<number, number>();
    for (const r of pending) {
        if (r.start === r.end) {
            markers.set(r.start, (markers.get(r.start) || 0) + 1);
        } else {
            mark(r.start, r.end, "lsx-stop");
        }
    }
    let html = "";
    let run = "";
    let runCls = "";
    const flush = () => {
        if (run) {
            html += runCls ? `<span class="${runCls}">${escape(run)}</span>` : escape(run);
        }
        run = "";
    };
    for (let i = 0; i <= value.length; i++) {
        if (markers.has(i)) {
            flush();
            html += "<span class=\"lsx-stop-empty\"></span>";
        }
        if (i === value.length) {
            break;
        }
        const c = cls[i].join(" ");
        if (c !== runCls) {
            flush();
            runCls = c;
        }
        run += value[i];
    }
    flush();
    // A trailing newline takes a line in a textarea but not in a div.
    return html + (value.endsWith("\n") || !value ? " " : "");
}
