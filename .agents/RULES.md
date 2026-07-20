# Agent Instructions & Project Rules

All AI agents operating in this workspace MUST strictly adhere to the following rules:

## 1. Phasing & Planning (Token/Credit Optimization)
*   **Always make a detailed plan** or perform work in discrete phases.
*   Break down complex changes into small, incremental, and manageable steps.
*   Do not try to solve everything in a single massive prompt or write all code at once.
*   Optimize token and credit usage by keeping file reads, commands, and edits targeted and precise.

## 2. GitHub Commits and Push Policy
*   **Do not push** to the remote GitHub repository unless explicitly instructed by the user.
*   GitHub Repository Link: `https://github.com/natanaelkumentas/jadwal-prioritas-otomatis.git`
*   Only commit or push when the user gives direct permission or instruction to do so.

## 3. Scope of Uploaded Files (Git hygiene)
*   **Only upload necessary files** to GitHub (i.e., files directly used by the Website).
*   Do not upload system files, log files, `.env` configurations, virtual environments (`.venv`, `venv`), caches (`__pycache__`), local session files, or other temporary files.
*   Use a `.gitignore` file to enforce this constraint automatically.

## 4. Software Design Principles
*   **Separation of Concerns (SoC)**: Ensure each file, module, or component focuses on a single concern or responsibility.
*   **Single Responsibility Principle (SRP)**: Any class, function, or module should have only one reason to change. Apply modularization to divide code into smaller, reusable files or modules.
*   **Don't Repeat Yourself (DRY)**: Reduce code duplication by extracting shared logic into common functions, helpers, or components.
*   Apply these principles to ensure the codebase remains clean, readable, easily testable, and maintainable.

## 5. Versioning & Logging Changes
*   **Always document all changes in [logs.md](file:///C:/Users/Asus/Documents/N-Dev/Bot/Telegram/Impostor Legacy/logs.md)**.
*   The project versioning starts at `0.0.0`.
*   All project versions must be documented in `logs.md` using the semantic versioning `x.y.z` style:
    *   **`x` (MAJOR)**: Breaking changes or incompatible API updates.
    *   **`y` (MINOR)**: Backward-compatible new features (e.g., new pages or features).
    *   **`z` (PATCH)**: Backward-compatible bug fixes, optimizations, or minor changes.
*   **Include both date and precise real-time** (e.g., `YYYY-MM-DD HH:MM:SS` or timezone-aware format) for every log entry.

## 6. Virtual Environment & Dependencies
*   **Use the project's virtual environment**: Always run Python commands, execute scripts, and install libraries using the Python interpreter and `pip` inside the virtual environment directory (e.g., `.venv` or `venv`).
*   **Do not install packages globally**: Always keep `requirements.txt` updated with any newly introduced dependencies, and install them in the virtual environment.

## 7. Internationalization (i18n)
*   **All user-facing static text MUST use translation keys** via `get_text()`. Never hardcode English strings in handler code.
*   **Always create new keys** in both `en` and `id` translation JSON files for any new static text.
*   **Button feedback popups** ("Loading...", "Too fast...") are handled centrally by the `callback_lock` wrapper in `main.py`. Do NOT call `query.answer()` inside individual callback handlers — the wrapper does it automatically.

## 8. Workspace Agent Rules
*   The `.agents/AGENTS.md` file MUST always reference `RULES.md` so the agent reads and follows it on every session.
*   Any new project-wide rules MUST be added to this `RULES.md` file, not scattered in code comments.

## 9. Core Document & Schema Sync
*   **Keep SUMMARY.md and logs.md up to date**: Any change to code features, workflows, or project milestones must be immediately documented in SUMMARY.md and logged in logs.md.
*   **Keep database schema files up to date**: Any schema changes, tables, or index additions must be updated in the `database/schema.sql` file.

## 10. File Line Limit Rule (Modularization Constraints)
*   **All files in the project directories MUST not exceed 1,000 lines**.
*   Preferably, keep the line length of each file **under or around 500 lines**.
*   Apply the Separation of Concerns (SoC) and Single Responsibility Principle (SRP) to decompose large modules/components/files into sub-packages or mixin components immediately when they grow close to or exceed 500 lines.

## 11. Refactoring, SoC, and Modularization Rules
*   **Refactoring & SoC**: When a file contains unrelated tasks, split it immediately. Do not write monolithic code blocks; refactor early and often.
*   **Line Limit Compliance**: Keep code files modularized under 500–1000 lines. Exceeding 1000 lines is strictly forbidden.
