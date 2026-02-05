# Invoice parsing (PDF → invoice_json)

This project extracts key fields from PDF invoices and returns a structured JSON object (`invoice_json`).

It includes:

- A Jupyter notebook: `data from pdf.ipynb`
- A small HTTP API (Flask): `app.py`
- A static frontend (HTML/CSS/JS): `static/`
- A French LaTeX academic-style report: `report/`

## Overview

- The notebook reads a PDF with `pdfplumber`, extracts the first page text, and tries to parse several important fields:
  - `invoice_number`
  - `bill_to` (first two words after the billed-to trigger)
  - `total_cost`
  - `item_description`

All extractions are implemented using regular expressions with safety checks to avoid `AttributeError` when patterns are not found.

## Cell-by-cell breakdown

1) Imports

- `import pdfplumber` and `import re` are used to open the PDF and run regex searches.

2) PDF load path

- `loc_1` is a string pointing to the PDF on disk. The code uses `with pdfplumber.open(loc_1) as pdf:` then `page = pdf.pages[0]` and `text = page.extract_text()` to get page text.

3) Debug print of extracted text

- The notebook prints each line and then the whole `text` to let you inspect how the PDF extraction looked before running regexes.

4) Invoice number extraction

- Patterns tried (in order):
  - `INVOICE\\s*(?:#|No\\.?|Number|Num|Nº)?\\s*[:#-]?\\s*([A-Z0-9\\-]+)`
  - `INV(?:O?ICE)?\\s*(?:#|No\\.?|Number)?\\s*[:#-]?\\s*([A-Z0-9\\-]+)`
  - `Invoice\\s+No\\.?\\s*[:#-]?\\s*([A-Z0-9\\-]+)`
  - `Invoice\\s+number\\s*[:#-]?\\s*([A-Z0-9\\-]+)`
  - `\\b([A-Z]{2,5}-\\d{3,6})\\b` (alphanumeric patterns like ABC-1234)
  - `\\b([0-9]{4,12})\\b` (pure numeric IDs)

- The code loops the patterns and takes the first match (case-insensitive). This increases robustness across invoice formats.

5) `bill_to` extraction (first two words only)

- The notebook defines an embedded helper `first_two_after(trigger, text, n=2)`.
- Implementation details:
  - Finds the trigger word using `re.search(r'\\b' + re.escape(trigger) + r'\\b', ...)` (word-boundary, case-insensitive).
  - Takes the substring after the trigger, collapses whitespace, trims leading punctuation, then returns the first `n` non-whitespace tokens.
  - The extraction first attempts `BILLED TO` and falls back to `BILL TO`.

6) `total_cost` extraction (safe)

- The notebook tries several common labels (e.g., `TOTAL $123.45`, `Amount Due $123.45`, `Total Due $123.45`).
- It iterates a short list of patterns and uses `m = re.search(pattern, text, re.IGNORECASE)` and then `m.group(1)` only if `m` is truthy. This prevents `AttributeError` when the pattern doesn't exist.

7) `item_description` extraction

- The notebook attempts to capture the block under a table header like `ITEM DESCRIPTION ... AMOUNT` using a multiline, non-greedy regex:
  - `re.search(r'ITEM DESCRIPTION.*?AMOUNT\\s*\\n(.+?)(?:\\n\\s*\\n|\\Z)', text, re.IGNORECASE | re.DOTALL)`
- If a match is found, the code normalizes the captured lines into a single string.

8) Final output JSON

- The main combined cell builds a dictionary with keys: `invoice_number`, `bill_to`, `total_cost`, `item_description` and prints it with `json.dumps(...)`.

## Safety and design choices

- Always check `m` before calling `m.group(1)` to avoid `AttributeError`.
- Use `re.IGNORECASE` to be robust to capitalization differences.
- Use non-greedy `.+?` and `re.DOTALL` where capturing multiline blocks is required.
- For `bill_to` we intentionally return only the first two tokens to meet the requirement.

## How to run

1. Open the notebook `data from pdf.ipynb` in your Jupyter environment or VS Code (Notebook view).
2. Ensure dependencies are installed in the active environment (recommended):

```powershell
python -m pip install -r requirements.txt
```

3. Update `loc_1` to point at the PDF you want to parse.
4. Run the first cells in order. The combined extraction cell prints a JSON string with the parsed values.

## Example output

The notebook prints a single JSON object, for example:

```
{"invoice_number": "INV-12345", "bill_to": "Acme Corp", "total_cost": "1,234.56", "item_description": "Widget A 10 x 12.00; Widget B 5 x 8.00"}
```

## Next improvement ideas

- Add unit tests with representative sample `text` strings to validate regexes.
- Use more structured parsing for line-item tables (e.g., by using PDF table extraction when available) rather than relying on free-text regex captures.
- Normalize currency (remove commas) and convert totals to numeric `float` or `Decimal` for downstream calculations.
- Add logging and a `verbose` flag rather than printing directly.
- Add a small CLI or function wrapper so the same logic can be used in batch-processing scripts.

## Application Web (API + Frontend)

This repository also contains a small web app:

- API: `app.py` (Flask)
- Frontend: `static/index.html` (HTML/CSS/JS)

Run the API:

```powershell
python -m pip install -r requirements.txt
python app.py
```

Open the frontend:

- http://127.0.0.1:5000/static/index.html

### API usage (without the frontend)

```powershell
curl -F "file=@invoice1-word-example.pdf" http://127.0.0.1:5000/extract
```

If you serve `static/` from another server (different port), the API sends permissive CORS headers for development.

## Rapport LaTeX (FR)

The LaTeX report is in the `report/` folder.

## Report (Markdown)

The main project report (French, academic style) is available as Markdown:

- `REPORT.md`

### Prerequisites (Windows)

You need a LaTeX distribution installed (otherwise commands like `pdflatex` / `latexmk` are not found):

- Option A: MiKTeX (recommended on Windows)
- Option B: TeX Live

After installing, close and reopen PowerShell so the new PATH is loaded.

#### Install MiKTeX with winget (optional)

```powershell
winget install --id MiKTeX.MiKTeX --source winget
```

### Compile (recommended: latexmk)

If you have TeX Live / MiKTeX + `latexmk` installed:

```powershell
cd report
latexmk -pdf -interaction=nonstopmode -synctex=1 main.tex
```

### Compile (helper script)

```powershell
cd report
./compile.ps1
```

### Compile (manual)

```powershell
cd report
pdflatex -interaction=nonstopmode main.tex
biber main
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
```

## Contact

If you want, I can also:
- run the notebook and show the JSON output for your sample PDF,
- expand the JSON with numeric conversions and currency normalization,
- or extract full line-item tables into structured lists.

-- README generated by your assistant
