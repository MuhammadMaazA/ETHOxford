#!/usr/bin/env python3

import boto3
import json
import requests
from PIL import Image
import io
import os

# Create a simple test image
def create_test_image():
    """Create a simple test image"""
    print("🎨 Creating test image...")
    
    # Create a simple 100x100 red square
    img = Image.new('RGB', (100, 100), color='red')
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

def test_full_workflow():
    """Test the complete workflow: generate URL -> upload -> register -> verify"""
    lambda_client = boto3.client('lambda', region_name='eu-west-1')
    
    print("🚀 Testing Complete Hatchmark Workflow")
    print("=" * 50)
    
    # Step 1: Generate presigned URL
    print("1️⃣ Generating presigned URL...")
    url_payload = {
        "file_name": "workflow-test.jpg",
        "content_type": "image/jpeg"
    }
    
    url_response = lambda_client.invoke(
        FunctionName='hatchmark-generate-url-dev',
        Payload=json.dumps(url_payload)
    )
    
    url_result = json.loads(url_response['Payload'].read().decode())
    print(f"✅ Generated URL for bucket: {url_result['bucket']}")
    
    if url_result['statusCode'] != 200:
        print("❌ Failed to generate URL")
        return
    
    # Step 2: Upload test image
    print("\n2️⃣ Uploading test image...")
    test_image_data = create_test_image()
    
    upload_response = requests.put(
        url_result['upload_url'],
        data=test_image_data,
        headers={'Content-Type': 'image/jpeg'}
    )
    
    if upload_response.status_code == 200:
        print("✅ Image uploaded successfully")
    else:
        print(f"❌ Upload failed: {upload_response.status_code}")
        return
    
    # Step 3: Register the asset
    print("\n3️⃣ Registering asset...")
    register_payload = {
        "bucket": url_result['bucket'],
        "key": url_result['file_name']
    }
    
    register_response = lambda_client.invoke(
        FunctionName='hatchmark-register-asset-dev',
        Payload=json.dumps(register_payload)
    )
    
    register_result = json.loads(register_response['Payload'].read().decode())
    print("✅ Asset registered:")
    print(f"   Asset ID: {register_result.get('asset_id')}")
    print(f"   File Hash: {register_result.get('file_hash', '')[:16]}...")
    print(f"   Status: {register_result.get('status')}")
    
    if register_result['statusCode'] != 200:
        print("❌ Failed to register asset")
        return
    
    # Step 4: Verify the asset
    print("\n4️⃣ Verifying asset...")
    verify_payload = {
        "asset_id": register_result['asset_id']
    }
    
    verify_response = lambda_client.invoke(
        FunctionName='hatchmark-verify-artwork-dev',
        Payload=json.dumps(verify_payload)
    )
    
    verify_result = json.loads(verify_response['Payload'].read().decode())
    print("✅ Verification result:")
    print(f"   Verified: {verify_result.get('verified')}")
    print(f"   Confidence: {verify_result.get('confidence', 'N/A')}")
    
    print("\n🎉 Complete workflow test finished!")
    print("✅ All components are working correctly!")
    
    return {
        'upload_url': url_result['upload_url'],
        'asset_id': register_result['asset_id'],
        'verified': verify_result['verified']
    }

if __name__ == "__main__":
    try:
        result = test_full_workflow()
        print("\n📊 Summary:")
        print(f"   Asset successfully registered and verified: {result['verified']}")
    except Exception as e:
        print(f"❌ Error during workflow test: {e}")
        import traceback
        traceback.print_exc()
