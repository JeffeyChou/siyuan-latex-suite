import {Dialog} from "siyuan";
import {Snippet} from "./snippets";

type Filter = "all" | "auto" | "tab" | "visual" | "regex";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function triggerText(s: Snippet): string {
    const t = s.raw.trigger;
    return t instanceof RegExp ? `/${t.source}/` : s.isRegex ? `/${t}/` : t;
}

function replacementText(s: Snippet): string {
    const r = s.raw.replacement;
    return typeof r === "function" ? "ƒ" : r;
}

function matches(s: Snippet, filter: Filter, query: string): boolean {
    if (filter === "auto" && !(s.auto && !s.visual)) {
        return false;
    }
    if (filter === "tab" && (s.auto || s.visual)) {
        return false;
    }
    if ((filter === "visual" && !s.visual) || (filter === "regex" && !s.isRegex)) {
        return false;
    }
    if (!query) {
        return true;
    }
    const hay = `${triggerText(s)}\n${replacementText(s)}\n${s.raw.description || ""}`.toLowerCase();
    return query.toLowerCase().split(/\s+/).every(w => hay.includes(w));
}

// The snippets in use (built-in or the user's), searchable.
export function openReference(snippets: Snippet[], tr: Record<string, string>, onClose?: () => void): Dialog {
    const filters: Filter[] = ["all", "auto", "tab", "visual", "regex"];
    const dialog = new Dialog({
        title: tr.reference,
        width: "820px",
        height: "75vh",
        content: `<div class="lsx-ref">
    <div class="lsx-ref__bar">
        <input class="b3-text-field fn__flex-1" placeholder="${escape(tr.referenceSearch)}" spellcheck="false">
        <div class="lsx-ref__filters">${filters.map(f => `<button class="b3-button b3-button--outline${f === "all" ? " lsx-ref__on" : ""}" data-filter="${f}">${escape(tr[`filter_${f}`])}</button>`).join("")}</div>
    </div>
    <div class="lsx-ref__hint">${tr.referenceHint}</div>
    <div class="lsx-ref__list"></div>
</div>`,
        destroyCallback: onClose,
    });
    const root = dialog.element.querySelector(".lsx-ref") as HTMLElement;
    const input = root.querySelector("input");
    const list = root.querySelector(".lsx-ref__list");
    let filter: Filter = "all";
    const modeOf = (s: Snippet) => s.block && s.inline ? "" : s.block ? tr.modeBlock : tr.modeInline;
    const kindOf = (s: Snippet) => s.visual ? tr.filter_visual : s.auto ? tr.filter_auto : tr.filter_tab;
    const render = () => {
        const rows = snippets.filter(s => matches(s, filter, input.value.trim()));
        list.innerHTML = rows.length ? `<table><thead><tr><th>${tr.colTrigger}</th><th>${tr.colReplacement}</th><th>${tr.colKind}</th></tr></thead><tbody>${rows.map(s => {
            const rep = replacementText(s);
            const desc = s.raw.description ? `<div class="lsx-ref__desc">${escape(s.raw.description)}</div>` : "";
            const mode = modeOf(s);
            return `<tr><td><code>${escape(triggerText(s))}</code></td><td>${rep === "ƒ" ? `<span class="lsx-ref__fn">${tr.function}</span>` : `<code>${escape(rep)}</code>`}${desc}</td><td><span class="lsx-ref__tag">${kindOf(s)}</span>${mode ? `<span class="lsx-ref__tag">${mode}</span>` : ""}</td></tr>`;
        }).join("")}</tbody></table>` : `<div class="lsx-ref__empty">${tr.referenceEmpty}</div>`;
    };
    input.addEventListener("input", render);
    root.querySelectorAll("[data-filter]").forEach(btn => btn.addEventListener("click", () => {
        filter = btn.getAttribute("data-filter") as Filter;
        root.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("lsx-ref__on", b === btn));
        render();
    }));
    render();
    input.focus();
    return dialog;
}
