#!/usr/bin/env python3
"""
Hatchmark Local Development Server
Provides mock API endpoints for local development
"""

import os
import sys
import uuid
import json
import time
import re
import logging
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
from botocore.exceptions import ClientError

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Configuration
INGESTION_BUCKET = "hatchmark-ingestion-bucket-36933227"
PROCESSED_BUCKET = "hatchmark-processed-bucket-36933227"
AWS_PROFILE = "hatchmark-dev"

# Mock data storage
mock_uploads = {}
mock_assets = {}

def get_aws_session():
    """Get AWS session with profile"""
    try:
        return boto3.Session(profile_name=AWS_PROFILE)
    except Exception as e:
        logger.warning(f"AWS session failed: {e}")
        return None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'hatchmark-local-dev',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0'
    })

@app.route('/uploads/initiate', methods=['POST'])
def initiate_upload():
    """Initiate file upload with presigned URL"""
    try:
        logger.info(f"Upload initiation request received: {request.method}")
        data = request.get_json()
        logger.info(f"Request data: {data}")
        
        if not data or 'filename' not in data:
            logger.error("Missing filename in request")
            return jsonify({'error': 'filename is required'}), 400
        
        filename = data['filename']
        if not filename.strip():
            return jsonify({'error': 'filename cannot be empty'}), 400
        
        file_size = data.get('fileSize', 0)
        content_type = data.get('contentType', '')
        
        upload_id = str(uuid.uuid4())
        object_key = f"uploads/{upload_id}/{filename}"
        
        LOCAL_DEV_MODE = True
        
        if LOCAL_DEV_MODE:
            local_upload_url = f"http://localhost:3002/uploads/file/{upload_id}"
            
            mock_uploads[upload_id] = {
                'uploadId': upload_id,
                'filename': filename,
                'objectKey': object_key,
                'status': 'initiated',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            logger.info(f"Generated local upload URL: {local_upload_url}")
            
            return jsonify({
                'uploadUrl': local_upload_url,
                'objectKey': object_key,
                'uploadId': upload_id
            })
        
        session = get_aws_session()
        if session:
            try:
                s3_client = session.client('s3')
                presigned_url = s3_client.generate_presigned_url(
                    'put_object',
                    Params={
                        'Bucket': INGESTION_BUCKET,
                        'Key': object_key,
                        'ContentType': 'image/*'
                    },
                    ExpiresIn=600
                )
                
                # Store upload info
                mock_uploads[upload_id] = {
                    'uploadId': upload_id,
                    'filename': filename,
                    'objectKey': object_key,
                    'status': 'initiated',
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
                
                return jsonify({
                    'uploadUrl': presigned_url,
                    'objectKey': object_key,
                    'uploadId': upload_id
                })
                
            except Exception as e:
                logger.warning(f"Real S3 presigned URL failed: {e}")
        
        local_upload_url = f"http://localhost:3002/uploads/file/{upload_id}"
        
        mock_uploads[upload_id] = {
            'uploadId': upload_id,
            'filename': filename,
            'objectKey': object_key,
            'status': 'initiated',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        return jsonify({
            'uploadUrl': local_upload_url,
            'objectKey': object_key,
            'uploadId': upload_id
        })
        
    except Exception as e:
        logger.error(f"Upload initiation failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/uploads/file/<upload_id>', methods=['PUT'])
def upload_file_local(upload_id):
    """Local file upload endpoint for development"""
    try:
        logger.info(f"Local file upload request for upload_id: {upload_id}")
        
        if upload_id not in mock_uploads:
            return jsonify({'error': 'Upload not found'}), 404
        
        file_data = request.get_data()
        
        if not file_data:
            return jsonify({'error': 'No file data provided'}), 400
        
        import os
        uploads_dir = '/tmp/hatchmark-uploads'
        os.makedirs(uploads_dir, exist_ok=True)
        
        upload_info = mock_uploads[upload_id]
        filename = upload_info['filename']
        file_path = os.path.join(uploads_dir, f"{upload_id}_{filename}")
        
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        mock_uploads[upload_id]['status'] = 'completed'
        mock_uploads[upload_id]['localPath'] = file_path
        mock_uploads[upload_id]['fileSize'] = len(file_data)
        
        logger.info(f"File saved locally: {file_path} ({len(file_data)} bytes)")
        
        return '', 200
        
    except Exception as e:
        logger.error(f"Local file upload failed: {e}")
        return jsonify({'error': 'Upload failed'}), 500

@app.route('/upload-status/<upload_id>', methods=['GET'])
def get_upload_status(upload_id):
    """Get upload status"""
    if upload_id not in mock_uploads:
        return jsonify({'error': 'Upload not found'}), 404
    
    return jsonify(mock_uploads[upload_id])

@app.route('/uploads/complete', methods=['POST'])
def complete_upload():
    """Complete file upload and register asset"""
    try:
        logger.info("Upload completion request received")
        data = request.get_json()
        logger.info(f"Completion data: {data}")
        
        if not data or 'uploadId' not in data:
            return jsonify({'error': 'uploadId is required'}), 400
            
        upload_id = data['uploadId']
        object_key = data.get('objectKey', '')
        creator = data.get('creator', 'anonymous')
        email = data.get('email', '')
        
        if upload_id not in mock_uploads:
            return jsonify({'error': 'Upload not found'}), 404
            
        # Update upload record
        mock_uploads[upload_id].update({
            'status': 'completed',
            'creator': creator,
            'email': email,
            'completedAt': datetime.now(timezone.utc).isoformat()
        })
        
        asset_id = f"asset_{int(time.time())}_{upload_id[:8]}"
        
        try:
            from PIL import Image
            import io
            import imagehash
            
            file_path = f"/tmp/hatchmark-uploads/{upload_id}_{mock_uploads[upload_id]['filename']}"
            
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    image = Image.open(io.BytesIO(f.read()))
                    perceptual_hash = str(imagehash.phash(image))
                    print(f"Registration: Calculated perceptual hash: {perceptual_hash}")
            else:
                print(f"Warning: File not found at {file_path}, using fallback hash")
                perceptual_hash = f"hash_{hash(object_key + creator) % 1000000:06d}"
        
        except Exception as e:
            print(f"Error calculating perceptual hash during registration: {e}")
            perceptual_hash = f"hash_{hash(object_key + creator) % 1000000:06d}"
        
        mock_assets[perceptual_hash] = {
            'assetId': asset_id,
            'filename': mock_uploads[upload_id]['filename'],
            'perceptualHash': perceptual_hash,
            'objectKey': object_key,
            'creator': creator,
            'email': email,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'status': 'verified'
        }
        
        logger.info(f"Asset registered: {asset_id} with hash: {perceptual_hash}")
        
        return jsonify({
            'assetId': asset_id,
            'perceptualHash': perceptual_hash,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'message': 'Upload completed and asset registered'
        })
        
    except Exception as e:
        logger.error(f"Upload completion failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/uploads/check-duplicate', methods=['POST'])
def check_duplicate():
    """Check if uploaded file already exists in the registry"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.content_type.startswith('image/'):
            return jsonify({'error': 'Only image files are supported'}), 400
        
        # Calculate perceptual hash
        try:
            from PIL import Image
            import io
            import imagehash
            
            file_content = file.read()
            image = Image.open(io.BytesIO(file_content))
            perceptual_hash = str(imagehash.phash(image))
            
            print(f"Duplicate check: Calculated hash: {perceptual_hash}")
            
            if perceptual_hash in mock_assets:
                existing_asset = mock_assets[perceptual_hash]
                return jsonify({
                    'isDuplicate': True,
                    'existingAsset': {
                        'assetId': existing_asset['assetId'],
                        'filename': existing_asset['filename'],
                        'creator': existing_asset.get('creator', 'Unknown'),
                        'timestamp': existing_asset['timestamp']
                    },
                    'message': 'This image has already been registered'
                })
            else:
                return jsonify({
                    'isDuplicate': False,
                    'message': 'Image is unique and can be uploaded'
                })
        
        except Exception as e:
            print(f"Error calculating hash for duplicate check: {e}")
            return jsonify({'error': f'Error processing image: {str(e)}'}), 500
    
    except Exception as e:
        logger.error(f"Duplicate check failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/verify', methods=['GET', 'POST'])
def verify_asset():
    """Verify asset authenticity"""
    try:
        if request.method == 'GET':
            # Handle search by asset ID
            asset_id = request.args.get('assetId')
            if not asset_id:
                return jsonify({'error': 'assetId parameter required'}), 400
            
            # Search in mock assets
            for asset_hash, asset in mock_assets.items():
                if asset.get('assetId') == asset_id or asset.get('filename', '').lower().find(asset_id.lower()) >= 0:
                    return jsonify({
                        'assetId': asset['assetId'],
                        'filename': asset.get('filename', 'unknown.jpg'),
                        'status': 'verified',
                        'confidence': 95,
                        'timestamp': asset['timestamp'],
                        'creator': asset.get('creator', 'anonymous')
                    })
            
            # If not found, return unknown status
            return jsonify({
                'assetId': asset_id,
                'filename': f'search-{asset_id}',
                'status': 'unknown',
                'confidence': 0,
                'timestamp': 'not_found',
                'creator': 'unknown'
            })
        
        elif request.method == 'POST':
            # Handle file upload verification
            if 'file' in request.files:
                # File upload verification
                file = request.files['file']
                if file.filename == '':
                    return jsonify({'error': 'No file selected'}), 400
                
                if file and file.content_type.startswith('image/'):
                    # Read file for processing
                    file_content = file.read()
                    file_size = len(file_content)
                    
                    # Calculate perceptual hash of uploaded file (same as during registration)
                    try:
                        from PIL import Image
                        import io
                        import imagehash
                        
                        # Open image and calculate perceptual hash
                        image = Image.open(io.BytesIO(file_content))
                        perceptual_hash = str(imagehash.phash(image))
                        
                        print(f"Verification: Calculated perceptual hash: {perceptual_hash}")
                        
                        if perceptual_hash in mock_assets:
                            found_asset = mock_assets[perceptual_hash]
                            print(f"Verification: Found matching asset: {found_asset['assetId']}")
                            
                            return jsonify({
                                'assetId': found_asset['assetId'],
                                'filename': file.filename,
                                'originalFilename': found_asset.get('filename', 'unknown'),
                                'status': 'verified',
                                'confidence': 98,
                                'timestamp': found_asset['timestamp'],
                                'creator': found_asset.get('creator', 'anonymous'),
                                'verification_note': 'Image content verified by digital fingerprint'
                            })
                        else:
                            print(f"Verification: No matching asset found for hash: {perceptual_hash}")
                            
                            return jsonify({
                                'assetId': 'unknown',
                                'filename': file.filename,
                                'status': 'unknown',
                                'confidence': 0,
                                'timestamp': datetime.now(timezone.utc).isoformat(),
                                'creator': 'unknown',
                                'verification_note': 'Image not found in authenticity registry'
                            })
                    
                    except Exception as e:
                        print(f"Error calculating perceptual hash: {e}")
                        return jsonify({'error': f'Error processing image: {str(e)}'}), 500
                else:
                    return jsonify({'error': 'Please upload an image file'}), 400
            
            else:
                data = request.get_json()
                if not data:
                    return jsonify({'error': 'JSON data or file required'}), 400
                
                if 'hash' in data:
                    asset_hash = data['hash']
                    
                    # Mock verification logic
                    if asset_hash in mock_assets:
                        asset = mock_assets[asset_hash]
                        return jsonify({
                            'verified': True,
                            'asset': asset,
                            'verification_time': datetime.now(timezone.utc).isoformat()
                        })
                    else:
                        return jsonify({
                            'verified': False,
                            'message': 'Asset not found in registry',
                            'verification_time': datetime.now(timezone.utc).isoformat()
                        })
                
                elif 'objectKey' in data:
                    object_key = data['objectKey']
                    
                    mock_hash = f"hash_{hash(object_key) % 1000000:06d}"
                    
                    asset_id = str(uuid.uuid4())
                    asset_record = {
                        'assetId': asset_id,
                        'perceptualHash': mock_hash,
                        'objectKey': object_key,
                        'status': 'verified',
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'metadata': {
                            'source': 'local_dev',
                            'verification_method': 'object_key'
                        }
                    }
                    
                    mock_assets[mock_hash] = asset_record
                    
                    return jsonify({
                        'verified': True,
                        'asset': asset_record,
                        'verification_time': datetime.now(timezone.utc).isoformat()
                    })
                
                else:
                    return jsonify({'error': 'hash or objectKey required'}), 400
            
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/ledger', methods=['GET'])
def get_ledger():
    """Get ledger entries"""
    return jsonify({
        'assets': list(mock_assets.values()),
        'total_count': len(mock_assets),
        'timestamp': datetime.now(timezone.utc).isoformat()
    })

@app.route('/ledger', methods=['POST'])
def add_to_ledger():
    """Add entry to ledger"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'JSON data required'}), 400
        
        asset_id = str(uuid.uuid4())
        
        asset_record = {
            'assetId': asset_id,
            'perceptualHash': data.get('perceptualHash', ''),
            'objectKey': data.get('objectKey', ''),
            'creatorId': data.get('creatorId', 'anonymous'),
            'status': 'registered',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'metadata': data.get('metadata', {})
        }
        
        if asset_record['perceptualHash']:
            mock_assets[asset_record['perceptualHash']] = asset_record
        
        return jsonify({
            'success': True,
            'assetId': asset_id,
            'documentId': asset_id,  # For compatibility
            'asset': asset_record
        })
        
    except Exception as e:
        logger.error(f"Ledger entry failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/process', methods=['POST'])
def process_asset():
    """Process asset (compute hash and add to ledger)"""
    try:
        data = request.get_json()
        if not data or 'objectKey' not in data:
            return jsonify({'error': 'objectKey is required'}), 400
        
        object_key = data['objectKey']
        
        # Extract upload_id from object_key (format: uploads/{upload_id}/{filename})
        import re
        match = re.search(r'uploads/([^/]+)/', object_key)
        upload_id = match.group(1) if match else None
        
        image_data = None
        
        # Try to get from local file first (for development)
        if upload_id and upload_id in mock_uploads:
            upload_info = mock_uploads[upload_id]
            if 'localPath' in upload_info:
                try:
                    with open(upload_info['localPath'], 'rb') as f:
                        image_data = f.read()
                    logger.info(f"Using local file: {upload_info['localPath']}")
                except Exception as e:
                    logger.warning(f"Failed to read local file: {e}")
        
        # Fallback to S3 if local file not found
        if not image_data:
            session = get_aws_session()
            if not session:
                return jsonify({'error': 'No local file and AWS session failed'}), 500
            
            s3_client = session.client('s3')
            
            try:
                # Download the image
                response = s3_client.get_object(Bucket=INGESTION_BUCKET, Key=object_key)
                image_data = response['Body'].read()
                logger.info(f"Using S3 file: s3://{INGESTION_BUCKET}/{object_key}")
            except Exception as e:
                logger.error(f"Failed to get file from S3: {e}")
                return jsonify({'error': 'File not found in local storage or S3'}), 404
        
        if not image_data:
            return jsonify({'error': 'No image data found'}), 404
            
        # Compute perceptual hash
        import imagehash
        from PIL import Image
        import io
        
        image = Image.open(io.BytesIO(image_data))
        perceptual_hash = str(imagehash.phash(image))
        
        # Add to ledger (DynamoDB)
        session = get_aws_session()
        if session:
            try:
                import boto3
                dynamodb = session.resource('dynamodb')
                table = dynamodb.Table('hatchmark-assets')
                
                asset_id = str(uuid.uuid4())
                timestamp = datetime.now(timezone.utc).isoformat()
                
                # Add to DynamoDB
                table.put_item(Item={
                    'assetId': asset_id,
                    'perceptualHash': perceptual_hash,
                    'objectKey': object_key,
                    'timestamp': timestamp,
                    'status': 'REGISTERED',
                    'creatorId': 'demo-user'
                })
                
                processed_key = object_key.replace('uploads/', 'watermarked/')
                
                return jsonify({
                    'success': True,
                    'assetId': asset_id,
                    'perceptualHash': perceptual_hash,
                    'originalKey': object_key,
                    'processedKey': processed_key,
                    'timestamp': timestamp,
                    'watermark_applied': True
                })
                
            except ClientError as e:
                logger.error(f"DynamoDB error: {e}")
                return jsonify({'error': 'Failed to save to ledger'}), 500
        else:
            processed_key = object_key.replace('uploads/', 'watermarked/')
            return jsonify({
                'success': True,
                'assetId': 'local-' + str(uuid.uuid4()),
                'perceptualHash': perceptual_hash,
                'originalKey': object_key,
                'processedKey': processed_key,
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'watermark_applied': True
            })
        
    except Exception as e:
        logger.error(f"Asset processing failed: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("Starting Hatchmark Local Development Server...")
    print("Frontend should connect to: http://localhost:3002")
    print("Available endpoints:")
    print("  GET  /health")
    print("  POST /uploads/initiate")
    print("  POST /uploads/check-duplicate")
    print("  POST /uploads/complete")
    print("  GET  /upload-status/<id>")
    print("  POST /verify")
    print("  GET  /ledger")
    print("  POST /ledger")
    print("  POST /process")
    
    app.run(host='0.0.0.0', port=3002, debug=True)
