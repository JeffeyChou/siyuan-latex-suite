import {getAllEditor, Protyle} from "siyuan";
import {matchTextTrigger} from "./engine";

// "mk" in the text opens a new inline formula, "dm" alone in a paragraph a new
// math block, both through SiYuan's own commands so that saving and undo work.

// Places where "mk" is just text.
const SKIP = [
    "[data-type~=\"code\"]", "[data-type~=\"kbd\"]", "[data-type~=\"tag\"]", "[data-type~=\"a\"]",
    "[data-type~=\"block-ref\"]", "[data-type~=\"file-annotation-ref\"]",
    "[data-type=\"NodeCodeBlock\"]", "[data-type=\"NodeHTMLBlock\"]", "[data-type=\"NodeHeading\"] .protyle-attr",
].join(",");

function editorOf(el: Element): Protyle | undefined {
    return getAllEditor().find(e => e.protyle?.wysiwyg?.element?.contains(el));
}

function deleteBefore(node: Text, end: number, length: number) {
    const sel = getSelection();
    const r = document.createRange();
    r.setStart(node, end - length);
    r.setEnd(node, end);
    sel.removeAllRanges();
    sel.addRange(r);
    // Through the editor's own input handling, so it is one more undo step.
    document.execCommand("delete");
}

export function handleTextInput(e: InputEvent, inline: string, block: string): void {
    if (e.inputType !== "insertText" || e.isComposing || !e.data) {
        return;
    }
    const target = e.target as HTMLElement;
    if (!target.closest?.(".protyle-wysiwyg") || target.closest(".protyle-util")) {
        return;
    }
    // SiYuan closes popups on the keyup of the key just typed, so the formula
    // opens after that keyup (or shortly after, for keyboards that send none).
    clearTimeout(pending);
    document.removeEventListener("keyup", onKeyUp, true);
    const key = e.data.slice(-1);
    pending = window.setTimeout(() => {
        document.removeEventListener("keyup", onKeyUp, true);
        run(inline, block);
    }, 300);
    onKeyUp = (k: KeyboardEvent) => {
        if (k.key !== key) {
            return;
        }
        document.removeEventListener("keyup", onKeyUp, true);
        clearTimeout(pending);
        // After SiYuan's own keyup handling.
        pending = window.setTimeout(() => run(inline, block));
    };
    document.addEventListener("keyup", onKeyUp, true);
}

let pending = 0;
let onKeyUp: (e: KeyboardEvent) => void = () => undefined;

function run(inline: string, block: string) {
    const sel = getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) {
        return;
    }
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) {
        return;
    }
    const el = node.parentElement;
    if (!el || el.closest(SKIP)) {
        return;
    }
    const blockEl = el.closest("[data-node-id]");
    if (!blockEl) {
        return;
    }
    const editable = blockEl.querySelector(":scope > [contenteditable=\"true\"]");
    const before = (node as Text).data.slice(0, range.startOffset);
    const isParagraph = blockEl.getAttribute("data-type") === "NodeParagraph";
    const kind = matchTextTrigger(before, isParagraph && editable ? editable.textContent : "", inline, block);
    if (!kind) {
        return;
    }
    const editor = editorOf(blockEl);
    if (!editor || editor.protyle.disabled) {
        return;
    }
    const protyle = editor.protyle;
    if (kind === "inline") {
        // The trigger becomes the formula (one undo step), then is cleared in the
        // popup; deleting it first races SiYuan's input handling, which closes popups.
        const r = document.createRange();
        r.setStart(node, range.startOffset - inline.length);
        r.setEnd(node, range.startOffset);
        const knownInline = new Set(blockEl.querySelectorAll("[data-type~=\"inline-math\"]"));
        protyle.toolbar.range = r;
        protyle.toolbar.element.querySelector("[data-type=\"inline-math\"]")?.dispatchEvent(new CustomEvent("click"));
        const created = [...blockEl.querySelectorAll("[data-type~=\"inline-math\"]")].find(m => !knownInline.has(m));
        if (created && !document.querySelector(".protyle-util:not(.fn__none) textarea")) {
            protyle.toolbar.showRender(protyle, created);
        }
        const ta = document.querySelector(".protyle-util:not(.fn__none) textarea") as HTMLTextAreaElement;
        if (ta && ta.value === inline) {
            ta.focus();
            ta.select();
            document.execCommand("delete");
        }
        return;
    }
    deleteBefore(node as Text, range.startOffset, block.length);
    const known = new Set(protyle.wysiwyg.element.querySelectorAll("[data-type=\"NodeMathBlock\"]"));
    // An empty paragraph is replaced by the inserted block.
    editor.insert(protyle.lute.Md2BlockDOM("$$\n\n$$"), true, false);
    const math = [...protyle.wysiwyg.element.querySelectorAll("[data-type=\"NodeMathBlock\"]")].find(m => !known.has(m));
    if (math) {
        protyle.toolbar.showRender(protyle, math);
    }
}
