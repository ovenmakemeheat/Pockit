# CPE 334 project deliverable 1 report

This folder contains the LaTeX source and [compiled PDF](project-deliverable-1.pdf) for Pockit's Deliverable 1. Parts A to E provide concise, table-driven summaries with all stable IDs, generated from the [SRS](../../requirements/srs.md), [feature inventory](../../requirements/feature-inventory.md), [System-Level SDS](../../architecture/system-level-sds.md), [three-sprint plan](../../planning/three-sprint-plan.md), [Sprint 1 feature contracts](../../features/sprint1-feature-contracts.md), and [Software Test Specification](../../testing/sprint1-software-test-specification.md). Part F records the release, test evidence, demo, contributions, and limitations. Detailed history remains in linked Issues and PRs.

The [assignment PDF](../../assignments/final/project_deliverable_1_v1.pdf) defines the submission requirements.

## Build

Install Python 3, XeLaTeX, and `latexmk`. Python uses only the standard library.

From the repository root, run:

```sh
cd docs/deliverables/project-deliverable-1
python -m unittest test_build_report.py
cd ../../..
python docs/deliverables/project-deliverable-1/build_report.py
cd docs/deliverables/project-deliverable-1
latexmk -xelatex -interaction=nonstopmode -halt-on-error project-deliverable-1.tex
```

The generator selects required tables and contract/test cases from the Markdown sources, checks stable-ID coverage, and writes `engineering-content.tex` and `ac-test-results.tex`. It converts the SDS Mermaid diagrams into TikZ figures; unsupported or changed diagrams fail the build instead of printing raw Mermaid code. `latexmk` writes `project-deliverable-1.pdf`. Rebuild after source edits so page navigation and content stay current.

## Submission status

The report is ready for final team review. Part F includes four genuine captures from the local app, an AI-use table with techniques and paraphrased prompt examples, and a fresh Bun 1.4.4 root-suite run. The test output is retained in `evidence/workspace-test-output.txt`; the PDF contains readable package summaries. All captures use synthetic demo data and show no credentials or financial records belonging to other Users. The student started the app; the assistant did not start or stop development servers. Known TDD evidence gaps remain disclosed in the PDF.

The demo password stays in the ignored local environment file.
