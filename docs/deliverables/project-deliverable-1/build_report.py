#!/usr/bin/env python3
"""Build the self-contained CPE 334 Deliverable 1 LaTeX content from repo docs.

Uses only the Python standard library. Run from any directory:
  python docs/deliverables/project-deliverable-1/build_report.py
Then compile project-deliverable-1.tex with XeLaTeX/latexmk.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import quote, urlsplit

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent

SOURCES = [
    ("Part A: System requirements specification", "docs/requirements/srs.md"),
    ("Part B: Feature inventory and traceability", "docs/requirements/feature-inventory.md"),
    ("Part C: System-level design specification", "docs/architecture/system-level-sds.md"),
    ("Part D: Three-sprint product plan", "docs/planning/three-sprint-plan.md"),
    ("Part E: Sprint 1 feature-level design specifications", "docs/features/sprint1-feature-contracts.md"),
    ("Part E: Sprint 1 software test specification", "docs/testing/sprint1-software-test-specification.md"),
]

SOURCE_PARTS = {
    "docs/requirements/srs.md": "A",
    "docs/requirements/feature-inventory.md": "B",
    "docs/architecture/system-level-sds.md": "C",
    "docs/planning/three-sprint-plan.md": "D",
    "docs/features/sprint1-feature-contracts.md": "E",
    "docs/testing/sprint1-software-test-specification.md": "E",
}
GITHUB_REPO = "https://github.com/ovenmakemeheat/Pockit"

ESCAPE = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}
STABLE_ID_RE = re.compile(r"(?<![A-Za-z0-9])[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{2}(?![A-Za-z0-9])")


def tex_escape(text: str) -> str:
    return "".join(ESCAPE.get(char, char) for char in text)


def href_url(url: str) -> str:
    """Escape TeX-sensitive URL characters for hyperref's first argument."""
    url = url.strip().replace(" ", "%20")
    for char, replacement in (("%", r"\%"), ("#", r"\#"), ("&", r"\&"), ("_", r"\_")):
        url = url.replace(char, replacement)
    return url


def code_inline(value: str) -> str:
    """Render code with invisible break points, except within stable IDs."""
    if STABLE_ID_RE.fullmatch(value):
        return r"\mbox{\texttt{" + tex_escape(value) + "}}"
    rendered: list[str] = []
    long_token = len(value) >= 28
    for index, char in enumerate(value):
        rendered.append(ESCAPE.get(char, char))
        next_char = value[index + 1] if index + 1 < len(value) else ""
        if char in "/._-:":
            rendered.append(r"\allowbreak{}")
        elif long_token and (index + 1) % 10 == 0 and next_char and next_char not in "/._-: ":
            rendered.append(r"\allowbreak{}")
    return r"\texttt{" + "".join(rendered) + "}"


def markdown_link(label: str, target: str, source_path: Path | None) -> str:
    display = tex_escape(label)
    display = STABLE_ID_RE.sub(lambda match: r"\mbox{" + match.group(0) + "}", display)
    parsed = urlsplit(target.strip())
    if parsed.scheme or target.startswith("//"):
        return r"\href{" + href_url(target) + "}{" + display + "}"
    if source_path is None:
        return r"\href{" + href_url(target) + "}{" + display + "}"

    linked_path = (source_path.parent / parsed.path).resolve() if parsed.path else source_path.resolve()
    try:
        relative_path = linked_path.relative_to(ROOT).as_posix()
    except ValueError:
        return r"\href{" + href_url(target) + "}{" + display + "}"

    part = SOURCE_PARTS.get(relative_path)
    if part:
        return rf"\hyperref[part:{part}:start]{{{display}}}"

    url = GITHUB_REPO + "/blob/main/" + quote(relative_path)
    if parsed.query:
        url += "?" + parsed.query
    if parsed.fragment:
        url += "#" + quote(parsed.fragment, safe="-_")
    return r"\href{" + href_url(url) + "}{" + display + "}"


def inline(text: str, source_path: Path | None = None) -> str:
    saved: list[tuple[str, str]] = []

    def hold(latex: str) -> str:
        token = f"QZREPORTTOKEN{len(saved)}ZQ"
        saved.append((token, latex))
        return token

    text = re.sub(r"<br\s*/?>", lambda _: hold(r"\newline{}"), text, flags=re.IGNORECASE)
    # Protect links and code before escaping Markdown punctuation.
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda match: hold(markdown_link(match.group(1), match.group(2), source_path)),
        text,
    )
    text = re.sub(
        r"`([^`]+)`",
        lambda match: hold(code_inline(match.group(1))),
        text,
    )
    text = re.sub(r"\[x\]", lambda _: hold(r"\(\checkmark\)"), text, flags=re.IGNORECASE)
    text = re.sub(r"\[ \]", lambda _: hold(r"\(\square\)"), text)

    escaped = tex_escape(text)
    escaped = re.sub(r"/", lambda _: r"/\allowbreak{}", escaped)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"\\textbf{\1}", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*\n]+?)\*(?!\*)", r"\\emph{\1}", escaped)
    escaped = STABLE_ID_RE.sub(lambda match: r"\mbox{" + match.group(0) + "}", escaped)
    for token, latex in saved:
        escaped = escaped.replace(token, latex)
    return escaped


def is_table_row(line: str) -> bool:
    candidate = line.strip()
    return candidate.startswith("|") and candidate.endswith("|")


def split_table_row(line: str) -> list[str]:
    value = line.strip().strip("|")
    return [cell.strip() for cell in value.split("|")]


def is_table_separator(line: str) -> bool:
    cells = split_table_row(line)
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell.replace(" ", "")) for cell in cells)


def is_list_line(line: str) -> bool:
    return bool(re.match(r"^\s*(?:[-+*]|\d+[.)])\s+", line))


def is_block_start(lines: list[str], index: int) -> bool:
    line = lines[index]
    stripped = line.strip()
    if not stripped:
        return True
    if re.match(r"^#{1,6}\s+", line) or stripped.startswith("```"):
        return True
    if is_table_row(line) or is_list_line(line) or stripped.startswith(">"):
        return True
    return bool(re.fullmatch(r"(?:---+|\*\*\*+|___+)\s*", stripped))


def render_table(rows: list[list[str]], source_path: Path | None = None) -> str:
    if not rows:
        return ""
    count = max(len(row) for row in rows)
    rows = [row + [""] * (count - len(row)) for row in rows]
    # Give identifier columns less width and narrative columns more room.
    lengths = [max(4, max(len(row[col]) for row in rows)) for col in range(count)]
    weights = [length**0.52 for length in lengths]
    header = " ".join(rows[0]).lower()
    if count > 1 and any(word in header for word in ("requirement", "acceptance", "test id", "feature", "sprint")):
        weights[0] *= 0.62
    ratios = [weight / sum(weights) for weight in weights]
    # Keep all columns readable and reserve a little width for TeX inter-column spacing.
    low = min(0.13, 0.86 / count)
    high = min(0.58, 0.91 - low * (count - 1))
    ratios = [max(low, min(high, ratio)) for ratio in ratios]
    total = sum(ratios)
    widths = [ratio * 0.92 / total for ratio in ratios]
    header_cells = [cell.strip().lower() for cell in rows[0]]
    if count == 3 and header_cells[0] == "check id":
        widths = [0.15, 0.38, 0.39]
    elif count == 5 and header_cells[0] == "test id" and header_cells[-1] == "acceptance ids":
        widths = [0.15, 0.09, 0.25, 0.27, 0.16]
    colspec = "@{}" + "".join(
        rf">{{\raggedright\arraybackslash}}p{{{width:.3f}\textwidth}}" for width in widths
    ) + "@{}"
    out = [r"\small", r"\setlength{\tabcolsep}{3pt}", r"\renewcommand{\arraystretch}{1.05}", rf"\begin{{longtable}}{{{colspec}}}"]

    def row_tex(row: list[str], is_header: bool = False) -> str:
        cells = [inline(cell, source_path) for cell in row]
        if is_header:
            cells = [r"\textbf{" + cell + "}" for cell in cells]
        return " & ".join(cells) + r" \\"

    out += [r"\toprule", row_tex(rows[0], True), r"\midrule", r"\endfirsthead", r"\toprule", row_tex(rows[0], True), r"\midrule", r"\endhead", r"\midrule", rf"\multicolumn{{{count}}}{{r}}{{\footnotesize Continued on next page}} \\", r"\endfoot", r"\bottomrule", r"\endlastfoot"]
    for row in rows[1:]:
        out.append(row_tex(row))
    out += [r"\end{longtable}", r"\normalsize", r"\setlength{\tabcolsep}{6pt}", r"\renewcommand{\arraystretch}{1.15}"]
    return "\n".join(out) + "\n"


def render_list(lines: list[str], start: int, source_path: Path | None = None) -> tuple[str, int]:
    out: list[str] = []
    stack: list[tuple[int, str]] = []
    index = start
    while index < len(lines) and is_list_line(lines[index]):
        line = lines[index]
        match = re.match(r"^(\s*)([-+*]|\d+[.)])\s+(.*)$", line)
        if not match:
            break
        indent = len(match.group(1).expandtabs(2))
        marker = match.group(2)
        env = "enumerate" if marker[0].isdigit() else "itemize"
        while stack and indent < stack[-1][0]:
            out.append(rf"\end{{{stack.pop()[1]}}}")
        if not stack:
            out.append(rf"\begin{{{env}}}[leftmargin=*,itemsep=1pt,topsep=2pt]")
            stack.append((indent, env))
        elif indent > stack[-1][0]:
            out.append(rf"\begin{{{env}}}[leftmargin=*,itemsep=0pt,topsep=1pt]")
            stack.append((indent, env))
        elif env != stack[-1][1]:
            out.append(rf"\end{{{stack.pop()[1]}}}")
            out.append(rf"\begin{{{env}}}[leftmargin=*,itemsep=1pt,topsep=2pt]")
            stack.append((indent, env))
        out.append(r"\item " + inline(match.group(3), source_path))
        index += 1
    while stack:
        out.append(rf"\end{{{stack.pop()[1]}}}")
    return "\n".join(out) + "\n", index


FLOWCHART_POSITIONS = {
    "Browser": (-7.15, 0),
    "Web": (-4.35, 0),
    "Server": (-1.55, 0),
    "Auth": (1.55, 1.35),
    "API": (1.55, -1.35),
    "DBPkg": (4.75, 0),
    "PG": (7.65, 0),
    "UI": (-4.35, -2.55),
    "Config": (-1.55, -2.55),
}

ER_NODES = {
    "USER": ("User", (-5.4, 0.1)),
    "FINANCIAL_ACCOUNT": ("Financial\\nAccount", (-0.3, 2.3)),
    "FINANCIAL_TRANSACTION": ("Financial\\nTransaction", (-0.3, -1.6)),
    "ALLOCATION_LINE": ("Allocation line", (5.0, 0.45)),
    "FAVORITE": ("Favorite", (5.0, -2.8)),
}

ER_RELATION_LAYOUT = {
    "owns": ("USER", "FINANCIAL_ACCOUNT", "USER.north east", "ACCOUNT.west", "out=30,in=180", "above"),
    "records": ("USER", "FINANCIAL_TRANSACTION", "USER.south east", "TRANSACTION.west", "out=-30,in=180", "below"),
    "contains": ("FINANCIAL_TRANSACTION", "ALLOCATION_LINE", "TRANSACTION.east", "ALLOCATION.south west", "out=15,in=200", "above"),
    "selected_source_or_receiver": ("FINANCIAL_ACCOUNT", "FINANCIAL_TRANSACTION", "ACCOUNT.south", "TRANSACTION.north", "", "right"),
    "allocation_target": ("FINANCIAL_ACCOUNT", "ALLOCATION_LINE", "ACCOUNT.east", "ALLOCATION.north west", "out=0,in=145", "above"),
    "may_be_marked": ("FINANCIAL_TRANSACTION", "FAVORITE", "TRANSACTION.south east", "FAVORITE.west", "out=-25,in=180", "below"),
}


def _diagram_label(value: str) -> str:
    return r"\\ ".join(tex_escape(part) for part in value.split(r"\n"))


def _diagram_anchors(source: str, target: str, positions: dict[str, tuple[float, float]]) -> tuple[str, str]:
    source_x, source_y = positions[source]
    target_x, target_y = positions[target]
    dx = target_x - source_x
    dy = target_y - source_y
    if abs(dx) < 0.05:
        return ("south", "north") if dy < 0 else ("north", "south")
    if abs(dy) < 0.05:
        return ("east", "west") if dx > 0 else ("west", "east")
    if dx > 0:
        return ("north east", "south west") if dy > 0 else ("south east", "north west")
    return ("north west", "south east") if dy > 0 else ("south west", "north east")


def _render_flowchart(lines: list[str]) -> str:
    node_pattern = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)\s*(?:\[\((.*?)\)\]|\[(.*?)\])$")
    edge_pattern = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)\s*-->\s*(?:\|([^|]+)\|\s*)?([A-Za-z][A-Za-z0-9_]*)$")
    dependency_pattern = re.compile(r"^([A-Za-z][A-Za-z0-9_]*)\s+-\.\s*(.*?)\s*\.->\s*([A-Za-z][A-Za-z0-9_]*)$")
    nodes: dict[str, str] = {}
    edges: list[tuple[str, str, str, bool]] = []
    for raw_line in lines[1:]:
        line = raw_line.strip()
        if not line:
            continue
        node_match = node_pattern.fullmatch(line)
        if node_match:
            nodes[node_match.group(1)] = node_match.group(2) or node_match.group(3) or ""
            continue
        edge_match = edge_pattern.fullmatch(line)
        if edge_match:
            edges.append((edge_match.group(1), edge_match.group(3), edge_match.group(2) or "", False))
            continue
        dependency_match = dependency_pattern.fullmatch(line)
        if dependency_match:
            edges.append((dependency_match.group(1), dependency_match.group(3), dependency_match.group(2), True))
            continue
        raise ValueError(f"Unsupported Mermaid flowchart statement: {line}")

    if nodes.keys() != FLOWCHART_POSITIONS.keys():
        raise ValueError("The report's flowchart node set changed; update its TikZ layout before rebuilding")
    for source, target, _, _ in edges:
        if source not in nodes or target not in nodes:
            raise ValueError(f"Mermaid flowchart edge references an unknown node: {source} -> {target}")

    out = [
        r"\begin{center}",
        r"\begin{tikzpicture}[x=1cm,y=1cm,",
        r"  component/.style={draw=PockitBlue,thick,rounded corners=2pt,fill=PockitLight,text width=2.15cm,align=center,minimum height=10mm,font=\sffamily\scriptsize,inner sep=2.5pt},",
        r"  database/.style={component,fill=PockitTeal!10},",
        r"  flow/.style={-{Stealth[length=1.6mm]},thick,color=PockitTeal},",
        r"  dependency/.style={flow,dashed},",
        r"  edgeLabel/.style={font=\tiny,align=center,text=PockitMuted,fill=white,inner sep=1pt,text width=2.55cm}",
        r"]",
    ]
    for node_id, label in nodes.items():
        x, y = FLOWCHART_POSITIONS[node_id]
        style = "database" if node_id == "PG" else "component"
        out.append(rf"\node[{style}] ({node_id}) at ({x},{y}) {{{_diagram_label(label)}}};")
    for source, target, label, dashed in edges:
        start_anchor, end_anchor = _diagram_anchors(source, target, FLOWCHART_POSITIONS)
        style = "dependency" if dashed else "flow"
        if source == "Web" and target == "Server" and label.startswith("session cookie"):
            out.append(
                rf"\draw[{style}] ({source}.north east) to[out=18,in=162] node[pos=.5,above=1pt,edgeLabel] {{{_diagram_label(label)}}} ({target}.north west);"
            )
        elif source == "Web" and target == "Server" and label.startswith("typed requests"):
            out.append(
                rf"\draw[{style}] ({source}.south east) to[out=-18,in=-162] node[pos=.5,below=1pt,edgeLabel] {{{_diagram_label(label)}}} ({target}.south west);"
            )
        elif label and not dashed:
            out.append(
                rf"\draw[{style}] ({source}.{start_anchor}) -- node[midway,above,edgeLabel] {{{_diagram_label(label)}}} ({target}.{end_anchor});"
            )
        else:
            out.append(rf"\draw[{style}] ({source}.{start_anchor}) -- ({target}.{end_anchor});")
    out += [r"\end{tikzpicture}", r"\end{center}", r"\smallskip", r"\noindent\footnotesize Dashed arrows show shared-package usage.\par"]
    return "\n".join(out)


def _render_er_diagram(lines: list[str]) -> str:
    relation_pattern = re.compile(r"^([A-Z_]+)\s+([|o]+)--([|o{}]+)\s+([A-Z_]+)\s*:\s*(.+)$")
    cardinalities = {"||": "1", "o|": "0..1", "o{": "0..*", "|{": "1..*"}
    relations: list[tuple[str, str, str, str, str]] = []
    for raw_line in lines[1:]:
        line = raw_line.strip()
        if not line:
            continue
        match = relation_pattern.fullmatch(line)
        if not match:
            raise ValueError(f"Unsupported Mermaid ER relationship: {line}")
        source, source_cardinality, target_cardinality, target, label = match.groups()
        if source_cardinality not in cardinalities or target_cardinality not in cardinalities:
            raise ValueError(f"Unsupported Mermaid cardinality in relationship: {line}")
        relations.append((source, target, label, cardinalities[source_cardinality], cardinalities[target_cardinality]))

    if {node for source, target, *_ in relations for node in (source, target)} != set(ER_NODES):
        raise ValueError("The report's ER entity set changed; update its TikZ layout before rebuilding")
    if {label for _, _, label, *_ in relations} != set(ER_RELATION_LAYOUT):
        raise ValueError("The report's ER relationships changed; update its TikZ layout before rebuilding")

    expected_relations = {label: (layout[0], layout[1]) for label, layout in ER_RELATION_LAYOUT.items()}
    for source, target, label, _, _ in relations:
        if expected_relations[label] != (source, target):
            raise ValueError(f"The report's ER relationship endpoints changed: {source} -> {target} ({label})")

    tikz_ids = {"USER": "USER", "FINANCIAL_ACCOUNT": "ACCOUNT", "FINANCIAL_TRANSACTION": "TRANSACTION", "ALLOCATION_LINE": "ALLOCATION", "FAVORITE": "FAVORITE"}
    out = [
        r"\begin{center}",
        r"\begin{tikzpicture}[x=1cm,y=1cm,",
        r"  entity/.style={draw=PockitBlue,thick,rounded corners=2pt,fill=PockitLight,text width=2.45cm,align=center,minimum height=11mm,font=\sffamily\small,inner sep=3pt},",
        r"  relation/.style={-{Stealth[length=1.6mm]},thick,color=PockitTeal},",
        r"  relationLabel/.style={font=\tiny,align=center,text=PockitMuted,fill=white,inner sep=1pt,text width=2.45cm}",
        r"]",
    ]
    for entity_id, (label, position) in ER_NODES.items():
        x, y = position
        out.append(rf"\node[entity] ({tikz_ids[entity_id]}) at ({x},{y}) {{{_diagram_label(label)}}};")
    for source, target, label, source_cardinality, target_cardinality in relations:
        _, _, source_anchor, target_anchor, route, label_position = ER_RELATION_LAYOUT[label]
        relation_label = _diagram_label(f"{source_cardinality} to {target_cardinality}: {label.replace('_', ' ')}")
        path = f"({source_anchor})"
        path += f" to[{route}]" if route else " --"
        path += rf" node[pos=.5,{label_position},relationLabel] {{{relation_label}}} ({target_anchor})"
        out.append(rf"\draw[relation] {path};")
    out += [r"\end{tikzpicture}", r"\end{center}", r"\smallskip", r"\noindent\footnotesize Cardinalities run from the source entity to the related entity.\par"]
    return "\n".join(out)


def render_mermaid(lines: list[str]) -> str:
    first = next((line.strip() for line in lines if line.strip()), "")
    if first == "flowchart LR":
        return _render_flowchart(lines)
    if first == "erDiagram":
        return _render_er_diagram(lines)
    raise ValueError(f"Unsupported Mermaid diagram type: {first or 'empty block'}")


def render_markdown(path: Path) -> str:
    path = path.resolve()
    text = path.read_text(encoding="utf-8-sig")
    return render_markdown_text(text, path)


def render_markdown_text(text: str, source_path: Path) -> str:
    path = source_path.resolve()
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = text.splitlines()
    out: list[str] = []
    index = 0

    # The document title is a subsection under its Part A–E report heading.
    while index < len(lines) and not lines[index].strip():
        index += 1
    if index < len(lines):
        title = re.match(r"^#\s+(.+)$", lines[index])
        if title:
            rendered_title = inline(title.group(1), path)
            out += [rf"\subsection*{{{rendered_title}}}", rf"\addcontentsline{{toc}}{{subsection}}{{{rendered_title}}}", r"\markright{" + rendered_title + "}", ""]
            index += 1

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            index += 1
            continue
        if stripped.startswith("```"):
            language = stripped[3:].strip().split(maxsplit=1)[0].lower() if stripped[3:].strip() else ""
            index += 1
            code: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code.append(lines[index])
                index += 1
            if index < len(lines):
                index += 1
            if language == "mermaid":
                out += [render_mermaid(code), r"\smallskip"]
            else:
                out += [r"\begin{lstlisting}", *code, r"\end{lstlisting}", r"\smallskip"]
            continue
        heading = re.match(r"^(#{2,6})\s+(.+)$", line)
        if heading:
            level = len(heading.group(1))
            title = inline(heading.group(2), path)
            if level == 2:
                out.append(rf"\subsubsection*{{{title}}}")
            elif level == 3:
                out.append(rf"\paragraph*{{{title}}}\par\smallskip")
            else:
                out.append(rf"\subparagraph*{{{title}}}\par\smallskip")
            out.append("")
            index += 1
            continue
        if is_table_row(line):
            table: list[list[str]] = []
            while index < len(lines) and is_table_row(lines[index]):
                if not is_table_separator(lines[index]):
                    table.append(split_table_row(lines[index]))
                index += 1
            out.append(render_table(table, path))
            continue
        if is_list_line(line):
            rendered, index = render_list(lines, index, path)
            out.append(rendered)
            continue
        if stripped.startswith(">"):
            quote: list[str] = []
            while index < len(lines) and lines[index].strip().startswith(">"):
                quote.append(re.sub(r"^\s*>\s?", "", lines[index]))
                index += 1
            out += [r"\begin{quote}\small\color{PockitMuted}", inline(" ".join(quote), path), r"\end{quote}"]
            continue
        if re.fullmatch(r"(?:---+|\*\*\*+|___+)\s*", stripped):
            out += [r"\medskip\hrule\medskip"]
            index += 1
            continue

        paragraph: list[str] = []
        while index < len(lines) and not is_block_start(lines, index):
            paragraph.append(lines[index].rstrip())
            index += 1
        if not paragraph:
            # Consume malformed/unsupported Markdown one line at a time rather than loop forever.
            out.append(inline(line.strip(), path) + r"\par")
            index += 1
        else:
            joined = " ".join(piece.strip() for piece in paragraph)
            out += [r"\noindent " + inline(joined, path) + r"\par"]
    return "\n".join(out)


EVIDENCE_REGISTER = {
    "E01": (r"\path{apps/server/src/auth.test.ts}", "HTTP authentication and session tests"),
    "E02": (r"\path{packages/api/src/routers/finance.test.ts}", "finance authorization and ledger tests"),
    "E03": (r"\path{packages/api/src/routers/admin.test.ts}", "Administrator access-management tests"),
    "E04": (r"\path{apps/server/src/seed-data.test.ts}", "synthetic seed tests"),
    "E05": (r"\path{packages/api/src/finance/value.test.ts}", "exact-money and date validation tests"),
    "E06": (r"\path{packages/api/src/routers/finance.test.ts}", "database-backed finance journey and rejection tests"),
    "E07": (r"\path{apps/server/src/finance-persistence.test.ts}", "fresh-client persistence test"),
    "E08": (r"\path{apps/web/src/components/finance-dashboard.test.tsx}", "finance UI component tests"),
    "E09": (r"\path{apps/web/src/components/sign-in-form.test.tsx}", "login UI tests"),
    "E10": (r"\path{apps/web/src/components/admin-user-management.test.tsx}", "Administrator UI test"),
    "E11": (r"\path{apps/web/src/utils/user-scoped-query-key.test.ts}", "cross-User cache isolation test"),
    "E12": (r"\path{docs/testing/sprint1-software-test-specification.md}", "full AC/test mapping and execution record"),
    "E13": (r"\textsf{Selected GitHub records}", "review, integration, release, and board links"),
}

TEST_EVIDENCE = {
    "AUTH": {number: ("E01",) for number in range(1, 12)},
    "AUTHZ": {
        1: ("E02",), 2: ("E02",), 3: ("E02",), 4: ("E02",), 5: ("E02",),
        6: ("E03",), 7: ("E03",), 8: ("E02", "E03"), 9: ("E03",),
    },
    "SEED": {number: ("E04",) for number in range(1, 5)},
    "OPEN": {
        1: ("E06",), 2: ("E06",), 3: ("E02", "E06"),
        4: ("E05",), 5: ("E05", "E06"), 6: ("E05", "E06"),
    },
    "RECEIVE": {
        1: ("E06",), 2: ("E06",), 3: ("E06",), 4: ("E02", "E06"),
        5: ("E05", "E06"), 6: ("E07",),
    },
    "CARD": {
        1: ("E06", "E08"), 2: ("E06",), 3: ("E06",),
        4: ("E02", "E06"), 5: ("E06", "E07"), 6: ("E06",), 7: ("E06", "E08"),
    },
    "VIEW": {
        1: ("E06", "E08"), 2: ("E06", "E08"), 3: ("E06", "E08"),
        4: ("E02",), 5: ("E07",), 6: ("E06",),
    },
    "INT": {1: ("E02", "E06"), 2: ("E05", "E06"), 3: ("E01", "E02", "E04")},
    "UI": {1: ("E09",), 2: ("E08",), 3: ("E03", "E10"), 4: ("E11",)},
}


def planned_ids(text: str) -> list[str]:
    found: list[str] = []
    pattern = re.compile(r"STS-([A-Z]+)-(\d{2})(?:\s*[–-]\s*(\d{2}))?")
    for match in pattern.finditer(text):
        family, first, last = match.groups()
        first_number = int(first)
        last_number = int(last) if last else first_number
        for number in range(first_number, last_number + 1):
            token = f"STS-{family}-{number:02d}"
            if token not in found:
                found.append(token)
    return found


def render_ac_crosswalk(sts_path: Path) -> str:
    text = sts_path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    rows: list[list[str]] = []
    in_matrix = False
    for line in text.splitlines():
        if line.startswith("| Acceptance criterion |"):
            in_matrix = True
            continue
        if in_matrix and line.startswith("## 6."):
            break
        if in_matrix and is_table_row(line) and not is_table_separator(line):
            cells = split_table_row(line)
            if len(cells) >= 3 and re.match(r"^F\d-AC-\d{2}", cells[0]):
                rows.append(cells[:3])
    if len(rows) != 43:
        raise ValueError(f"Expected 43 stable Sprint 1 AC rows, found {len(rows)}")

    used_tests = {
        (token.split("-")[1], int(token.split("-")[2]))
        for _, tests, _ in rows
        for token in planned_ids(tests)
    }
    unknown_tests = {
        test for test in used_tests
        if test[0] not in TEST_EVIDENCE or test[1] not in TEST_EVIDENCE[test[0]]
    }
    used_evidence = {
        reference
        for family_map in TEST_EVIDENCE.values()
        for references in family_map.values()
        for reference in references
    }
    unknown_evidence = used_evidence - EVIDENCE_REGISTER.keys()
    if unknown_tests or unknown_evidence:
        raise ValueError(f"Missing crosswalk evidence mappings: {unknown_tests | unknown_evidence}")

    out = [
        r"\subparagraph*{Actual test evidence register}",
        r"\noindent\small Evidence keys resolve to source files and representative test cases or process artifacts.\\[-2pt]",
        r"\setlength{\tabcolsep}{2pt}",
        r"\renewcommand{\arraystretch}{1.02}",
        r"\begin{longtable}{@{}>{\raggedright\arraybackslash}p{0.07\textwidth}>{\raggedright\arraybackslash}p{0.86\textwidth}@{}}",
        r"\toprule",
        r"\textbf{Ref.} & \textbf{Actual test or process evidence} \\",
        r"\midrule",
        r"\endfirsthead",
        r"\toprule",
        r"\textbf{Ref.} & \textbf{Actual test or process evidence} \\",
        r"\midrule",
        r"\endhead",
        r"\midrule\multicolumn{2}{r}{\footnotesize Continued on next page} \\",
        r"\endfoot",
        r"\bottomrule",
        r"\endlastfoot",
    ]
    for reference, (source, description) in EVIDENCE_REGISTER.items():
        if source.startswith(r"\path{"):
            source_path = source[len(r"\path{") : -1]
            ref = "feature/working-sprint1" if reference == "E12" else "28a0093535eb36d93f3d05dc2527d30cd4ccb32a"
            url = GITHUB_REPO + "/blob/" + ref + "/" + quote(source_path, safe="/-._")
            source = r"\href{" + href_url(url) + "}{" + source + "}"
        elif reference == "E13":
            sources = [
                ("Issue \\#5", GITHUB_REPO + "/issues/5"),
                ("Issue \\#7", GITHUB_REPO + "/issues/7"),
                ("Issue \\#8", GITHUB_REPO + "/issues/8"),
                ("PR \\#20", GITHUB_REPO + "/pull/20"),
                ("PR \\#22", GITHUB_REPO + "/pull/22"),
                ("PR \\#27", GITHUB_REPO + "/pull/27"),
            ]
            source = "; ".join(
                r"\href{" + href_url(url) + "}{" + label + "}"
                for label, url in sources
            )
        out.append(r"\textbf{" + reference + "} & " + source + ": " + tex_escape(description) + r" \\")
    out += [
        r"\end{longtable}",
        r"\medskip",
        r"\noindent\small All 43 stable criteria are retained. Evidence keys resolve above; outcomes follow the recorded STS result.\par",
        r"\setlength{\tabcolsep}{2pt}",
        r"\renewcommand{\arraystretch}{1.04}",
        r"\begin{longtable}{@{}>{\raggedright\arraybackslash}p{0.085\textwidth}>{\raggedright\arraybackslash}p{0.46\textwidth}>{\raggedright\arraybackslash}p{0.22\textwidth}>{\raggedright\arraybackslash}p{0.12\textwidth}@{}}",
        r"\toprule",
        r"\textbf{AC} & \textbf{Planned STS IDs} & \textbf{Actual evidence ref.} & \textbf{Result} \\",
        r"\midrule",
        r"\endfirsthead",
        r"\toprule",
        r"\textbf{AC} & \textbf{Planned STS IDs} & \textbf{Actual evidence ref.} & \textbf{Result} \\",
        r"\midrule",
        r"\endhead",
        r"\midrule\multicolumn{4}{r}{\footnotesize Continued on next page} \\",
        r"\endfoot",
        r"\bottomrule",
        r"\endlastfoot",
    ]
    for ac, tests, actual in rows:
        if ac.startswith("F8-AC-05"):
            references = {"E12": None}
        elif ac.startswith("F8-AC-06"):
            references = {"E13": None}
        else:
            references = dict.fromkeys(
                reference
                for token in planned_ids(tests)
                for reference in TEST_EVIDENCE[token.split("-")[1]][int(token.split("-")[2])]
            )
        status = "PARTIAL" if actual.lstrip().startswith("Partial") else "PENDING" if actual.lstrip().startswith("Pending") else "PASS" if actual.lstrip().startswith("Pass") else "CHECK"
        out.append(
            inline(ac.split(" — ", 1)[0]) + " & " + inline(tests) + " & " + inline(", ".join(references))
            + " & " + inline(status) + r" \\"
        )
    out += [r"\end{longtable}", r"\normalsize", r"\setlength{\tabcolsep}{6pt}", r"\renewcommand{\arraystretch}{1.15}"]
    return "\n".join(out) + "\n"


def _read_source(relative_path: str) -> tuple[Path, str]:
    path = ROOT / relative_path
    return path, path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")


def _section(text: str, title: str) -> str:
    lines = text.splitlines()
    start = None
    depth = 0
    for index, line in enumerate(lines):
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if match and title in match.group(2):
            start = index
            depth = len(match.group(1))
            break
    if start is None:
        raise ValueError(f"Markdown section not found: {title}")
    end = len(lines)
    for index in range(start + 1, len(lines)):
        match = re.match(r"^(#{1,6})\s+", lines[index])
        if match and len(match.group(1)) <= depth:
            end = index
            break
    return "\n".join(lines[start:end]).strip()


def _first_table(section: str) -> list[list[str]]:
    lines = section.splitlines()
    for index, line in enumerate(lines):
        if not is_table_row(line):
            continue
        rows: list[list[str]] = []
        while index < len(lines) and is_table_row(lines[index]):
            if not is_table_separator(lines[index]):
                rows.append(split_table_row(lines[index]))
            index += 1
        return rows
    raise ValueError("Expected a Markdown table in section")


def _markdown_table(rows: list[list[str]], columns: list[int] | None = None) -> str:
    if columns is not None:
        rows = [[row[column] if column < len(row) else "" for column in columns] for row in rows]
    if not rows:
        return ""
    width = max(len(row) for row in rows)
    normalized = [row + [""] * (width - len(row)) for row in rows]
    separator = ["---"] * width
    return "\n".join("| " + " | ".join(row) + " |" for row in [normalized[0], separator, *normalized[1:]])


def _diagram(section: str) -> str:
    match = re.search(r"```mermaid\s*\n(.*?)\n```", section, flags=re.DOTALL)
    if not match:
        raise ValueError("Expected Mermaid diagram in source section")
    return "```mermaid\n" + match.group(1) + "\n```"


def _first_paragraph(section: str) -> str:
    lines = section.splitlines()[1:]
    paragraph: list[str] = []
    for line in lines:
        if not line.strip():
            if paragraph:
                break
            continue
        if line.lstrip().startswith(("#", "|", "-", "*", ">", "```")):
            if paragraph:
                break
            continue
        paragraph.append(line.strip())
    return " ".join(paragraph)


def _field(section: str, label: str) -> str:
    lines = section.splitlines()
    pattern = re.compile(r"^\*\*" + re.escape(label) + r":\*\*\s*(.*)$")
    for index, line in enumerate(lines):
        match = pattern.match(line.strip())
        if not match:
            continue
        value = [match.group(1).strip()]
        for following in lines[index + 1 :]:
            if not following.strip():
                break
            if following.lstrip().startswith(("**", "- **")):
                break
            value.append(following.strip())
        return " ".join(part for part in value if part)
    raise ValueError(f"Expected contract field: {label}")


def _feature_sections(text: str) -> list[tuple[str, str]]:
    lines = text.splitlines()
    starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        if re.match(r"^### FEAT-0[1-8]\s+—", line):
            starts.append((index, line[4:].strip()))
    sections = []
    for item, (start, title) in enumerate(starts):
        end = starts[item + 1][0] if item + 1 < len(starts) else len(lines)
        block = "\n".join(lines[start:end]).strip()
        # The feature traceability table follows FEAT-08 and is not part of its contract.
        block = re.split(r"\n## 4\. Feature-to-requirement traceability", block, maxsplit=1)[0]
        sections.append((title, block))
    if len(sections) != 8:
        raise ValueError(f"Expected eight Sprint 1 feature contracts, found {len(sections)}")
    return sections


def _acceptance_rows(feature_sections: list[tuple[str, str]]) -> list[list[str]]:
    rows: list[list[str]] = [["Acceptance ID", "Acceptance criterion"]]
    for _, section in feature_sections:
        active = False
        for line in section.splitlines():
            if line.strip() == "**Acceptance criteria:**":
                active = True
                continue
            if active and line.startswith("**Definition of Done"):
                active = False
            if active:
                match = re.match(r"\s*-\s+\*\*(F\d-AC-\d{2}):\*\*\s*(.*)", line)
                if match:
                    rows.append([match.group(1), match.group(2).strip()])
    if len(rows) != 44:
        raise ValueError(f"Expected 43 Sprint 1 acceptance criteria, found {len(rows) - 1}")
    return rows


def _part_a() -> tuple[Path, str]:
    path, srs = _read_source("docs/requirements/srs.md")
    actors = _first_table(_section(srs, "2. Actors and responsibilities"))
    functional = _first_table(_section(srs, "3. Functional requirements"))
    business = _first_table(_section(srs, "4. Business rules"))
    nfr = _first_table(_section(srs, "5. Non-functional requirements"))
    open_questions = _first_table(_section(srs, "8. Open questions and recorded decisions"))
    validation = _first_table(_section(srs, "9. Requirements validation checklist"))
    sprint_scope = _section(srs, "Sprint 1 — required minimum vertical slice")
    body = _first_paragraph(sprint_scope)
    content = f"""# Software requirements specification

**Source:** [SRS](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/requirements/srs.md), [Issue #3](https://github.com/ovenmakemeheat/Pockit/issues/3).

## Product and scope

Pockit is a persistent multi-User personal-finance system. Users manage only their own financial records. Administrators manage platform access and cannot view or modify financial data.

| Scope | Included behavior |
| --- | --- |
| Product | Authentication, owned financial Accounts and Transactions, exact allocation, balances, summaries, category spending, history, favorites, and duplication. |
| Excluded | Period/shared budgets, recurring transactions, bank integration, real payment or messaging integrations, self-registration, password recovery, email verification, and advanced administration unless approved. |

## Actors

{_markdown_table(actors)}

## Functional requirements

{_markdown_table(functional)}

## Business rules

{_markdown_table(business)}

## Non-functional requirements

{_markdown_table(nfr)}

## Sprint 1 acceptance scope

{body}

## Assumptions and boundaries

| ID | Assumption or boundary |
| --- | --- |
| A-01 | Theme 7 and approved project instructions define scope; the Sprint 1 example is a minimum vertical slice. |
| A-02 | Seeded synthetic identities are sufficient; persistent PostgreSQL records and server-side authorization are required. |
| A-03 | Two roles are defined: User and Administrator. Administrator financial-data exclusion is absolute. |
| A-04 | Money/date decisions and unresolved questions remain recorded under OQ-01–OQ-07; later behavior is not inferred. |

## Open decisions

{_markdown_table(open_questions)}

## SRS content checks

{_markdown_table(validation)}
"""
    return path, content


def _part_b() -> tuple[Path, str]:
    path, inventory = _read_source("docs/requirements/feature-inventory.md")
    features = _first_table(_section(inventory, "1. Feature inventory"))
    matrix = _first_table(_section(inventory, "2. Requirement-to-feature-to-sprint matrix"))
    validation = _first_table(_section(inventory, "4. Inventory validation"))
    gaps = [
        ["Open item", "Treatment / follow-up"],
        ["Sprint 2/3 allocation", "Proposed only; confirm in team sprint planning."],
        ["Reports", "FEAT-14 is provisional; confirm whether FR-10 defines report scope before contracting it."],
        ["Transaction correction", "FEAT-12 is gated by OQ-04; decide correction and audit behavior first."],
        ["Currency, date, limits", "Apply recorded Sprint 1 policies only; future currency/period/limit behavior remains open."],
    ]
    content = f"""# Feature inventory and traceability

**Source:** [Feature inventory](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/requirements/feature-inventory.md), [Issue #4](https://github.com/ovenmakemeheat/Pockit/issues/4).

The SRS defines 32 requirement IDs: 14 FRs, 11 BRs, and 7 NFRs. Every ID maps to a feature. Sprint 2 and 3 allocations remain proposed.

## Feature inventory

{_markdown_table(features, [0, 1, 2, 3])}

## Requirement-to-feature-to-sprint matrix

{_markdown_table(matrix, [0, 1, 2])}

## Coverage gaps and decisions

{_markdown_table(gaps)}

## Inventory validation

{_markdown_table(validation)}
"""
    return path, content


def _part_c() -> tuple[Path, str]:
    path, sds = _read_source("docs/architecture/system-level-sds.md")
    current = _first_table(_section(sds, "1.1 Current implementation"))
    responsibilities = _first_table(_section(sds, "2.2 Responsibilities"))
    entities = _first_table(_section(sds, "3.1 Entities"))
    accounts = _first_table(_section(sds, "3.2 Five Account types"))
    forms = _first_table(_section(sds, "4.1 Transaction forms"))
    balances = _first_table(_section(sds, "4.2 Balance and summary calculation"))
    api = _first_table(_section(sds, "5.2 Planned API boundaries"))
    roles = _first_table(_section(sds, "6. Roles, permissions"))
    config = _first_table(_section(sds, "7.1 Configuration boundary"))
    traceability = _first_table(_section(sds, "10. Requirement-to-design traceability"))
    validations = _first_table(_section(sds, "11.2 SDS content validation"))
    decisions = _first_table(_section(sds, "12. Open questions and decision ownership"))
    tests = [
        ["Seam", "What it verifies"],
        ["API integration", "Observable results, authorization, validation, and persisted state."],
        ["PostgreSQL integration", "Persistence, exact values, atomicity, and derived balances."],
        ["HTTP/Auth", "Session transport and protected-request behavior."],
        ["UI workflow", "Accessible visible behavior; never a substitute for API/DB evidence."],
    ]
    money = [
        ["Rule / decision", "Sprint 1 behavior"],
        ["OQ-01 Currency", "THB only at two fractional digits; other currencies and conversion remain open."],
        ["OQ-02 Precision", "Exact decimal strings/minor units; excess precision is rejected; no implicit rounding. See ADR-0001."],
        ["OQ-03 Date", "Explicit YYYY-MM-DD; preserve without timezone conversion; summaries are all-time."],
        ["BR-04 Allocation", "One or more lines; exact allocation sum equals transaction total."],
        ["BR-05–BR-07 Balances", "Opening positions plus committed postings; transfers, borrowing, and repayments are not income/expense."],
        ["OQ-07 Amounts", "Positive amounts; reject repayment above debt and Cash outflow above available balance; no invented maximum."],
    ]
    deployment = [
        ["Environment", "Design"],
        ["Local", "Compose web/server containers and PostgreSQL 17 with a persistent volume; apply versioned migrations."],
        ["Lab 5 target", "Artifact Registry images; Cloud Run web/API; Cloud SQL PostgreSQL; Secret Manager; Cloud Logging; GitHub Actions with Workload Identity Federation."],
        ["Status", "Docker/GCP deployment is planned for Lab 5, not a Sprint 1 cloud prerequisite."],
    ]
    content = f"""# System-level design specification

**Source:** [System-Level SDS](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/architecture/system-level-sds.md), [Issue #5](https://github.com/ovenmakemeheat/Pockit/issues/5), [ADR-0001](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/adr/0001-sprint1-money-and-date-policies.md), [ADR-0002](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/adr/0002-disabled-user-session-revocation.md).

## Architecture and boundaries

{_markdown_table(current)}

{_diagram(_section(sds, "2.1 Logical architecture"))}

{_markdown_table(responsibilities)}

## Data model

{_markdown_table(entities)}

{_diagram(_section(sds, "3.1 Entities and relationships"))}

{_markdown_table(accounts)}

## Transactions and balances

{_markdown_table(forms)}

The ledger in PostgreSQL is authoritative. Create each Transaction and all allocation lines atomically. Account and category values derive from opening positions plus committed postings.

{_markdown_table(balances)}

## UI, API, and money representation

| Area | Boundary |
| --- | --- |
| User UI | Login, owned Accounts/Transactions, dashboard, summaries, category spending, history; later favorites and duplication. |
| Administrator UI | Platform User access only; no finance screens or queries. |
| Money transport | Base-10 decimal strings; exact integer-minor-unit/decimal arithmetic and PostgreSQL NUMERIC/Prisma Decimal; never JavaScript floating point. |

{_markdown_table(api)}

## Roles and privacy

{_markdown_table(roles)}

Every finance query uses the session-derived owner. Deny Administrator finance access at API boundaries, including direct IDs and summary endpoints.

## Configuration and sessions

{_markdown_table(config)}

Better Auth stores sessions in PostgreSQL. Logout invalidates the session. Disabled Users cannot create sessions; disablement deletes stored sessions, and protected requests recheck current User status. See ADR-0002.

## Deployment

{_markdown_table(deployment)}

## Money decisions

{_markdown_table(money)}

OQ-04 correction/audit behavior and OQ-06 measurable quality targets remain open. See Part A for all recorded OQ statuses.

## Requirement-to-design map

{_markdown_table(traceability)}

## Verification seams and content checks

{_markdown_table(tests)}

{_markdown_table(validations)}

## Decision ownership

{_markdown_table(decisions)}
"""
    return path, content


def _part_d() -> tuple[Path, str]:
    path, plan = _read_source("docs/planning/three-sprint-plan.md")
    goals = _first_table(_section(plan, "2. Sprint goals and proposed scope"))
    gates = _first_table(_section(plan, "5. Verification and release gates"))
    validation = _first_table(_section(plan, "7. Plan validation"))
    milestones = [
        ["Checkpoint", "Required outcome"],
        ["8 Nov 2026", "Deliverable 1: baseline and Sprint 1 working journey."],
        ["22 Nov 2026", "Lab 5: deployed Sprint 1 and repeatable delivery."],
        ["29 Nov 2026", "Deliverable 2; product substantially complete."],
        ["13 Dec 2026", "Final product, report, and demo video."],
    ]
    dependencies = [
        ["Order", "Feature IDs", "Dependency / gate"],
        ["Sprint 1", "FEAT-01/02 → FEAT-03 → FEAT-04 → FEAT-05/06 → FEAT-07", "FEAT-08 applies throughout; complete the authenticated, authorized, persistent minimum journey."],
        ["Sprint 2", "FEAT-09 → FEAT-10 → FEAT-11", "FEAT-12 requires approved OQ-04 correction/audit behavior."],
        ["Sprint 3", "FEAT-13; FEAT-14", "Confirm report scope for FEAT-14 before its feature contract."],
    ]
    content = f"""# Three-sprint product plan

**Source:** [Three-sprint plan](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/planning/three-sprint-plan.md), [Issue #6](https://github.com/ovenmakemeheat/Pockit/issues/6).

Later-sprint allocations are proposals, not fixed commitments. Actual sprint dates and capacity are set by the team; no estimates are invented.

## Sprint goals and exit outcomes

{_markdown_table(goals, [0, 1, 2, 3])}

## Dependencies and decision gates

{_markdown_table(dependencies)}

## Course checkpoints

{_markdown_table(milestones)}

## Verification and release gates

{_markdown_table(gates)}

## Plan validation

{_markdown_table(validation)}
"""
    return path, content


def _part_e() -> tuple[Path, str]:
    feature_path, features = _read_source("docs/features/sprint1-feature-contracts.md")
    sts_path, sts = _read_source("docs/testing/sprint1-software-test-specification.md")
    feature_sections = _feature_sections(features)
    ac_table = _markdown_table(_acceptance_rows(feature_sections))
    shared_roles = _first_table(_section(features, "2.1 Actors and permission boundary"))
    decision_rows = _first_table(_section(features, "2.3 Open decisions"))
    feature_traceability = _first_table(_section(features, "4. Feature-to-requirement traceability"))
    test_levels = _first_table(_section(sts, "2. Test levels"))
    planned_tests: list[list[str]] = []
    for heading in (
        "4.1 Authentication and session", "4.2 Server-side roles", "4.3 Synthetic seed",
        "4.4 Opening balance", "4.5 Salary receipt", "4.6 Split credit-card",
        "4.7 Financial views", "4.8 Cross-cutting integrity",
    ):
        table = _first_table(_section(sts, heading))
        if not planned_tests:
            planned_tests.append(["Test ID", "Level", "Setup and action", "Expected result", "Acceptance IDs"])
        planned_tests.extend(table[1:])
    if len(planned_tests) != 57:
        raise ValueError(f"Expected 56 planned STS cases, found {len(planned_tests) - 1}")
    contract_summaries = {
        "FEAT-01": (
            "Seeded Users and Administrators sign in, resolve their own identity, and log out. Public registration and recovery are excluded.",
            "Use Better Auth login and PostgreSQL sessions. Identity comes from the server session; passwords are hashed and cookies follow trusted-origin/security settings.",
            "Project Setup #9; Better Auth/Prisma; ADR-0002 session revocation.",
            "STS-AUTH: verify valid/invalid login, identity, logout, disabled-user revocation, and credential safety over HTTP/PostgreSQL.",
        ),
        "FEAT-02": (
            "Users access only their own finance records. Administrators manage platform access but never finance data.",
            "Enforce role and ownership in tRPC/API operations for direct IDs, filters, nested Accounts, and summaries. Admin responses contain identity/access fields only.",
            "FEAT-01; ADR-0002; session and owner checks are server-authoritative.",
            "STS-AUTHZ: verify owned access, cross-User denial, unauthenticated denial, Admin operations, and Admin finance denial at the API boundary.",
        ),
        "FEAT-03": (
            "Provide synthetic User/Admin identities, bank/Cash and card/Loan Taken Accounts, Income, and at least two Expense categories.",
            "Seed through the normal auth and finance paths. Records have explicit owners; reruns are additive/idempotent and do not reset unrelated data.",
            "Project Setup #9; FEAT-01/02; ADR-0001/0002.",
            "STS-SEED: verify a fresh seed, owner isolation, safe repeat runs, and synthetic-only fixtures.",
        ),
        "FEAT-04": (
            "Record the opening Cash position and explicit dates for Sprint 1 Transactions.",
            "Persist an exact THB opening balance on the seeded Cash Account. Require YYYY-MM-DD dates; do not turn the opening position into Income.",
            "FEAT-03; ADR-0001; posted-baseline correction remains gated by OQ-04.",
            "STS-OPEN: verify persistence, unchanged date round-trip, precision, ownership, Account type, and positive-amount rejection.",
        ),
        "FEAT-05": (
            "Record salary received into Cash with an Income allocation and correct persisted effects.",
            "Submit receiving Cash Account, date, total, and one or more Income lines as decimal strings; reject mismatches atomically.",
            "FEAT-01–FEAT-04; ADR-0001/0002.",
            "STS-RECEIVE: verify salary, exact balance/category effects, persistence, and invalid-write rollback.",
        ),
        "FEAT-06": (
            "Record a Loan Taken card purchase allocated to Expense categories, then repay it from Cash. The demo splits one purchase across two categories.",
            "Persist explicit-date payment/charge and repayment Transactions. Enforce account types, exact totals, positive amounts, available Cash, and outstanding debt.",
            "FEAT-01–FEAT-05; ADR-0001/0002.",
            "STS-CARD: verify split and one-line purchases, repayment, balances, category totals, and unchanged state after rejection.",
        ),
        "FEAT-07": (
            "Show persisted Cash/debt balances, Income/Expense totals, seeded-category spending, and Transaction history.",
            "Use owner-scoped API reads from PostgreSQL. Sprint 1 summaries are all-time; opening balances, borrowing, and repayments are not Income/Expense.",
            "FEAT-04–FEAT-06; ADR-0001/0002.",
            "STS-VIEW: compare summary/history with persisted records and verify a fresh-client read.",
        ),
        "FEAT-08": (
            "Apply privacy, exact money, persistence, atomicity, synthetic-data safety, and evidence rules across all features.",
            "Backend authorization and PostgreSQL are authoritative; monetary values use exact decimal strings; rejected writes leave no partial state.",
            "Continuous across FEAT-01–FEAT-14; unresolved decisions remain explicit gates.",
            "STS-INT/UI and the 43-row AC-to-test map; preserve TDD evidence and tested commits for meaningful changes.",
        ),
    }
    feature_contracts = []
    for title, _section_text in feature_sections:
        feature_id = title[:7]
        outcome, interface, dependencies, dod = contract_summaries[feature_id]
        feature_contracts.append(
            f"### {title}\n\n| Contract | Summary |\n| --- | --- |\n"
            f"| Outcome | {outcome} |\n| UI/API/data | {interface} |\n"
            f"| Dependencies/gates | {dependencies} |\n| DoD/evidence | {dod} |"
        )
    content = f"""# Sprint 1 feature contracts and test specification

**Sources:** [Feature contracts](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/features/sprint1-feature-contracts.md), [STS](https://github.com/ovenmakemeheat/Pockit/blob/main/docs/testing/sprint1-software-test-specification.md), [Issue #7](https://github.com/ovenmakemeheat/Pockit/issues/7), [Issue #8](https://github.com/ovenmakemeheat/Pockit/issues/8).

This section summarizes FEAT-01–FEAT-08. It retains every acceptance and test ID; implementation history and actual results are in Part F and the linked Issues/PRs.

## Shared permission contract

{_markdown_table(shared_roles)}

## Shared data and API rules

| Contract | Required behavior |
| --- | --- |
| Identity | Derive User, role, and enabled status from the validated server session; ignore client-supplied owner/role authority. |
| Data | PostgreSQL is the source of truth. Transactions and allocations persist together or not at all. |
| Money | Use decimal strings across JSON and exact arithmetic/storage; no binary floating-point. Apply recorded Sprint 1 precision and date policies. |
| Ownership | Check source, receiver, allocation, filter, and direct-record IDs against the session owner. |
| Evidence | For rejected writes, verify no transaction, allocation, balance, category, summary, or history change. |

## Open feature decisions

{_markdown_table(decision_rows)}

## Feature-level contracts

{"\n\n".join(feature_contracts)}

## Feature-to-requirement traceability

{_markdown_table(feature_traceability)}

## Acceptance criteria

{ac_table}

## Test strategy

Tests assert observable API/HTTP/UI results and database state, not private implementation. Use PostgreSQL-backed API tests for ownership, business rules, atomicity, and persistence; HTTP/Auth tests for session behavior; UI tests for accessible visible behavior. Mock-only tests do not prove persistence or authorization.

{_markdown_table(test_levels)}

Prior art: tRPC caller tests in `packages/api/src/routers/index.test.ts`, Elysia `app.handle()` tests in `apps/server/src/app.test.ts`, PostgreSQL tests in `packages/db/src/index.test.ts`, and React Testing Library in `apps/web/src/components/button.test.tsx`.

## Planned software test cases

The STS defines {len(planned_tests) - 1} cases across authentication, authorization, seeding, opening balances/dates, salary, card purchase/repayment, financial views, integrity, and UI behavior. Each row records setup/action, expected result, test seam, and covered acceptance IDs.

{_markdown_table(planned_tests)}
"""
    return feature_path, content


def _stable_ids(text: str) -> set[str]:
    return set(re.findall(
        r"\b(?:FR|BR|NFR|OQ|FEAT|SRS-AC|SRS-VAL|INV-VAL|SDS-VAL|PLAN-VAL|F\d-AC|STS-[A-Z]+)-\d{2}\b",
        text,
    ))


def build_engineering_content() -> str:
    parts = [
        ("A", "Part A: SRS and product scope", _part_a()),
        ("B", "Part B: Feature inventory and traceability", _part_b()),
        ("C", "Part C: System-level design specification", _part_c()),
        ("D", "Part D: Three-sprint plan", _part_d()),
        ("E", "Part E: Sprint 1 engineering contracts", _part_e()),
    ]
    generated = [
        "% Generated from canonical source documents; do not edit by hand.",
        "% Regenerate with build_report.py.",
    ]
    expected: set[str] = set()
    for relative_path in [item[2][0] for item in parts]:
        expected |= _stable_ids(relative_path.read_text(encoding="utf-8-sig"))
    # Part E also draws its acceptance and test identifiers from the two linked sources.
    for relative in ("docs/features/sprint1-feature-contracts.md", "docs/testing/sprint1-software-test-specification.md"):
        expected |= _stable_ids((ROOT / relative).read_text(encoding="utf-8-sig"))

    for letter, title, (source_path, markdown) in parts:
        generated += [
            r"\clearpage",
            rf"\section{{{inline(title)}}}",
            rf"\label{{part:{letter}:start}}",
            render_markdown_text(markdown, source_path),
            rf"\label{{part:{letter}:end}}",
        ]
    result = "\n".join(generated) + "\n"
    missing = expected - _stable_ids(result)
    if missing:
        raise ValueError("Concise report omitted stable IDs: " + ", ".join(sorted(missing)))
    return result


def main() -> int:
    engineering = build_engineering_content()
    (OUT / "engineering-content.tex").write_text(engineering, encoding="utf-8")
    sts = ROOT / "docs/testing/sprint1-software-test-specification.md"
    (OUT / "ac-test-results.tex").write_text(render_ac_crosswalk(sts), encoding="utf-8")
    print(f"Generated concise Parts A–E with complete stable-ID coverage and the 43-row AC/test crosswalk in {OUT}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001 - make a build failure visible to the user
        print(f"Report generation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
