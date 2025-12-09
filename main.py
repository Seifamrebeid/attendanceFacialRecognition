#!/usr/bin/env python3
"""
csv_to_firestore.py

Usage examples:
    python csv_to_firestore.py \
        --service-account ./serviceAccount.json \
        --csv data.csv \
        --collection my_collection \
        --id-field uid

If --id-field is given, that column's value will be used as the Firestore document ID.
Otherwise Firestore will auto-generate document IDs.

Columns containing dots (e.g. "address.city") will become nested fields:
    address:
      city: "Cairo"
"""

import argparse
import os
import sys
import math
from typing import Any, Dict

import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

BATCH_SIZE = 450  # keep under 500 to be safe


def parse_args():
    p = argparse.ArgumentParser(description="Upload CSV rows to Firestore.")
    p.add_argument("--service-account", "-s", required=True,
                   help="Path to Firebase service account JSON file.")
    p.add_argument("--csv", "-c", required=True, help="Path to CSV file.")
    p.add_argument("--collection", "-C", required=True, help="Firestore collection name.")
    p.add_argument("--id-field", "-i", default=None,
                   help="CSV column to use as document ID (optional).")
    p.add_argument("--replace", action="store_true",
                   help="If set, will overwrite documents with same ID. Otherwise merges.")
    p.add_argument("--skip-empty", action="store_true",
                   help="Skip rows where all fields are NaN/empty.")
    return p.parse_args()


def row_to_dict(row: pd.Series) -> Dict[str, Any]:
    """
    Convert a pandas Series to a dict suitable for Firestore.
    Supports nested fields when column names contain dots (e.g. 'a.b' -> {'a': {'b': val}}).
    Converts pandas NaN to None.
    """
    out: Dict[str, Any] = {}
    for col, val in row.items():
        # convert NaN to None
        if pd.isna(val):
            field_val = None
        else:
            field_val = val

        if "." in str(col):
            # nested field
            parts = str(col).split(".")
            cur = out
            for p in parts[:-1]:
                if p not in cur or not isinstance(cur[p], dict):
                    cur[p] = {}
                cur = cur[p]
            cur[parts[-1]] = field_val
        else:
            out[str(col)] = field_val
    return out


def chunked(iterable, size):
    for i in range(0, len(iterable), size):
        yield iterable[i:i + size]


def main():
    args = parse_args()

    if not os.path.isfile(args.service_account):
        print(f"Service account file not found: {args.service_account}", file=sys.stderr)
        sys.exit(2)

    if not os.path.isfile(args.csv):
        print(f"CSV file not found: {args.csv}", file=sys.stderr)
        sys.exit(2)

    # Initialize Firebase Admin
    cred = credentials.Certificate(args.service_account)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Read CSV with pandas (handles headers and common encodings)
    df = pd.read_csv(args.csv, dtype=str)  # read as strings to avoid unwanted dtype surprises
    original_len = len(df)
    print(f"Read {original_len} rows from {args.csv}")

    # Optionally drop totally-empty rows
    if args.skip_empty:
        df = df.dropna(how="all")
        print(f"After dropping empty rows: {len(df)} rows")

    if len(df) == 0:
        print("No rows to upload. Exiting.")
        return

    # Convert each row into a dict
    docs = []
    for idx, row in df.iterrows():
        row_dict = row_to_dict(row)
        # If all values are None and skip_empty not set, we still upload an empty doc unless skip_empty is True
        docs.append((idx, row_dict))

    total = len(docs)
    print(f"Preparing to upload {total} documents into collection '{args.collection}'")

    collection_ref = db.collection(args.collection)
    uploaded = 0

    # If id-field is provided, ensure it exists
    id_field = args.id_field
    if id_field and id_field not in df.columns:
        print(f"ERROR: id-field '{id_field}' not found among CSV columns: {list(df.columns)}", file=sys.stderr)
        sys.exit(3)

    # Process in batches
    all_indices = list(range(total))
    for chunk_indices in chunked(all_indices, BATCH_SIZE):
        batch = db.batch()
        for i in chunk_indices:
            _, data = docs[i]
            if id_field:
                doc_id = str(data.get(id_field)) if data.get(id_field) is not None else None
                # remove id_field from payload? often better to keep it as well; choose to keep it.
                if doc_id is None:
                    # fallback to auto-id
                    doc_ref = collection_ref.document()
                    if args.replace:
                        batch.set(doc_ref, data)
                    else:
                        batch.set(doc_ref, data, merge=True)
                else:
                    doc_ref = collection_ref.document(doc_id)
                    if args.replace:
                        batch.set(doc_ref, data)
                    else:
                        batch.set(doc_ref, data, merge=True)
            else:
                # auto-generated doc id
                doc_ref = collection_ref.document()
                if args.replace:
                    batch.set(doc_ref, data)
                else:
                    batch.set(doc_ref, data, merge=True)

            uploaded += 1

        # commit batch
        batch.commit()
        print(f"Committed batch — total uploaded so far: {uploaded}/{total}")

    print(f"Done. Uploaded {uploaded} documents to '{args.collection}'.")


if __name__ == "__main__":
    main()
