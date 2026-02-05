import io
import re
from typing import Optional

import pdfplumber
from flask import Flask, request, jsonify
from rapidfuzz import process, fuzz

app = Flask(__name__)


def normalize(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    return s


def fuzzy_extract(text: str, keywords, score_threshold: int = 50) -> Optional[str]:
    norm_text = normalize(text)
    lines = [line.strip() for line in norm_text.splitlines() if line.strip()]

    # Search for the best line matching any of the keywords
    best_overall = (None, 0.0)
    for key in keywords:
        candidate = process.extractOne(key, lines, scorer=fuzz.partial_ratio)
        if candidate and candidate[1] > best_overall[1]:
            best_overall = (candidate[0], candidate[1])

    if best_overall[0] and best_overall[1] >= score_threshold:
        return best_overall[0]
    return None


def extract_number(line: Optional[str]) -> Optional[str]:
    if not line:
        return None
    match = re.search(r"\d+[.,]?\d*", line.replace(",", "."))
    return match.group() if match else None


def extract_amount(text: str, keywords) -> Optional[str]:
    text_lower = text.lower()
    for key in keywords:
        pattern = rf"\b{re.escape(key.lower())}\b\s*[:\-]?\s*\$?\s*(\d+[.,]?\d*)"
        match = re.search(pattern, text_lower)
        if match:
            return match.group(1).replace(",", ".")
    return None


def extract_invoice_number(text: str) -> Optional[str]:
    t = text.lower()
    patterns = [
        r"\binvoice\s*#\s*(\d+)\b",
        r"\binvoice\s*(no|number|n)?\.?\s*[:\-]?\s*(\d+)\b",
        r"\bfacture\s*(n|num|numéro)?\.?\s*[:\-]?\s*(\d+)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return match.groups()[-1]
    return None


def extract_invoice_date(text: str) -> Optional[str]:
    t = text.lower()
    date_patterns = [
        r"\b\d{2}[-/\.]\d{2}[-/\.]\d{4}\b",
        r"\b\d{4}[-/\.]\d{2}[-/\.]\d{2}\b",
        r"\b\d{2}[-/\.]\d{2}\b",
        r"\b\d{1,2}\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s?\d{4}\b",
        r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s?\d{1,2},?\s?\d{4}\b",
    ]
    for pattern in date_patterns:
        match = re.search(pattern, t)
        if match:
            return match.group()
    return None


def extract_total(text: str) -> Optional[str]:
    t = text.lower()
    patterns = [
        r"\btotal\b\s*[:\-]?\s*\$?\s*(\d+[.,]?\d*)",
        r"\bgrand\s+total\b\s*[:\-]?\s*\$?\s*(\d+[.,]?\d*)",
        r"\bamount\s+due\b\s*[:\-]?\s*\$?\s*(\d+[.,]?\d*)",
    ]
    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            return match.group(1).replace(",", ".")
    return None


def extract_invoice_json(text: str) -> dict:
    return {
        "supplier": fuzzy_extract(text, ["company", "vendor", "supplier", "issued by"]),
        "invoice_number": extract_invoice_number(text),
        "invoice_date": extract_invoice_date(text),
        "subtotal": extract_amount(text, ["subtotal", "net amount", "amount before tax"]),
        "tax": extract_amount(text, ["tax", "vat", "tva"]),
        "total": extract_total(text),
    }


@app.route("/", methods=["GET"])
def index():
    return "Invoice extraction service. POST a PDF to /extract as form file 'file'."


@app.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "Missing file part 'file'"}), 400
    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        data = f.read()
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
        text = "\n".join(pages)

        invoice_json = extract_invoice_json(text)
        return jsonify({"invoice_json": invoice_json})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    return response


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
