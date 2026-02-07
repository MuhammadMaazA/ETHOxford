// Environment Detection
const isProduction = process.env.NODE_ENV === 'production';
const isVercelDeployment = process.env.VERCEL === '1';

// API Configuration - Prioritize Vercel environment variables for production
export const API_BASE_URL = isVercelDeployment 
  ? (process.env.NEXT_PUBLIC_API_GATEWAY_URL || import.meta.env.VITE_API_URL || 'http://localhost:3002')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3002');

// Demo Mode Configuration (protects your production AWS)
export const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
export const DEMO_API_URL = import.meta.env.VITE_DEMO_API_URL;

// Lambda Function Names (for direct invocation)
const environmentSuffix = isProduction ? 'prod' : 'dev';
export const LAMBDA_FUNCTIONS = {
    GENERATE_URL: import.meta.env.VITE_LAMBDA_GENERATE_URL || `hatchmark-generate-url-${environmentSuffix}`,
    REGISTER_ASSET: import.meta.env.VITE_LAMBDA_REGISTER_ASSET || `hatchmark-register-asset-${environmentSuffix}`, 
    VERIFY_ARTWORK: import.meta.env.VITE_LAMBDA_VERIFY_ARTWORK || `hatchmark-verify-${environmentSuffix}`,
    DUPLICATE_CHECK: import.meta.env.VITE_LAMBDA_DUPLICATE_CHECK || `hatchmark-duplicate-check-${environmentSuffix}`
} as const;

// AWS Configuration - Support both Vite and Next.js environment variables
export const AWS_CONFIG = {
    REGION: process.env.NEXT_PUBLIC_AWS_REGION || import.meta.env.VITE_AWS_REGION || 'us-east-1',
    INGESTION_BUCKET: IS_DEMO_MODE 
        ? 'hatchmark-demo-bucket' 
        : (process.env.NEXT_PUBLIC_INGESTION_BUCKET || import.meta.env.VITE_INGESTION_BUCKET || `hatchmark-ingestion-bucket-${environmentSuffix}-581150859000`),
    PROCESSED_BUCKET: IS_DEMO_MODE 
        ? 'hatchmark-demo-processed' 
        : (process.env.NEXT_PUBLIC_PROCESSED_BUCKET || import.meta.env.VITE_PROCESSED_BUCKET || `hatchmark-processed-bucket-${environmentSuffix}-581150859000`)
} as const;

export const API_ENDPOINTS = {
    UPLOAD_INITIATE: '/uploads/initiate',
    VERIFY: '/verify'
} as const;

// App Configuration
export const APP_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    UPLOAD_TIMEOUT: 30000, // 30 seconds
} as const;
