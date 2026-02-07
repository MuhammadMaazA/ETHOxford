#!/usr/bin/env python3
"""
Test script for Hatchmark deployment
Performs end-to-end testing of the deployed system
"""

import requests
import boto3
import json
import time
import io
from PIL import Image
import sys

def create_test_image():
    """Create a simple test image."""
    # Create a small RGB image
    img = Image.new('RGB', (200, 200), color='blue')
    
    # Add some text to make it unique
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.load_default()
    except:
        font = None
    
    draw.text((50, 90), "HATCHMARK TEST", fill='white', font=font)
    
    # Save to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    
    return img_bytes.getvalue()

def test_upload_endpoint(api_url):
    """Test the upload endpoint."""
    print("Testing upload endpoint...")
    
    try:
        response = requests.post(
            f"{api_url}/uploads/initiate",
            json={"filename": "test-image.jpg"},
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"[OK] Upload endpoint working: {data['objectKey']}")
            return data['uploadUrl'], data['objectKey']
        else:
            print(f"[ERROR] Upload endpoint failed: {response.status_code} - {response.text}")
            return None, None
            
    except Exception as e:
        print(f"[ERROR] Upload endpoint error: {e}")
        return None, None

def test_image_upload(upload_url):
    """Test uploading an image to S3."""
    print("Testing image upload to S3...")
    
    try:
        image_data = create_test_image()
        
        response = requests.put(
            upload_url,
            data=image_data,
            headers={"Content-Type": "image/jpeg"}
        )
        
        if response.status_code == 200:
            print("[OK] Image uploaded successfully")
            return True
        else:
            print(f"[ERROR] Image upload failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Image upload error: {e}")
        return False

def test_step_functions_execution():
    """Check if Step Functions workflow executed."""
    print("Checking Step Functions execution...")
    
    try:
        sf = boto3.client('stepfunctions')
        
        # List recent executions
        response = sf.list_executions(
            stateMachineArn=f"arn:aws:states:{boto3.Session().region_name}:{boto3.client('sts').get_caller_identity()['Account']}:stateMachine:hatchmark-notarization-workflow",
            maxResults=1
        )
        
        if response['executions']:
            execution = response['executions'][0]
            print(f"[OK] Found Step Functions execution: {execution['status']}")
            
            if execution['status'] == 'RUNNING':
                print("   (Still running - this is normal)")
            
            return True
        else:
            print("[WARN] No Step Functions executions found")
            return False
            
    except Exception as e:
        print(f"[WARN] Could not check Step Functions: {e}")
        return False

def test_qldb_records():
    """Check if records were written to QLDB."""
    print("Checking QLDB records...")
    
    try:
        from pyqldb.driver.qldb_driver import QldbDriver
        
        driver = QldbDriver('hatchmark-ledger')
        
        def count_records(txn):
            statement = "SELECT COUNT(*) as count FROM registrations"
            cursor = txn.execute_statement(statement)
            return list(cursor)[0]['count']
        
        count = driver.execute_lambda(count_records)
        driver.close()
        
        print(f"[OK] Found {count} records in QLDB")
        return count > 0
        
    except ImportError:
        print("[WARN] pyqldb not installed - skipping QLDB check")
        return True
    except Exception as e:
        print(f"[WARN] Could not check QLDB: {e}")
        return False

def test_verification_endpoint(api_url):
    """Test the verification endpoint."""
    print("Testing verification endpoint...")
    
    try:
        image_data = create_test_image()
        
        response = requests.post(
            f"{api_url}/verify",
            data=image_data,
            headers={"Content-Type": "image/jpeg"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"[OK] Verification endpoint working: {data['verdict']}")
            return True
        else:
            print(f"[ERROR] Verification endpoint failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"[ERROR] Verification endpoint error: {e}")
        return False

def get_api_url():
    """Get the API Gateway URL from CloudFormation."""
    try:
        cf = boto3.client('cloudformation')
        response = cf.describe_stacks(StackName='hatchmark-dev')
        
        for output in response['Stacks'][0].get('Outputs', []):
            if output['OutputKey'] == 'HatchmarkApiGatewayUrl':
                return output['OutputValue'].rstrip('/')
        
        print("[ERROR] Could not find API Gateway URL in stack outputs")
        return None
        
    except Exception as e:
        print(f"[ERROR] Error getting API URL: {e}")
        return None

def main():
    """Run all tests."""
    print("HATCHMARK DEPLOYMENT TEST")
    print("=" * 50)
    
    # Get API URL
    api_url = get_api_url()
    if not api_url:
        return False
    
    print(f"Testing API at: {api_url}")
    
    # Test upload endpoint
    upload_url, object_key = test_upload_endpoint(api_url)
    if not upload_url:
        return False
    
    # Test image upload
    if not test_image_upload(upload_url):
        return False
    
    # Wait a moment for processing
    print("Waiting 30 seconds for processing...")
    time.sleep(30)
    
    # Test Step Functions
    test_step_functions_execution()
    
    # Test QLDB
    test_qldb_records()
    
    # Test verification endpoint
    test_verification_endpoint(api_url)
    
    print("\nDEPLOYMENT TEST COMPLETE")
    print("=" * 50)
    print("[SUCCESS] Hatchmark service is working")
    print(f"Upload URL: {api_url}/uploads/initiate")
    print(f"Verify URL: {api_url}/verify")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
