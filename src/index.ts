import {
    Plugin,
    Setting,
    showMessage,
} from "siyuan";
import "./index.scss";
import {buildEngine, DEFAULT_CONFIG, DEFAULT_SNIPPETS, DEFAULT_VARIABLES} from "./config";
import {Config, Controller, Engine, Host} from "./controller";
import {renderHighlight} from "./highlight";

const STORAGE = "config.json";

// The math popup is SiYuan's generic render editor (toolbar.showRender); only its
// title says that it edits a formula.
function mathKind(ta: HTMLTextAreaElement): "block" | "inline" | null {
    const util = ta.closest(".protyle-util");
    const title = util?.querySelector(".block__icons .resize__move")?.textContent.trim();
    const lang = (window.siyuan?.languages || {}) as Record<string, string>;
    if (!title) {
        return null;
    }
    if (title === lang["inline-math"]) {
        return "inline";
    }
    return title === lang.math ? "block" : null;
}

class Session {
    ctl: Controller;
    private backdrop: HTMLDivElement = null;
    private ro: ResizeObserver = null;

    constructor(private ta: HTMLTextAreaElement, private engine: () => Engine, inline: boolean) {
        const host: Host = {
            value: () => ta.value,
            selection: () => [ta.selectionStart, ta.selectionEnd],
            replace: (from, to, text) => {
                ta.focus();
                ta.setSelectionRange(from, to);
                // execCommand keeps the edit on the textarea's own undo stack.
                const ok = text ? document.execCommand("insertText", false, text) : document.execCommand("delete");
                if (!ok) {
                    ta.setRangeText(text, from, to, "end");
                    ta.dispatchEvent(new InputEvent("input", {bubbles: true, inputType: "insertText"}));
                }
            },
            select: (start, end) => {
                ta.setSelectionRange(start, end);
                this.ctl.onSelection();
                this.render();
            },
            exit: () => {
                (ta.closest(".protyle-util")?.querySelector("[data-type=\"close\"]") as HTMLElement)?.click();
            },
        };
        this.ctl = new Controller(host, engine, inline, () => this.render());
        const cfg = engine().cfg;
        if (cfg.colorBrackets || cfg.matchBrackets || cfg.highlightCommands) {
            this.mountBackdrop();
        }
        ta.addEventListener("beforeinput", () => this.ctl.setHint(ta.selectionStart));
        ta.addEventListener("input", (e: InputEvent) => this.ctl.onChange(e.inputType));
        ta.addEventListener("scroll", () => this.syncScroll());
        for (const type of ["keyup", "mouseup", "focus", "blur"]) {
            ta.addEventListener(type, () => this.render());
        }
    }

    onSelectionChange() {
        this.ctl.onSelection();
        this.render();
    }

    private mountBackdrop() {
        const ta = this.ta;
        const parent = ta.parentElement;
        const cs = getComputedStyle(ta);
        if (getComputedStyle(parent).position === "static") {
            parent.style.position = "relative";
        }
        const bd = document.createElement("div");
        bd.className = "lsx-backdrop";
        for (const p of [
            "font-family", "font-size", "font-weight", "font-style", "font-variant-ligatures", "line-height",
            "letter-spacing", "word-spacing", "tab-size", "text-indent", "box-sizing",
            "padding-top", "padding-right", "padding-bottom", "padding-left",
            "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
            "border-radius",
        ]) {
            bd.style.setProperty(p, cs.getPropertyValue(p));
        }
        bd.style.color = cs.color;
        bd.style.backgroundColor = cs.backgroundColor;
        ta.style.setProperty("caret-color", cs.color);
        ta.classList.add("lsx-textarea");
        parent.insertBefore(bd, ta);
        this.backdrop = bd;
        this.ro = new ResizeObserver(() => this.syncBox());
        this.ro.observe(ta);
        this.syncBox();
        this.render();
    }

    private syncBox() {
        const bd = this.backdrop;
        if (!bd) {
            return;
        }
        if (!this.ta.isConnected) {
            this.ro.disconnect();
            return;
        }
        bd.style.left = this.ta.offsetLeft + "px";
        bd.style.top = this.ta.offsetTop + "px";
        bd.style.width = this.ta.offsetWidth + "px";
        bd.style.height = this.ta.offsetHeight + "px";
        this.syncScroll();
    }

    private syncScroll() {
        if (this.backdrop) {
            this.backdrop.scrollTop = this.ta.scrollTop;
            this.backdrop.scrollLeft = this.ta.scrollLeft;
        }
    }

    render() {
        if (!this.backdrop) {
            return;
        }
        const cfg = this.engine().cfg;
        const focused = document.activeElement === this.ta;
        const cursor = focused && this.ta.selectionStart === this.ta.selectionEnd ? this.ta.selectionStart : null;
        this.backdrop.innerHTML = renderHighlight(this.ta.value, cursor, {
            colors: cfg.colorBrackets,
            match: cfg.matchBrackets,
            commands: cfg.highlightCommands,
        }, this.ctl.pendingStops());
        this.syncBox();
    }
}

export default class LatexSuitePlugin extends Plugin {
    private engine: Engine;
    private sessions = new WeakMap<HTMLTextAreaElement, Session>();

    private get tr() {
        return this.i18n as Record<string, string>;
    }

    async onload() {
        const saved = (await this.loadData(STORAGE)) || {};
        const cfg: Config = {...DEFAULT_CONFIG, ...(typeof saved === "object" ? saved : {})};
        try {
            this.engine = buildEngine(cfg);
        } catch (e) {
            showMessage(`${this.tr.snippetError}: ${(e as Error).message}`, 8000, "error");
            this.engine = buildEngine({...cfg, snippetSource: "", variableSource: ""});
        }
        document.addEventListener("focusin", this.onFocusIn, true);
        document.addEventListener("keydown", this.onKeyDown, true);
        document.addEventListener("selectionchange", this.onSelectionChange);
        const active = document.activeElement;
        if (active instanceof HTMLTextAreaElement) {
            this.attach(active);
        }
    }

    onunload() {
        document.removeEventListener("focusin", this.onFocusIn, true);
        document.removeEventListener("keydown", this.onKeyDown, true);
        document.removeEventListener("selectionchange", this.onSelectionChange);
    }

    private attach(ta: HTMLTextAreaElement): Session | null {
        let s = this.sessions.get(ta);
        if (s) {
            return s;
        }
        const kind = mathKind(ta);
        if (!kind || ta.readOnly) {
            return null;
        }
        s = new Session(ta, () => this.engine, kind === "inline");
        this.sessions.set(ta, s);
        return s;
    }

    private onFocusIn = (e: FocusEvent) => {
        if (e.target instanceof HTMLTextAreaElement) {
            this.attach(e.target);
        }
    };

    private onSelectionChange = () => {
        const ta = document.activeElement;
        if (ta instanceof HTMLTextAreaElement) {
            this.sessions.get(ta)?.onSelectionChange();
        }
    };

    // Capture phase: runs before SiYuan's own keydown handler on the textarea.
    private onKeyDown = (e: KeyboardEvent) => {
        if (!(e.target instanceof HTMLTextAreaElement) || e.isComposing || e.keyCode === 229) {
            return;
        }
        const s = this.attach(e.target);
        if (!s) {
            return;
        }
        const handled = s.ctl.onKey({key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey, meta: e.metaKey});
        if (handled) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    };

    openSetting() {
        const cfg = {...this.engine.cfg};
        const tr = this.tr;
        const setting = new Setting({
            width: "860px",
            height: "80vh",
            confirmCallback: () => {
                const next: Config = {...cfg};
                for (const [key, el] of Object.entries(fields)) {
                    const k = key as keyof Config;
                    if (el instanceof HTMLInputElement && el.type === "checkbox") {
                        (next[k] as boolean) = el.checked;
                    } else {
                        (next[k] as string) = (el as HTMLInputElement).value;
                    }
                }
                next.breakingChars = next.breakingChars.replace(/\\t/g, "\t");
                if (next.snippetSource.trim() === DEFAULT_SNIPPETS.trim()) {
                    next.snippetSource = "";
                }
                if (next.variableSource.trim() === DEFAULT_VARIABLES.trim()) {
                    next.variableSource = "";
                }
                // Saved even when broken so that the edit is not lost; the snippets
                // in use stay as they were until it is fixed.
                this.saveData(STORAGE, next);
                try {
                    this.engine = buildEngine(next);
                    showMessage(tr.saved);
                } catch (e) {
                    this.engine = {...this.engine, cfg: {...next, snippetSource: cfg.snippetSource, variableSource: cfg.variableSource}};
                    showMessage(`${tr.snippetError}: ${(e as Error).message}`, 8000, "error");
                }
            },
        });
        const fields: Partial<Record<keyof Config, HTMLInputElement | HTMLTextAreaElement>> = {};
        const toggle = (key: keyof Config) => {
            const el = document.createElement("input");
            el.type = "checkbox";
            el.className = "b3-switch fn__flex-center";
            el.checked = cfg[key] as boolean;
            fields[key] = el;
            setting.addItem({title: tr[key], description: tr[`${key}Desc`], actionElement: el});
        };
        const text = (key: keyof Config, value = cfg[key] as string) => {
            const el = document.createElement("input");
            el.className = "b3-text-field fn__flex-center fn__size200";
            el.value = value;
            fields[key] = el;
            setting.addItem({title: tr[key], description: tr[`${key}Desc`], actionElement: el});
        };
        const code = (key: keyof Config, fallback: string, rows: number) => {
            const wrap = document.createElement("div");
            wrap.className = "lsx-setting-code";
            const el = document.createElement("textarea");
            el.className = "b3-text-field fn__block";
            el.spellcheck = false;
            el.rows = rows;
            el.value = (cfg[key] as string) || fallback;
            const reset = document.createElement("button");
            reset.className = "b3-button b3-button--outline";
            reset.textContent = tr.reset;
            reset.addEventListener("click", () => {
                el.value = fallback;
            });
            wrap.append(el, reset);
            fields[key] = el;
            setting.addItem({title: tr[key], description: tr[`${key}Desc`], direction: "column", actionElement: wrap});
        };
        for (const key of ["snippets", "autofraction", "tabout", "exitOnTab", "matrix", "enlarge", "autoPair",
            "colorBrackets", "matchBrackets", "highlightCommands"] as (keyof Config)[]) {
            toggle(key);
        }
        text("fractionSymbol");
        text("breakingChars", cfg.breakingChars.replace(/\t/g, "\\t"));
        text("fractionExcluded");
        text("matrixEnvs");
        text("enlargeTriggers");
        code("snippetSource", DEFAULT_SNIPPETS, 18);
        code("variableSource", DEFAULT_VARIABLES, 6);
        setting.open(tr.title);
    }
}
