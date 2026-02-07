#!/usr/bin/env python3
"""
Hatchmark End-to-End Demo
Demonstrates the complete digital authenticity workflow
"""

import requests
import json
import time
import os
from PIL import Image

BASE_URL = "http://localhost:3002"

def demo_upload_and_watermark():
    """Complete demo of the Hatchmark system"""
    print("HATCHMARK DIGITAL AUTHENTICITY DEMO")
    print("=" * 50)
    
    # Step 1: Check system health
    print("\n1. Checking system health...")
    health_response = requests.get(f"{BASE_URL}/health")
    if health_response.status_code == 200:
        print("Backend is healthy")
    else:
        print("Backend health check failed")
        return
    
    # Step 2: Initiate upload
    print("\n2. Initiating file upload...")
    filename = "demo-image.jpg"
    upload_response = requests.post(
        f"{BASE_URL}/uploads/initiate",
        json={"filename": filename},
        headers={"Content-Type": "application/json"}
    )
    
    if upload_response.status_code == 200:
        upload_data = upload_response.json()
        print(f"Upload initiated: {upload_data['uploadId']}")
        print(f"Object key: {upload_data['objectKey']}")
        upload_url = upload_data['uploadUrl']
        object_key = upload_data['objectKey']
    else:
        print("Upload initiation failed")
        return
    
    # Step 3: Create and upload a test image
    print("\n3. Creating test image...")
    test_image = Image.new('RGB', (200, 200), color='blue')
    test_image_path = '/tmp/demo_image.jpg'
    test_image.save(test_image_path)
    print("✅ Test image created")
    
    # Upload the image to S3 using presigned URL
    print("\n4️⃣ Uploading image to S3...")
    print(f"🔗 Upload URL: {upload_url[:100]}...")
    try:
        with open(test_image_path, 'rb') as f:
            # Use the content type expected by the presigned URL
            upload_to_s3 = requests.put(
                upload_url, 
                data=f, 
                headers={'Content-Type': 'image/*'}  # Match the presigned URL content type
            )
        
        print(f"📊 S3 response status: {upload_to_s3.status_code}")
        if upload_to_s3.status_code == 200:
            print("✅ Image uploaded to S3 successfully")
        else:
            print(f"❌ S3 upload failed: {upload_to_s3.status_code}")
            print(f"📋 Response: {upload_to_s3.text}")
            return
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return
    
    # Step 5: Process the uploaded image
    print("\n5️⃣ Processing image (computing hash and adding to ledger)...")
    process_response = requests.post(
        f"{BASE_URL}/process",
        json={"objectKey": object_key},
        headers={"Content-Type": "application/json"}
    )
    
    if process_response.status_code == 200:
        process_data = process_response.json()
        print(f"✅ Image processed successfully")
        print(f"🔍 Perceptual hash: {process_data.get('perceptualHash', 'N/A')}")
        print(f"📋 Asset ID: {process_data.get('assetId', 'N/A')}")
        perceptual_hash = process_data.get('perceptualHash')
    else:
        print(f"❌ Processing failed: {process_response.status_code}")
        return
    
    # Step 6: Verify the asset
    print("\n6️⃣ Verifying asset authenticity...")
    verify_response = requests.post(
        f"{BASE_URL}/verify",
        json={"hash": perceptual_hash},
        headers={"Content-Type": "application/json"}
    )
    
    if verify_response.status_code == 200:
        verify_data = verify_response.json()
        print(f"✅ Verification complete")
        print(f"🛡️ Verified: {verify_data['verified']}")
        print(f"📊 Confidence: {verify_data.get('confidence', 'N/A')}")
        if verify_data['verified']:
            print(f"🏷️ Asset ID: {verify_data.get('assetId', 'N/A')}")
    else:
        print(f"❌ Verification failed: {verify_response.status_code}")
        return
    
    # Step 7: Check the ledger
    print("\n7️⃣ Checking digital ledger...")
    ledger_response = requests.get(f"{BASE_URL}/ledger")
    
    if ledger_response.status_code == 200:
        ledger_data = ledger_response.json()
        print(f"✅ Ledger retrieved")
        print(f"📚 Total assets in ledger: {ledger_data['total_count']}")
        
        if ledger_data['assets']:
            latest_asset = ledger_data['assets'][-1]
            print(f"🆕 Latest asset: {latest_asset.get('assetId', 'N/A')}")
            print(f"⏰ Timestamp: {latest_asset.get('timestamp', 'N/A')}")
    else:
        print(f"❌ Ledger check failed: {ledger_response.status_code}")
    
    # Cleanup
    if os.path.exists(test_image_path):
        os.remove(test_image_path)
    
    print("\n🎉 DEMO COMPLETE!")
    print("=" * 50)
    print("✨ The Hatchmark Digital Authenticity Service is fully operational!")
    print("🌐 Frontend: http://localhost:8080")
    print("🔧 Backend API: http://localhost:3002")
    print("📖 API Docs: Check the /health endpoint for available endpoints")

if __name__ == "__main__":
    demo_upload_and_watermark()
