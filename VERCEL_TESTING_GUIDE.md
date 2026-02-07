# Vercel Deployment Testing Guide

## Quick Testing Steps

### 1. Automated Testing (Recommended)

#### Python Script Test
```bash
# Run the comprehensive test script
python test_vercel_deployment.py https://your-app.vercel.app https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com

# Example:
python test_vercel_deployment.py https://hatchmark-frontend.vercel.app https://abc123def.execute-api.us-east-1.amazonaws.com
```

#### Browser Console Test
1. Open your Vercel-deployed site in a browser
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Copy and paste the entire contents of `browser_test.js`
5. Follow the prompts to run the tests

### 2. Manual Testing Checklist

#### ✅ Frontend Accessibility
- [ ] Site loads at your Vercel URL
- [ ] No 404 or 500 errors
- [ ] Page loads completely (no loading spinners stuck)
- [ ] Site is responsive on mobile/desktop

#### ✅ Environment Configuration
- [ ] Check browser console for environment variable warnings
- [ ] API calls are going to the correct AWS API Gateway URL
- [ ] No "localhost" references in production

#### ✅ API Connectivity
- [ ] Upload initiation works (try uploading a file)
- [ ] Status checking works
- [ ] Verification functionality works
- [ ] No CORS errors in browser console

#### ✅ Full Workflow Test
- [ ] Upload an image file
- [ ] Image processing completes successfully
- [ ] Can download watermarked image
- [ ] Can verify the watermarked image
- [ ] Duplicate detection works

## Common Issues and Solutions

### Issue: CORS Errors
**Symptoms**: Console errors about CORS, API calls failing
**Solution**: 
1. Check that your API Gateway has CORS enabled
2. Verify the allowed origins include your Vercel domain
3. Update your Vercel environment variables

### Issue: Environment Variables Not Working
**Symptoms**: API calls going to localhost, undefined variables
**Solution**:
1. Check Vercel dashboard → Project Settings → Environment Variables
2. Ensure variables are prefixed with `NEXT_PUBLIC_` or `VITE_`
3. Redeploy after adding variables

### Issue: 404 on API Calls
**Symptoms**: API endpoints returning 404
**Solution**:
1. Verify your API Gateway URL is correct
2. Check that Lambda functions are deployed
3. Test API endpoints directly in Postman/curl

### Issue: File Upload Fails
**Symptoms**: Upload progress stops, S3 errors
**Solution**:
1. Check S3 bucket CORS configuration
2. Verify IAM permissions for Lambda functions
3. Check CloudWatch logs for errors

## Environment Variables Checklist

Ensure these are set in your Vercel project:

### Required Variables
- [ ] `NEXT_PUBLIC_API_GATEWAY_URL` - Your AWS API Gateway URL
- [ ] `NEXT_PUBLIC_AWS_REGION` - AWS region (e.g., us-east-1)
- [ ] `NEXT_PUBLIC_INGESTION_BUCKET` - S3 bucket for uploads
- [ ] `NEXT_PUBLIC_PROCESSED_BUCKET` - S3 bucket for processed files

### Setting Variables in Vercel
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable for Production environment
5. Redeploy your project

## API Gateway Testing

Test your API endpoints directly:

```bash
# Test upload initiation
curl -X POST https://your-api-gateway-url/uploads/initiate \
  -H "Content-Type: application/json" \
  -d '{"filename": "test.jpg"}'

# Test status endpoint
curl -X GET https://your-api-gateway-url/status/test-key

# Test with CORS headers
curl -X OPTIONS https://your-api-gateway-url/uploads/initiate \
  -H "Origin: https://your-vercel-app.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

## Performance Testing

### Load Time Testing
- [ ] Initial page load < 3 seconds
- [ ] API responses < 5 seconds
- [ ] File upload progress shows correctly

### Browser Compatibility
- [ ] Works in Chrome/Chromium
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on mobile browsers

## Security Testing

### Headers Check
- [ ] Security headers present (X-Frame-Options, etc.)
- [ ] HTTPS enforced
- [ ] No sensitive data in client-side code

### CORS Configuration
- [ ] Only allows your domain origins
- [ ] Proper methods allowed
- [ ] Credentials handling correct

## Troubleshooting Commands

### Check Vercel Deployment
```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Check deployment status
vercel ls

# View deployment logs
vercel logs your-deployment-url
```

### Check AWS Resources
```bash
# List Lambda functions
aws lambda list-functions --region us-east-1

# Check API Gateway
aws apigateway get-rest-apis --region us-east-1

# Check S3 buckets
aws s3 ls
```

## Success Criteria

Your deployment is successful when:
- ✅ All automated tests pass
- ✅ You can upload and process an image end-to-end
- ✅ You can verify a watermarked image
- ✅ No console errors during normal usage
- ✅ Site loads quickly and is responsive
- ✅ All API endpoints respond correctly

## Getting Help

If tests fail:
1. Check the detailed error messages
2. Review CloudWatch logs for Lambda functions
3. Verify all environment variables are set correctly
4. Test API endpoints individually
5. Check network tab in browser dev tools for failed requests

Remember: The most important test is the full end-to-end workflow - if you can upload, process, and verify an image successfully, your deployment is working correctly!
