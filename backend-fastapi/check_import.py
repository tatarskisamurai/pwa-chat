"""Run this to see the full import error: python check_import.py"""
import sys
try:
    from app.main import app
    print("Import OK")
except Exception as e:
    print("Import failed:", type(e).__name__, str(e), file=sys.stderr)
    raise
