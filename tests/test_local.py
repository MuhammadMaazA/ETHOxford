#!/usr/bin/env python3
"""
Local testing script for Hatchmark components
This script helps test the various components locally before deployment
"""

import os
import sys
import json
import boto3
import uuid
from PIL import Image
import imagehash
from datetime import datetime

# Add the backend src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend', 'src'))

try:
    from handlers import generate_presigned_url, compute_phash, write_to_ledger, verify_artwork
except ImportError:
    print("Warning: Could not import handlers. Make sure you're in the project root directory.")

def create_test_image(filename="test_image.png", size=(400, 400)):
    """Create a test image for testing purposes."""
    print(f"Creating test image: {filename}")
    
    # Create a colorful test image
    img = Image.new('RGB', size, color='blue')
    
    # Add some patterns to make it unique
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    
    # Draw some shapes
    draw.rectangle([50, 50, 150, 150], fill='red')
    draw.ellipse([200, 50, 350, 200], fill='green')
    draw.polygon([(100, 250), (200, 300), (150, 350)], fill='yellow')
    
    # Add text
    try:
        font = ImageFont.load_default()
        draw.text((50, 300), f"Hatchmark Test\n{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", 
                 fill='white', font=font)
    except:
        draw.text((50, 300), "Hatchmark Test", fill='white')
    
    # Save the image
    img.save(filename)
    print(f"Test image saved: {filename}")
    return filename

def test_perceptual_hash(image_path):
    """Test perceptual hash computation."""
    print(f"\n=== Testing Perceptual Hash for {image_path} ===")
    
    try:
        # Load image and compute hash
        img = Image.open(image_path)
        phash = str(imagehash.phash(img))
        dhash = str(imagehash.dhash(img))
        ahash = str(imagehash.average_hash(img))
        
        print(f"Image size: {img.size}")
        print(f"Perceptual Hash (pHash): {phash}")
        print(f"Difference Hash (dHash): {dhash}")
        print(f"Average Hash (aHash): {ahash}")
        
        return phash
    except Exception as e:
        print(f"Error computing hash: {e}")
        return None

def test_lambda_handlers():
    """Test Lambda function handlers locally."""
    print("\n=== Testing Lambda Handlers ===")
    
    # Test generate_presigned_url
    print("\n--- Testing generate_presigned_url ---")
    event = {
        'body': json.dumps({'filename': 'test.png'})
    }
    context = {}
    
    try:
        # Set environment variable for testing
        os.environ['S3_BUCKET'] = 'test-bucket'
        result = generate_presigned_url(event, context)
        print(f"Status Code: {result['statusCode']}")
        if result['statusCode'] == 200:
            print(" generate_presigned_url working correctly")
        else:
            print(" generate_presigned_url failed")
    except Exception as e:
        print(f" Error testing generate_presigned_url: {e}")
    
    # Test compute_phash
    print("\n--- Testing compute_phash ---")
    s3_event = {
        'Records': [{
            's3': {
                'bucket': {'name': 'test-bucket'},
                'object': {'key': 'uploads/test.png'}
            }
        }]
    }
    
    try:
        result = compute_phash(s3_event, context)
        print(f"Status Code: {result['statusCode']}")
        if result['statusCode'] == 200:
            print(" compute_phash working correctly")
        else:
            print(" compute_phash failed")
    except Exception as e:
        print(f" Error testing compute_phash: {e}")

def test_steganography():
    """Test steganography encoding and decoding."""
    print("\n=== Testing Steganography ===")
    
    try:
        from steganography.steganography import Steganography
        
        # Create test image
        test_img = create_test_image("test_stego.png")
        
        # Test data to embed
        secret_data = "hatchmark-test-transaction-12345"
        output_img = "test_stego_output.png"
        
        print(f"Embedding secret data: {secret_data}")
        
        # Encode
        Steganography.encode(test_img, output_img, secret_data)
        print(" Steganography encoding successful")
        
        # Decode
        decoded_data = Steganography.decode(output_img)
        print(f"Decoded data: {decoded_data}")
        
        if decoded_data == secret_data:
            print(" Steganography round-trip successful")
        else:
            print(" Steganography data mismatch")
        
        # Clean up
        os.remove(test_img)
        os.remove(output_img)
        
    except ImportError:
        print(" Steganography library not available")
    except Exception as e:
        print(f" Steganography test failed: {e}")

def test_docker_watermarker():
    """Test if Docker watermarker can be built."""
    print("\n=== Testing Docker Watermarker ===")
    
    try:
        import subprocess
        
        # Check if Docker is available
        result = subprocess.run(['docker', '--version'], capture_output=True, text=True)
        if result.returncode != 0:
            print(" Docker not available")
            return
        
        print(" Docker is available")
        
        # Try to build the watermarker image
        print("Building watermarker Docker image...")
        build_result = subprocess.run([
            'docker', 'build', '-t', 'hatchmark-watermarker-test', 
            os.path.join(os.path.dirname(__file__), '..', 'watermarker')
        ], capture_output=True, text=True)
        
        if build_result.returncode == 0:
            print(" Docker image built successfully")
            
            # Try to run the container in test mode
            print("Running watermarker in test mode...")
            run_result = subprocess.run([
                'docker', 'run', '--rm', 'hatchmark-watermarker-test'
            ], capture_output=True, text=True, timeout=30)
            
            if run_result.returncode == 0:
                print(" Watermarker container runs successfully")
                print("Container output:")
                print(run_result.stdout)
            else:
                print(" Watermarker container failed")
                print("Error:", run_result.stderr)
        else:
            print(" Docker build failed")
            print("Error:", build_result.stderr)
            
    except subprocess.TimeoutExpired:
        print(" Container test timed out (this is normal for test mode)")
    except Exception as e:
        print(f" Docker test error: {e}")

def test_image_similarity():
    """Test image similarity detection with different modifications."""
    print("\n=== Testing Image Similarity Detection ===")
    
    # Create original image
    original = create_test_image("original.png")
    original_hash = test_perceptual_hash(original)
    
    if not original_hash:
        return
    
    # Test different modifications
    modifications = []
    
    try:
        img = Image.open(original)
        
        # Resize test
        resized = img.resize((300, 300))
        resized.save("resized.png")
        resized_hash = test_perceptual_hash("resized.png")
        if resized_hash:
            similarity = 1 - (bin(int(original_hash, 16) ^ int(resized_hash, 16)).count('1') / 64)
            modifications.append(("Resized (400x400 -> 300x300)", similarity))
        
        # Rotation test
        rotated = img.rotate(10)
        rotated.save("rotated.png")
        rotated_hash = test_perceptual_hash("rotated.png")
        if rotated_hash:
            similarity = 1 - (bin(int(original_hash, 16) ^ int(rotated_hash, 16)).count('1') / 64)
            modifications.append(("Rotated 10 degrees", similarity))
        
        # Brightness test
        from PIL import ImageEnhance
        brightener = ImageEnhance.Brightness(img)
        bright = brightener.enhance(1.3)
        bright.save("bright.png")
        bright_hash = test_perceptual_hash("bright.png")
        if bright_hash:
            similarity = 1 - (bin(int(original_hash, 16) ^ int(bright_hash, 16)).count('1') / 64)
            modifications.append(("Brightness +30%", similarity))
        
        print("\nSimilarity Test Results:")
        for mod_name, sim_score in modifications:
            status = "" if sim_score > 0.8 else "" if sim_score > 0.6 else ""
            print(f"{status} {mod_name}: {sim_score:.2%} similar")
        
        # Clean up
        for filename in ["original.png", "resized.png", "rotated.png", "bright.png"]:
            if os.path.exists(filename):
                os.remove(filename)
                
    except Exception as e:
        print(f" Image similarity test failed: {e}")

def check_aws_configuration():
    """Check AWS configuration and permissions."""
    print("\n=== Checking AWS Configuration ===")
    
    try:
        # Check AWS credentials
        sts = boto3.client('sts')
        identity = sts.get_caller_identity()
        print(f" AWS credentials configured")
        print(f"Account ID: {identity['Account']}")
        print(f"User/Role: {identity['Arn']}")
        
        # Check S3 access
        s3 = boto3.client('s3')
        buckets = s3.list_buckets()
        print(f" S3 access working ({len(buckets['Buckets'])} buckets visible)")
        
        # Check if specific buckets exist
        for bucket_pattern in ['hatchmark-ingestion', 'hatchmark-processed']:
            matching_buckets = [b['Name'] for b in buckets['Buckets'] if bucket_pattern in b['Name']]
            if matching_buckets:
                print(f" Found Hatchmark bucket: {matching_buckets[0]}")
            else:
                print(f" No bucket found matching pattern: {bucket_pattern}")
        
    except Exception as e:
        print(f" AWS configuration issue: {e}")

def main():
    """Run all tests."""
    print("🔒 Hatchmark Local Testing Suite")
    print("=" * 50)
    
    # Check dependencies
    try:
        import boto3
        import PIL
        print(" Core dependencies available")
    except ImportError as e:
        print(f" Missing dependency: {e}")
        return
    
    # Run tests
    check_aws_configuration()
    test_perceptual_hash(create_test_image())
    test_steganography()
    test_lambda_handlers()
    test_image_similarity()
    test_docker_watermarker()
    
    print("\n" + "=" * 50)
    print(" Testing completed!")
    print("\nNext steps:")
    print("1. Fix any failing tests")
    print("2. Deploy infrastructure: ./deployment/deploy.sh")
    print("3. Test API endpoints")
    print("4. Update frontend API URL")

if __name__ == "__main__":
    main()