[
    // Adapted from obsidian-latex-suite's default snippets (MIT, artisticat1).
    // options: r regex, A auto (fires while typing; otherwise press Tab),
    // w word boundary, v visual (type the trigger with text selected),
    // m any formula, M math block only, n inline math only.
    // Placeholders: $0 $1 … are Tab stops in order, ${1:text} has default text,
    // [[0]] [[1]] … are the regex capture groups, ${GREEK} etc. are variables.
    // A replacement may be a function (match, {vars, inline}) => string | false.

    // Environments
    {trigger: /([^\\\w])beg/, replacement: "[[0]]\\begin{$0}\n$1\n\\end{$0}", options: "MA"},
    {trigger: /([^\\\w])beg/, replacement: "[[0]]\\begin{$0} $1 \\end{$0}", options: "nA"},

    // Greek letters
    {trigger: "@a", replacement: "\\alpha", options: "mA"},
    {trigger: "@b", replacement: "\\beta", options: "mA"},
    {trigger: "@g", replacement: "\\gamma", options: "mA"},
    {trigger: "@G", replacement: "\\Gamma", options: "mA"},
    {trigger: "@d", replacement: "\\delta", options: "mA"},
    {trigger: "@D", replacement: "\\Delta", options: "mA"},
    {trigger: "@e", replacement: "\\epsilon", options: "mA"},
    {trigger: ":e", replacement: "\\varepsilon", options: "mA"},
    {trigger: "@z", replacement: "\\zeta", options: "mA"},
    {trigger: "@t", replacement: "\\theta", options: "mA"},
    {trigger: "@T", replacement: "\\Theta", options: "mA"},
    {trigger: ":t", replacement: "\\vartheta", options: "mA"},
    {trigger: "@i", replacement: "\\iota", options: "mA"},
    {trigger: "@k", replacement: "\\kappa", options: "mA"},
    {trigger: "@l", replacement: "\\lambda", options: "mA"},
    {trigger: "@L", replacement: "\\Lambda", options: "mA"},
    {trigger: "@s", replacement: "\\sigma", options: "mA"},
    {trigger: "@S", replacement: "\\Sigma", options: "mA"},
    {trigger: "@u", replacement: "\\upsilon", options: "mA"},
    {trigger: "@U", replacement: "\\Upsilon", options: "mA"},
    {trigger: "@o", replacement: "\\omega", options: "mA"},
    {trigger: "@O", replacement: "\\Omega", options: "mA"},
    {trigger: "ome", replacement: "\\omega", options: "mA"},
    {trigger: "Ome", replacement: "\\Omega", options: "mA"},

    // Text
    {trigger: /\n\s*"/, replacement: "\n\\text{$0 } $1", options: "mrA"},
    {trigger: "text", replacement: "\\text{$0}$1", options: "mA", priority: -1},
    {trigger: "\"", replacement: "\\text{$0}$1", options: "mA", priority: -1},

    // Basic operations
    {trigger: "sr", replacement: "^{2}", options: "mA"},
    {trigger: "cb", replacement: "^{3}", options: "mA"},
    {trigger: "rd", replacement: "^{$0}$1", options: "mA"},
    {trigger: "_", replacement: "_{$0}$1", options: "mA"},
    {trigger: "sts", replacement: "_\\text{$0}", options: "mA"},
    {trigger: "sq", replacement: "\\sqrt{ $0 }$1", options: "mA"},
    {trigger: /(\d)rt/, replacement: "\\sqrt[[[0]]]{ $0 }$1", options: "mA"},
    {trigger: "//", replacement: "\\frac{$0}{$1}$2", options: "mA"},
    {trigger: /\bee/, replacement: "e^{ $0 }$1", options: "mA"},
    {trigger: "invs", replacement: "^{-1}", options: "mA"},
    {trigger: /([^\\])(exp|log|ln)/, replacement: "[[0]]\\[[1]]", options: "rmA"},
    {trigger: "conj", replacement: "^{*}", options: "mA"},
    {trigger: "Re", replacement: "\\mathrm{Re}", options: "mA"},
    {trigger: "Im", replacement: "\\mathrm{Im}", options: "mA"},
    {trigger: "bf", replacement: "\\mathbf{$0}", options: "mA"},
    {trigger: "rm", replacement: "\\mathrm{$0}$1", options: "mA"},

    // Linear algebra
    {trigger: /([^\\])(det)/, replacement: "[[0]]\\[[1]]", options: "rmA"},
    {trigger: "trace", replacement: "\\mathrm{Tr}", options: "mA"},

    // More operations
    {trigger: "([a-zA-Z])hat", replacement: "\\hat{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])bar", replacement: "\\bar{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])dot", replacement: "\\dot{[[0]]}", options: "rmA", priority: -1},
    {trigger: "([a-zA-Z])ddot", replacement: "\\ddot{[[0]]}", options: "rmA", priority: 1},
    {trigger: "([a-zA-Z])tilde", replacement: "\\tilde{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])und", replacement: "\\underline{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])vec", replacement: "\\vec{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z]),\\.", replacement: "\\mathbf{[[0]]}", options: "rmA"},
    {trigger: "([a-zA-Z])\\.,", replacement: "\\mathbf{[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}),\\.", replacement: "\\boldsymbol{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK})\\.,", replacement: "\\boldsymbol{\\[[0]]}", options: "rmA"},

    {trigger: "hat", replacement: "\\hat{$0}$1", options: "mA"},
    {trigger: "bar", replacement: "\\bar{$0}$1", options: "mA"},
    {trigger: "dot", replacement: "\\dot{$0}$1", options: "mA", priority: -1},
    {trigger: "ddot", replacement: "\\ddot{$0}$1", options: "mA"},
    {trigger: "cdot", replacement: "\\cdot", options: "mA"},
    {trigger: "tilde", replacement: "\\tilde{$0}$1", options: "mA"},
    {trigger: "und", replacement: "\\underline{$0}$1", options: "mA"},
    {trigger: "vec", replacement: "\\vec{$0}$1", options: "mA"},
    {trigger: "pmod", replacement: "\\pmod{${0:n}}$1", options: "mA"},

    // x3 -> x_{3}, \alpha3 -> \alpha_{3}, \leq3 -> \leq 3
    {
        trigger: /(\\?)([A-Za-z]+)(\d)/,
        replacement: (match, {vars}) => {
            const digit = match[3];
            if (match[1] !== "\\") {
                return `${match[2]}_{${digit}}`;
            }
            if (new RegExp(`^(?:${vars.GREEK})$`).test(match[2])) {
                return `\\${match[2]}_{${digit}}`;
            }
            return `\\${match[2]} ${digit}`;
        },
        options: "rmA",
        priority: -1,
        excludedMacros: ["pu", "ce"],
    },
    // x_{3}4 -> x_{34}
    {trigger: "(\\\\${GREEK}|[A-Za-z])_{(\\d+)}(\\d)", replacement: "[[0]]_{[[1]][[2]]}", options: "rmA", priority: -1},
    // \dot{x}3 -> \dot{x}_{3}
    {trigger: "\\\\(${ACCENT})\\{(\\\\${GREEK}|[A-Za-z])\\}(?:_\\{(\\d+)\\})?(\\d)", replacement: "\\[[0]]{[[1]]}_{[[2]][[3]]}", options: "rmA", priority: -1},

    {trigger: "xnn", replacement: "x_{n}", options: "mA"},
    {trigger: "\\xii", replacement: "x_{i}", options: "mA", priority: 1},
    {trigger: "xjj", replacement: "x_{j}", options: "mA"},
    {trigger: "xp1", replacement: "x_{n+1}", options: "mA"},
    {trigger: "ynn", replacement: "y_{n}", options: "mA"},
    {trigger: "yii", replacement: "y_{i}", options: "mA"},
    {trigger: "yjj", replacement: "y_{j}", options: "mA"},

    // Symbols
    {trigger: "ooo", replacement: "\\infty", options: "mA"},
    {trigger: "sum", replacement: "\\sum", options: "mA"},
    {trigger: "prod", replacement: "\\prod", options: "mA"},
    {trigger: "\\sum", replacement: "\\sum_{${0:i}=${1:1}}^{${2:N}} $3", options: "m"},
    {trigger: "\\prod", replacement: "\\prod_{${0:i}=${1:1}}^{${2:N}} $3", options: "m"},
    {trigger: "lim", replacement: "\\lim_{ ${0:n} \\to ${1:\\infty} } $2", options: "mA"},
    {trigger: "+-", replacement: "\\pm", options: "mA"},
    {trigger: "-+", replacement: "\\mp", options: "mA"},
    {trigger: "...", replacement: "\\dots", options: "mA"},
    {trigger: "nabl", replacement: "\\nabla", options: "mA"},
    {trigger: "xx", replacement: "\\times", options: "mA"},
    {trigger: "**", replacement: "\\cdot", options: "mA"},
    {trigger: "para", replacement: "\\parallel", options: "mA"},
    {trigger: "deg", replacement: "\\degree", options: "mA"},

    {trigger: "===", replacement: "\\equiv", options: "mA"},
    {trigger: "!=", replacement: "\\neq", options: "mA"},
    {trigger: ">=", replacement: "\\geq", options: "mA"},
    {trigger: "<=", replacement: "\\leq", options: "mA"},
    {trigger: ">>", replacement: "\\gg", options: "mA"},
    {trigger: "<<", replacement: "\\ll", options: "mA"},
    {trigger: "simm", replacement: "\\sim", options: "mA"},
    {trigger: "sim=", replacement: "\\simeq", options: "mA"},
    {trigger: "prop", replacement: "\\propto", options: "mA"},

    {trigger: "<->", replacement: "\\leftrightarrow ", options: "mA"},
    {trigger: "->", replacement: "\\to", options: "mA", excludedMacros: ["ce"]},
    {trigger: "!>", replacement: "\\mapsto", options: "mA"},
    {trigger: "=>", replacement: "\\implies", options: "mA"},
    {trigger: "=<", replacement: "\\impliedby", options: "mA"},

    {trigger: "and", replacement: "\\cap", options: "wmA"},
    {trigger: "orr", replacement: "\\cup", options: "mA"},
    {trigger: "inn", replacement: "\\in", options: "mA"},
    {trigger: "notin", replacement: "\\not\\in", options: "mA"},
    {trigger: "\\\\\\", replacement: "\\setminus", options: "mA"},
    {trigger: "sub=", replacement: "\\subseteq", options: "mA"},
    {trigger: "sup=", replacement: "\\supseteq", options: "mA"},
    {trigger: "eset", replacement: "\\emptyset", options: "mA"},
    {trigger: "set", replacement: "\\{ $0 \\}$1", options: "wmA"},
    {trigger: /(n?)e\\xi sts/, replacement: "\\[[0]]exists", options: "mA", priority: 1},

    {trigger: "LL", replacement: "\\mathcal{L}", options: "mA"},
    {trigger: "HH", replacement: "\\mathcal{H}", options: "mA"},
    {trigger: "CC", replacement: "\\mathbb{C}", options: "mA"},
    {trigger: "RR", replacement: "\\mathbb{R}", options: "mA"},
    {trigger: "ZZ", replacement: "\\mathbb{Z}", options: "mA"},
    {trigger: "NN", replacement: "\\mathbb{N}", options: "mA"},
    {trigger: "QQ", replacement: "\\mathbb{Q}", options: "mA"},

    // Backslash before greek letters and symbols typed without one
    {trigger: "([^\\\\])(${GREEK})", replacement: "[[0]]\\[[1]]", options: "rmA"},
    {trigger: "([^\\\\])(${SYMBOL})", replacement: "[[0]]\\[[1]]", options: "rmA"},

    {trigger: "\\\\(${GREEK}|${SYMBOL}) sr", replacement: "\\[[0]]^{2}", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) cb", replacement: "\\[[0]]^{3}", options: "rmA"},
    {trigger: "\\\\(${GREEK}|${SYMBOL}) rd", replacement: "\\[[0]]^{$0}$1", options: "rmA"},
    {trigger: "\\\\(${GREEK}) hat", replacement: "\\hat{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}) dot", replacement: "\\dot{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}) bar", replacement: "\\bar{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}) vec", replacement: "\\vec{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}) tilde", replacement: "\\tilde{\\[[0]]}", options: "rmA"},
    {trigger: "\\\\(${GREEK}) und", replacement: "\\underline{\\[[0]]}", options: "rmA"},

    // Derivatives and integrals
    {trigger: "par", replacement: "\\frac{ \\partial ${0:y} }{ \\partial ${1:x} } $2", options: "m"},
    {trigger: /par([0-9])/, replacement: "\\frac{ \\partial^{[[0]]} ${0:y} }{ \\partial ${1:x}^{[[0]]} } $2", options: "mA"},
    {trigger: /parn/, replacement: "\\frac{ \\partial^{${0:n}} ${1:y} }{ \\partial ${2:x}^{${0:n}} } $3", options: "mA"},
    {trigger: /pa([A-Za-z])([A-Za-z])/, replacement: "\\frac{ \\partial [[0]] }{ \\partial [[1]] } ", options: "rm"},
    {trigger: "ddt", replacement: "\\frac{d}{dt} ", options: "mA"},

    {trigger: /([^\\])int/, replacement: "[[0]]\\int", options: "mA", priority: -1},
    {trigger: "\\int", replacement: "\\int $0 \\, d${1:x} $2", options: "m"},
    {trigger: "dint", replacement: "\\int_{${0:0}}^{${1:1}} $2 \\, d${3:x} $4", options: "mA"},
    {trigger: "oint", replacement: "\\oint", options: "mA"},
    {trigger: "iint", replacement: "\\iint", options: "mA"},
    {trigger: "iiint", replacement: "\\iiint", options: "mA"},
    {trigger: "oinf", replacement: "\\int_{0}^{\\infty} $0 \\, d${1:x} $2", options: "mA"},
    {trigger: "infi", replacement: "\\int_{-\\infty}^{\\infty} $0 \\, d${1:x} $2", options: "mA"},

    // Trigonometry
    {trigger: /([^\\])(arcsin|sin|arccos|cos|arctan|tan|csc|sec|cot)/, replacement: "[[0]]\\[[1]]", options: "rmA"},
    {trigger: /(arccsc|arcsec|arccot)/, replacement: "\\operatorname{[[0]]}$0", options: "mA", priority: 1},

    // Visual: select text, then type the trigger
    {trigger: "U", replacement: "\\underbrace{ ${VISUAL} }_{ $0 }", options: "mv"},
    {trigger: "O", replacement: "\\overbrace{ ${VISUAL} }^{ $0 }", options: "mv"},
    {trigger: "B", replacement: "\\underset{ $0 }{ ${VISUAL} }", options: "mv"},
    {trigger: "C", replacement: "\\cancel{ ${VISUAL} }", options: "mv"},
    {trigger: "K", replacement: "\\bcancel{ ${VISUAL} }", options: "mv"},
    {trigger: "S", replacement: "\\sqrt{ ${VISUAL} }", options: "mv"},

    // Physics
    {trigger: "kbt", replacement: "k_{B}T", options: "mA"},
    {trigger: "msun", replacement: "M_{\\odot}", options: "mA"},

    // Quantum mechanics
    {trigger: "dag", replacement: "^{\\dagger}", options: "mA"},
    {trigger: "o+", replacement: "\\oplus ", options: "mA"},
    {trigger: "ox", replacement: "\\otimes ", options: "wmA"},
    {trigger: "bra", replacement: "\\bra{$0} $1", options: "mA"},
    {trigger: "ket", replacement: "\\ket{$0} $1", options: "mA"},
    {trigger: "brk", replacement: "\\braket{ $0 | $1 } $2", options: "mA"},
    {trigger: "outer", replacement: "\\ket{${0:\\psi}} \\bra{${0:\\psi}} $1", options: "mA"},

    // Chemistry
    {trigger: "pu", replacement: "\\pu{ $0 }", options: "mA"},
    {trigger: "cee", replacement: "\\ce{ $0 }", options: "mA"},
    {trigger: "he4", replacement: "{}^{4}_{2}He ", options: "mA"},
    {trigger: "he3", replacement: "{}^{3}_{2}He ", options: "mA"},
    {trigger: "iso", replacement: "{}^{${0:4}}_{${1:2}}${2:He}", options: "mA"},

    // Environments
    {trigger: /([pbBvV]mat)/, replacement: "\\begin{[[0]]rix}\n$0\n\\end{[[0]]rix}", options: "rMA"},
    {trigger: /(matrix|cases|array)/, replacement: "\\begin{[[0]]}\n$0\n\\end{[[0]]}", options: "rMA"},
    {trigger: /([pbBvV]mat)/, replacement: "\\begin{[[0]]rix}$0\\end{[[0]]rix}", options: "rnA"},
    {trigger: /(matrix|cases|array)/, replacement: "\\begin{[[0]]}$0\\end{[[0]]}", options: "rnA"},
    {trigger: "align", replacement: "\\begin{aligned}\n$0\n\\end{aligned}", options: "MA"},
    {trigger: "align", replacement: "\\begin{aligned}$0\\end{aligned}", options: "nA"},

    // Brackets
    {trigger: "avg", replacement: "\\langle $0 \\rangle $1", options: "mA"},
    {trigger: "norm", replacement: "\\lvert $0 \\rvert $1", options: "mA", priority: 1},
    {trigger: "Norm", replacement: "\\lVert $0 \\rVert $1", options: "mA", priority: 1},
    {trigger: "ceil", replacement: "\\lceil $0 \\rceil $1", options: "mA"},
    {trigger: "floor", replacement: "\\lfloor $0 \\rfloor $1", options: "mA"},
    {trigger: "mod", replacement: "|$0|$1", options: "mA"},
    {trigger: "(", replacement: "(${VISUAL})", options: "mv"},
    {trigger: "[", replacement: "[${VISUAL}]", options: "mv"},
    {trigger: "{", replacement: "{${VISUAL}}", options: "mv"},
    {trigger: "(", replacement: "($0)$1", options: "mA"},
    {trigger: "{", replacement: "{$0}$1", options: "mA"},
    {trigger: "[", replacement: "[$0]$1", options: "mA"},
    {trigger: "lr(", replacement: "\\left( $0 \\right) $1", options: "mA"},
    {trigger: "lr{", replacement: "\\left\\{ $0 \\right\\} $1", options: "mA"},
    {trigger: "lr[", replacement: "\\left[ $0 \\right] $1", options: "mA"},
    {trigger: "lr|", replacement: "\\left| $0 \\right| $1", options: "mA"},
    {trigger: "lra", replacement: "\\left< $0 \\right> $1", options: "mA"},

    // Placeholders can repeat: Tab copies the first one into the others.
    {trigger: "tayl", replacement: "${0:f}(${1:x} + ${2:h}) = ${0:f}(${1:x}) + ${0:f}'(${1:x})${2:h} + ${0:f}''(${1:x}) \\frac{${2:h}^{2}}{2!} + \\dots$3", options: "mA"},

    // N x N identity matrix
    {
        trigger: /iden(\d)/,
        replacement: (match) => {
            const n = +match[1];
            const rows = [];
            for (let j = 0; j < n; j++) {
                const row = [];
                for (let i = 0; i < n; i++) {
                    row.push(i === j ? 1 : 0);
                }
                rows.push(row.join(" & "));
            }
            return `\\begin{pmatrix}\n${rows.join(" \\\\\n")}\n\\end{pmatrix}`;
        },
        options: "mA",
    },
]
