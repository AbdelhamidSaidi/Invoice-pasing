import io
import json

import pdfplumber
import streamlit as st

from app import extract_invoice_json


st.set_page_config(page_title="Invoice Extractor")
st.title("Invoice Extractor")

uploaded = st.file_uploader("Upload a PDF invoice", type=["pdf"])

if uploaded is not None:
    data = uploaded.read()
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
        text = "\n".join(pages)

        with st.expander("Extracted Text"):
            st.text_area("", text, height=300)

        invoice = extract_invoice_json(text)

        st.subheader("Extracted Invoice JSON")
        st.json(invoice)

        st.download_button(
            "Download JSON",
            data=json.dumps(invoice, indent=2),
            file_name="invoice.json",
            mime="application/json",
        )
    except Exception as e:
        st.error(f"Failed to process PDF: {e}")
