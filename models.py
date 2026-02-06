from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Receipt(db.Model):
    __tablename__ = 'receipts'

    id = db.Column(db.Integer, primary_key=True)
    supplier = db.Column(db.String(200))
    invoice_number = db.Column(db.String(100))
    invoice_date = db.Column(db.String(50))
    subtotal = db.Column(db.String(50))
    tax = db.Column(db.String(50))
    total = db.Column(db.String(50))
    filename = db.Column(db.String(255))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'supplier': self.supplier,
            'invoice_number': self.invoice_number,
            'invoice_date': self.invoice_date,
            'subtotal': self.subtotal,
            'tax': self.tax,
            'total': self.total,
            'filename': self.filename,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }
