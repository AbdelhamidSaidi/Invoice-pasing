# Database Setup for Invoice Receipts

## What's New

Your Invoice Extractor now includes:

1. **SQLite Database Storage**: All extracted invoice data is automatically saved to a database (`receipts.db`)
2. **My Receipts Section**: A new tab where you can view all your receipt history
3. **Receipt Management**: View, browse, and delete receipts from the history

## Features

### Database Schema
- **supplier**: Company/vendor name
- **invoice_number**: Invoice reference number
- **invoice_date**: Date of invoice
- **subtotal**: Amount before tax
- **tax**: Tax amount
- **total**: Total amount
- **filename**: Original PDF filename
- **uploaded_at**: Timestamp when uploaded

### API Endpoints
- `POST /extract` - Upload and extract invoice (saves to database)
- `GET /receipts` - Get all receipts
- `GET /receipts/<id>` - Get specific receipt
- `DELETE /receipts/<id>` - Delete a receipt

### User Interface
- **Upload Invoice Tab**: Upload PDFs and extract data (same as before)
- **My Receipts Tab**: Browse all your receipt history
- **Refresh Button**: Reload receipts list
- **Delete Button**: Remove individual receipts

## How to Use

1. Start the Flask server:
   ```powershell
   "C:/Users/azerty/Documents/Invoice pasing/.venv/Scripts/python.exe" app.py
   ```

2. Open your browser to `http://localhost:5000/static/index.html`

3. Upload invoices in the "Upload Invoice" tab - they'll automatically be saved to the database

4. Switch to "My Receipts" tab to view your history

## Database File

The database is stored as `receipts.db` in your project root. It's automatically created on first run and is excluded from git via `.gitignore`.
