"""Simple RapidFuzz fuzzy-matching examples.

Run:
    pip install -r requirements.txt
    python rapidfuzz_example.py
"""
from rapidfuzz import fuzz, process

choices = [
    "Apple Inc.",
    "apple Incorporated",
    "Pineapple",
    "Application",
    "Applet",
]

query = "apple incorporated"

print("Query:", query)
print("--- Scores ---")
for name in choices:
    r = fuzz.ratio(query, name)
    pr = fuzz.partial_ratio(query, name)
    tsr = fuzz.token_sort_ratio(query, name)
    print(f"{name}: ratio={r}, partial_ratio={pr}, token_sort_ratio={tsr}")

best = process.extractOne(query, choices, scorer=fuzz.token_sort_ratio)
print("\nBest match (extractOne with token_sort_ratio):", best)
