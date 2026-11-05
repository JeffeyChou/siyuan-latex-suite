import {Config, Controller, Engine, Host} from "../src/controller";
import {DEFAULT_CONFIG, buildEngine} from "../src/config";
import {pairAtCursor, pairBrackets, tokenize} from "../src/engine";

class FakeHost implements Host {
    v = "";
    s = 0;
    e = 0;
    exited = false;
    ctl: Controller;
    value() {
        return this.v;
    }
    selection(): [number, number] {
        return [this.s, this.e];
    }
    replace(from: number, to: number, text: string) {
        this.v = this.v.slice(0, from) + text + this.v.slice(to);
        this.s = this.e = from + text.length;
        this.ctl.onChange("insertText");
    }
    select(a: number, b: number) {
        this.s = a;
        this.e = b;
        this.ctl.onSelection();
    }
    exit() {
        this.exited = true;
    }
}

function setup(initial = "", inline = false, over: Partial<Config> = {}) {
    const engine: Engine = buildEngine({...DEFAULT_CONFIG, ...over});
    const host = new FakeHost();
    const i = initial.indexOf("|");
    host.v = initial.replace("|", "");
    host.s = host.e = i < 0 ? host.v.length : i;
    host.ctl = new Controller(host, () => engine, inline);
    return host;
}

// Keys: plain characters, or <Tab> <S-Tab> <Enter> <BS>.
function type(h: FakeHost, keys: string) {
    const re = /<(S-Tab|Tab|Enter|BS)>|[\s\S]/gu;
    let m: RegExpExecArray;
    while ((m = re.exec(keys))) {
        const name = m[1];
        const key = name === "S-Tab" ? "Tab" : name === "BS" ? "Backspace" : name || m[0];
        const handled = h.ctl.onKey({key, shift: name === "S-Tab", ctrl: false, alt: false, meta: false});
        if (handled) {
            continue;
        }
        if (key === "Backspace") {
            const from = h.s === h.e ? h.s - 1 : h.s;
            h.ctl.setHint(from);
            h.replace(from, h.e, "");
        } else if (key === "Tab") {
            h.ctl.setHint(h.s);
            h.replace(h.s, h.e, "\t");
        } else {
            h.ctl.setHint(h.s);
            h.replace(h.s, h.e, key === "Enter" ? "\n" : key);
        }
    }
}

const show = (h: FakeHost) => h.s === h.e
    ? h.v.slice(0, h.s) + "|" + h.v.slice(h.s)
    : h.v.slice(0, h.s) + "[" + h.v.slice(h.s, h.e) + "]" + h.v.slice(h.e);

let pass = 0;
let fail = 0;
function expect(name: string, got: string, want: string) {
    if (got === want) {
        pass++;
    } else {
        fail++;
        console.log(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`);
    }
}
function run(name: string, keys: string, want: string, initial = "", inline = false, over: Partial<Config> = {}) {
    const h = setup(initial, inline, over);
    type(h, keys);
    expect(name, show(h), want);
    return h;
}

// Auto-fraction
run("frac simple", "x/", "\\frac{x}{|}");
run("frac then tab", "x/y<Tab>z", "\\frac{x}{y}z|");
run("frac parens", "(a+b)/", "\\frac{a+b}{|}");
run("frac stops at +", "a+b/", "a+\\frac{b}{|}");
run("frac with group", "e^{2x}/", "\\frac{e^{2x}}{|}");
run("frac greek space", "@a b/", "\\frac{\\alpha b}{|}");
run("frac in superscript is plain", "e^{x/", "e^{x/|}");
run("frac empty", " /", " /|");
{
    const h = setup("ab");
    h.s = 0;
    type(h, "/");
    expect("frac selection", show(h), "\\frac{ab}{|}");
}

// Snippets
run("greek", "alpha", "\\alpha|");
run("greek at start", "beta+", "\\beta+|");
run("no eta inside beta", "\\beta", "\\beta|");
run("sr", "xsr", "x^{2}|");
run("subscript", "x2", "x_{2}|");
run("subscript combine", "x23", "x_{23}|");
run("greek subscript", "@a1", "\\alpha_{1}|");
run("sum then tab expands", "sum<Tab>", "\\sum_{[i]=1}^{N} ");
run("sum tabstops", "sum<Tab>k<Tab>0<Tab>n<Tab>", "\\sum_{k=0}^{n} |");
run("sqrt", "sqx<Tab>", "\\sqrt{ x }|");
run("typing macro keeps quiet", "\\sum", "\\sum|");
run("->", "a->b", "a\\to b|");
run("space after macro only for letters", "alpha^", "\\alpha^|");
run("greek then sr", "@asr", "\\alpha^{2}|");
run("no space after typed macro", "\\to b", "\\to b|");
run("text", "text", "\\text{|}");
run("RR", "x inn RR", "x \\in \\mathbb{R}|");
run("ddot vs dot", "xddot", "\\ddot{x}|");
run("cdot", "a cdot b", "a \\cdot b|");
run("iiint", "iiint", "\\iiint|");
run("lim", "lim", "\\lim_{ [n] \\to \\infty } ");
run("mirror tayl", "taylg<Tab>", "g([x] + h) = g(x) + g'(x)h + g''(x) \\frac{h^{2}}{2!} + \\dots");
run("trig", "sin", "\\sin|");
run("arcsin", "arcsin", "\\arcsin|");
run("arcsec", "arcsec", "\\operatorname{arcsec}|");
run("block env newline", "pmat", "\\begin{pmatrix}\n|\n\\end{pmatrix}");
run("inline env", "pmat", "\\begin{pmatrix}|\\end{pmatrix}", "", true);
run("iden", "iden2", "\\begin{pmatrix}\n1 & 0 \\\\\n0 & 1\n\\end{pmatrix}|");

// Visual
{
    const h = setup("ab");
    h.s = 0;
    type(h, "U");
    expect("visual U", show(h), "\\underbrace{ ab }_{ | }");
}
{
    const h = setup("ab");
    h.s = 0;
    h.e = 2;
    type(h, "S");
    expect("visual S", show(h), "\\sqrt{ ab }|");
}

// Brackets, tabout
run("auto pair", "(", "(|)");
run("overtype", "(x)", "(x)|");
run("tabout of paren", "(x<Tab>", "(x)|");
run("pair backspace", "(<BS>", "|");
run("tabout braces", "<Tab>", "\\hat{x}| + y", "\\hat{x|} + y");
run("tab to end", "<Tab>", "a + b|", "a| + b");
{
    const h = run("tab exits", "<Tab>", "a|", "a|");
    expect("tab exits flag", String(h.exited), "true");
}
run("reverse tabout", "<S-Tab>", "\\hat|{x}", "\\hat{x|}");

// Auto-enlarge
run("enlarge", "(sum", "\\left(\\sum|\\right)");
run("enlarge frac", "(1/", "\\left(\\frac{1}{|}\\right)");
run("no enlarge sqrt", "\\sqrt[sum", "\\sqrt[\\sum|]");

// Matrix
run("matrix tab and enter", "a<Tab>b<Enter>c", "\\begin{pmatrix}\na & b \\\\\nc|\n\\end{pmatrix}", "\\begin{pmatrix}\n|\n\\end{pmatrix}");
run("matrix inline enter", "a<Enter>c", "\\begin{bmatrix}a \\\\ c|\\end{bmatrix}", "\\begin{bmatrix}|\\end{bmatrix}", true);

// Nested snippets
run("nested frac in sum", "sum<Tab>i<Tab>1<Tab>N<Tab>x/2", "\\sum_{i=1}^{N} \\frac{x}{2|}");
run("nested pair in frac", "\\frac{a}{b}", "\\frac{a}{b}|");
run("frac inside paren tabs", "(x/y<Tab><Tab>", "\\left(\\frac{x}{y}\\right)|");

// Clearing the text drops the snippet that was in it
{
    const h = setup();
    type(h, "(sum");
    h.s = 0;
    h.e = h.v.length;
    type(h, "<BS>pmata<Tab>b");
    expect("stale frame dropped", show(h), "\\begin{pmatrix}\na & b|\n\\end{pmatrix}");
}

// Bracket pairing
{
    const toks = tokenize("\\left( a [b) \\right. \\{ c \\}");
    const {pairs, unmatched} = pairBrackets(toks);
    expect("pairs", pairs.map(p => p.open.text + p.close.text).join(" "), "[) \\left(\\right. \\{\\}");
    expect("unmatched", String(unmatched.length), "0");
    const p = pairAtCursor(pairs, 9);
    expect("pair at cursor", p.open.text, "[");
}

console.log(`${pass} passed, ${fail} failed`);
if (fail) {
    process.exit(1);
}
