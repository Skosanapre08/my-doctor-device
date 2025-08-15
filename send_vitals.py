#!/usr/bin/env python3
"""Simple simulator to POST vitals to the backend."""
import time, requests, random, json

API = "http://localhost:4000/api/vitals"
PATIENT_ID = "pat-001"

def make_vitals():
    return [
        {"type":"heart_rate","value": random.randint(60,100), "unit":"bpm"},
        {"type":"temperature","value": round(random.uniform(36.0,37.5),1), "unit":"C"}
    ]

if __name__ == '__main__':
    print("Sending 5 sample vitals payloads to", API)
    for i in range(5):
        payload = {
            "device_id": "sim-device-001",
            "patient_id": PATIENT_ID,
            "vitals": make_vitals(),
            "recorded_at": None
        }
        try:
            r = requests.post(API, json=payload, timeout=5)
            print(i+1, "=>", r.status_code, r.text)
        except Exception as e:
            print("Failed to send:", e)
        time.sleep(1)
