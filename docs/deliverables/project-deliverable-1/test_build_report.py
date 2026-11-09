"""Tests for the self-contained Deliverable 1 report generator."""

from pathlib import Path
import unittest

import build_report


ROOT = Path(__file__).resolve().parents[3]
SDS = ROOT / "docs/architecture/system-level-sds.md"


class ReportGenerationTests(unittest.TestCase):
    def test_concise_parts_retain_all_stable_ids(self) -> None:
        rendered = build_report.build_engineering_content()
        sources = [
            "docs/requirements/srs.md",
            "docs/requirements/feature-inventory.md",
            "docs/architecture/system-level-sds.md",
            "docs/planning/three-sprint-plan.md",
            "docs/features/sprint1-feature-contracts.md",
            "docs/testing/sprint1-software-test-specification.md",
        ]
        expected = set()
        for source in sources:
            expected |= build_report._stable_ids((ROOT / source).read_text(encoding="utf-8-sig"))
        self.assertFalse(expected - build_report._stable_ids(rendered), expected - build_report._stable_ids(rendered))
        self.assertNotIn("Actual execution record", rendered)
        self.assertIn("FEAT-14", rendered)
        self.assertIn("SDS-VAL-07", rendered)
        self.assertIn("PLAN-VAL-06", rendered)

    def test_all_56_planned_sts_cases_are_included(self) -> None:
        rendered = build_report.build_engineering_content()
        sts = (ROOT / "docs/testing/sprint1-software-test-specification.md").read_text(encoding="utf-8-sig")
        expected = {token for token in build_report._stable_ids(sts) if token.startswith("STS-")}
        actual = {token for token in build_report._stable_ids(rendered) if token.startswith("STS-")}
        self.assertEqual(expected, actual)
        self.assertEqual(len(expected), 56)

    def test_report_records_ai_techniques_and_representative_prompts(self) -> None:
        report = Path(__file__).with_name("project-deliverable-1.tex").read_text(encoding="utf-8")

        for phrase in (
            "AI-use record",
            "representative paraphrases, not a transcript",
            "Source-grounded extraction and synthesis",
            "Code and test drafting",
            "Error-driven diagnosis",
            "Scripted extraction, ID checks",
            "Representative prompt",
            "AI output was not treated as test evidence",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, report)

    def test_stable_ids_are_unbreakable_in_rendered_content(self) -> None:
        rendered = build_report.inline("**PLAN-VAL-01** and `STS-AUTHZ-11`")

        self.assertIn(r"\textbf{\mbox{PLAN-VAL-01}}", rendered)
        self.assertIn(r"\mbox{\texttt{STS-AUTHZ-11}}", rendered)

    def test_id_heavy_tables_reserve_readable_identifier_columns(self) -> None:
        check_table = build_report.render_table(
            [["Check ID", "Acceptance evidence", "Result"], ["PLAN-VAL-01", "Evidence", "PASS"]]
        )
        sts_table = build_report.render_table(
            [["Test ID", "Level", "Setup and action", "Expected result", "Acceptance IDs"],
             ["STS-AUTHZ-01", "API", "Setup", "Expected", "F2-AC-01"]]
        )

        self.assertIn(r"p{0.150\textwidth}", check_table)
        self.assertIn(r"p{0.150\textwidth}", sts_table)


class MermaidRenderingTests(unittest.TestCase):
    def test_sds_mermaid_diagrams_render_as_figures_not_source_listings(self) -> None:
        rendered = build_report.render_markdown(SDS)

        self.assertEqual(rendered.count(r"\begin{tikzpicture}"), 2)
        self.assertNotIn("flowchart LR", rendered)
        self.assertNotIn("erDiagram", rendered)
        self.assertIn("React / TanStack Start", rendered)
        self.assertIn("PostgreSQL", rendered)
        self.assertIn("Allocation line", rendered)

    def test_unsupported_mermaid_type_fails_instead_of_printing_source(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unsupported Mermaid diagram type"):
            build_report.render_mermaid(["sequenceDiagram", "A->>B: request"])


if __name__ == "__main__":
    unittest.main()
