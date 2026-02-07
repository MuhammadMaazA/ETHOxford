#!/usr/bin/env python3
"""
Simple API Test for Hatchmark Service
"""

import requests
import json

def test_api():
    base_url = "http://localhost:3002"
    
    print("Testing Hatchmark API endpoints...")
    print("=" * 40)
    
    # Test 1: Health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")
    
    print("-" * 40)
    
    # Test 2: Upload initiate
    try:
        data = {"filename": "test.jpg"}
        response = requests.post(f"{base_url}/uploads/initiate", json=data, timeout=5)
        print(f"Upload initiate: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Upload ID: {result.get('uploadId', 'N/A')}")
            print(f"Object Key: {result.get('objectKey', 'N/A')}")
    except Exception as e:
        print(f"Upload initiate failed: {e}")
    
    print("-" * 40)
    
    # Test 3: Verification
    try:
        data = {"hash": "test123"}
        response = requests.post(f"{base_url}/verify", json=data, timeout=5)
        print(f"Verification: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Verified: {result.get('verified', 'N/A')}")
    except Exception as e:
        print(f"Verification failed: {e}")
    
    print("-" * 40)
    
    # Test 4: Ledger
    try:
        response = requests.get(f"{base_url}/ledger", timeout=5)
        print(f"Ledger get: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"Assets in ledger: {result.get('total_count', 'N/A')}")
    except Exception as e:
        print(f"Ledger get failed: {e}")
    
    print("=" * 40)
    print("API test complete!")

if __name__ == "__main__":
    test_api()
