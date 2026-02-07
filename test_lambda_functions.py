#!/usr/bin/env python3

import boto3
import json

# Test the Lambda functions directly
lambda_client = boto3.client('lambda', region_name='eu-west-1')

def test_generate_url():
    """Test the generate presigned URL function"""
    print("🧪 Testing Generate Presigned URL Function...")
    
    payload = {
        "file_name": "test-image.jpg",
        "content_type": "image/jpeg"
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='hatchmark-generate-url-dev',
            Payload=json.dumps(payload)
        )
        
        result = json.loads(response['Payload'].read().decode())
        print("✅ Generate URL Response:")
        print(json.dumps(result, indent=2))
        return result
        
    except Exception as e:
        print(f"❌ Error testing generate URL: {e}")
        return None

def test_register_asset():
    """Test the register asset function"""
    print("\n🧪 Testing Register Asset Function...")
    
    payload = {
        "bucket": "hatchmark-ingestion-bucket-dev-581150859000",
        "key": "test-image.jpg"
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='hatchmark-register-asset-dev',
            Payload=json.dumps(payload)
        )
        
        result = json.loads(response['Payload'].read().decode())
        print("✅ Register Asset Response:")
        print(json.dumps(result, indent=2))
        return result
        
    except Exception as e:
        print(f"❌ Error testing register asset: {e}")
        return None

def test_verify_artwork():
    """Test the verify artwork function"""
    print("\n🧪 Testing Verify Artwork Function...")
    
    # First we need an asset ID from registration
    payload = {
        "asset_id": "test-asset-id-123"
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName='hatchmark-verify-artwork-dev',
            Payload=json.dumps(payload)
        )
        
        result = json.loads(response['Payload'].read().decode())
        print("✅ Verify Artwork Response:")
        print(json.dumps(result, indent=2))
        return result
        
    except Exception as e:
        print(f"❌ Error testing verify artwork: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Testing Hatchmark Lambda Functions")
    print("=" * 50)
    
    # Test generate URL
    url_result = test_generate_url()
    
    # Test verify (this will show "not found" which is expected)
    verify_result = test_verify_artwork()
    
    print("\n✅ All tests completed!")
    
    if url_result and url_result.get('statusCode') == 200:
        print("\n📝 You can use the presigned URL to upload a file, then register it!")
        if 'upload_url' in url_result:
            print(f"Upload URL: {url_result['upload_url']}")
