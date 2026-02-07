import { NextRequest, NextResponse } from 'next/server';
import FormData from 'form-data';

// Use Node.js runtime for better binary handling
export const runtime = 'nodejs';

export interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number; // 0-100
  aiProbability: number; // 0-1
  deepfakeProbability: number; // 0-1
  qualityScore: number; // 0-1
  detectedType?: string;
  processingTime: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, imageUrl } = await request.json();

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    const apiUser = process.env.SIGHTENGINE_API_USER;
    const apiSecret = process.env.SIGHTENGINE_API_SECRET;

    // Check if API credentials are configured
    if (!apiUser || !apiSecret || apiUser === 'your_api_user_here') {
      console.log('Sightengine API not configured, using mock response');
      return NextResponse.json(getMockResponse());
    }

    const startTime = Date.now();

    if (imageBase64) {
      // Convert base64 to binary buffer
      const rawBase64 = imageBase64.includes(',') 
        ? imageBase64.split(',')[1] 
        : imageBase64;
      
      // Detect mime type from data URL
      let mimeType = 'image/jpeg';
      let extension = 'jpg';
      if (imageBase64.includes('data:')) {
        const match = imageBase64.match(/data:([^;]+);/);
        if (match) {
          mimeType = match[1];
          if (mimeType.includes('png')) extension = 'png';
          else if (mimeType.includes('webp')) extension = 'webp';
          else if (mimeType.includes('gif')) extension = 'gif';
        }
      }

      const imageBuffer = Buffer.from(rawBase64, 'base64');
      
      // Create form data using form-data package
      const form = new FormData();
      form.append('models', 'genai');
      form.append('api_user', apiUser);
      form.append('api_secret', apiSecret);
      form.append('media', imageBuffer, {
        filename: `image.${extension}`,
        contentType: mimeType,
      });

      // Make request using node's https
      const response = await new Promise<{ status: string; type?: { ai_generated?: number }; error?: { message?: string } }>((resolve, reject) => {
        form.submit('https://api.sightengine.com/1.0/check.json', (err, res) => {
          if (err) {
            reject(err);
            return;
          }
          
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Invalid JSON response: ${data}`));
            }
          });
          res.on('error', reject);
        });
      });

      console.log('Sightengine response:', JSON.stringify(response, null, 2));
      const processingTime = Date.now() - startTime;

      // Check for API errors
      if (response.status === 'failure') {
        throw new Error(response.error?.message || 'Sightengine API failure');
      }

      // Parse response
      const aiScore = response.type?.ai_generated || 0;
      
      const result: AIDetectionResult = {
        isAIGenerated: aiScore > 0.5,
        confidence: Math.round(aiScore * 100),
        aiProbability: aiScore,
        deepfakeProbability: 0,
        qualityScore: 1,
        detectedType: getDetectedType(aiScore),
        processingTime,
      };

      return NextResponse.json(result);
    } else {
      // For URL, use GET with query params
      const params = new URLSearchParams({
        models: 'genai',
        api_user: apiUser,
        api_secret: apiSecret,
        url: imageUrl,
      });

      const response = await fetch(`https://api.sightengine.com/1.0/check.json?${params.toString()}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sightengine API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Sightengine response:', JSON.stringify(data, null, 2));
      const processingTime = Date.now() - startTime;

      if (data.status === 'failure') {
        throw new Error(data.error?.message || 'Sightengine API failure');
      }

      const aiScore = data.type?.ai_generated || 0;
      
      const result: AIDetectionResult = {
        isAIGenerated: aiScore > 0.5,
        confidence: Math.round(aiScore * 100),
        aiProbability: aiScore,
        deepfakeProbability: data.face?.synthetic || 0,
        qualityScore: data.quality?.score || 1,
        detectedType: getDetectedType(aiScore),
        processingTime,
      };

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('AI detection error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Detection failed',
      isAIGenerated: false,
      confidence: 0,
      aiProbability: 0,
      deepfakeProbability: 0,
      qualityScore: 1,
      processingTime: 0,
    });
  }
}

function getDetectedType(score: number): string {
  if (score > 0.85) return 'Highly likely AI-generated';
  if (score > 0.7) return 'Likely AI-generated';
  if (score > 0.5) return 'Possibly AI-generated';
  if (score > 0.3) return 'Uncertain';
  return 'Likely authentic';
}

function getMockResponse(): AIDetectionResult {
  const randomScore = Math.random();
  
  return {
    isAIGenerated: randomScore > 0.6,
    confidence: Math.round(randomScore * 100),
    aiProbability: randomScore,
    deepfakeProbability: Math.random() * 0.3,
    qualityScore: 0.7 + Math.random() * 0.3,
    detectedType: getDetectedType(randomScore),
    processingTime: 200 + Math.random() * 300,
  };
}
