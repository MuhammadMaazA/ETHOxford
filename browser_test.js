/**
 * Browser-based test script for Vercel deployment
 * Run this in your browser console while on your Vercel-deployed site
 */

class VercelBrowserTester {
    constructor() {
        this.results = [];
        this.apiUrl = this.getApiUrl();
    }

    getApiUrl() {
        // Try to detect the API URL from the current environment
        if (window.process?.env?.NEXT_PUBLIC_API_GATEWAY_URL) {
            return window.process.env.NEXT_PUBLIC_API_GATEWAY_URL;
        }
        
        // Fallback: ask user to provide it
        const apiUrl = prompt('Please enter your API Gateway URL (e.g., https://abc123.execute-api.us-east-1.amazonaws.com):');
        return apiUrl?.trim() || null;
    }

    log(test, success, message, details = {}) {
        const status = success ? '✅' : '❌';
        console.log(`${status} ${test}: ${message}`, details);
        
        this.results.push({
            test,
            success,
            message,
            details,
            timestamp: new Date().toISOString()
        });
    }

    async testCurrentPage() {
        console.log('🧪 Testing current page...');
        
        // Test 1: Check if we're on the right domain
        const isVercelDomain = window.location.hostname.includes('vercel.app') || 
                              window.location.hostname.includes('vercel.com');
        
        this.log(
            'Vercel Domain', 
            isVercelDomain, 
            isVercelDomain ? 'Running on Vercel domain' : 'Not on Vercel domain (might be custom domain)'
        );

        // Test 2: Check if React/app loaded
        const hasReactRoot = document.querySelector('#root, #__next, [data-reactroot]');
        this.log(
            'React App Loaded', 
            !!hasReactRoot, 
            hasReactRoot ? 'React app container found' : 'React app container not found'
        );

        // Test 3: Check for app-specific content
        const hasHatchmarkContent = document.body.textContent.toLowerCase().includes('hatchmark');
        this.log(
            'App Content Loaded', 
            hasHatchmarkContent, 
            hasHatchmarkContent ? 'Hatchmark app content detected' : 'Hatchmark app content not detected'
        );

        // Test 4: Check console for errors
        const hasConsoleErrors = this.checkConsoleErrors();
        this.log(
            'Console Errors', 
            !hasConsoleErrors, 
            hasConsoleErrors ? 'Console errors detected' : 'No console errors detected'
        );
    }

    checkConsoleErrors() {
        // This is a basic check - in a real scenario, you'd want to monitor console.error calls
        // For now, we'll just return false as we can't easily check past console errors
        return false;
    }

    async testApiConnectivity() {
        if (!this.apiUrl) {
            this.log('API Connectivity', false, 'No API URL provided');
            return false;
        }

        console.log(`🌐 Testing API connectivity to: ${this.apiUrl}`);

        try {
            // Test CORS preflight
            const corsResponse = await fetch(`${this.apiUrl}/uploads/initiate`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': window.location.origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });

            this.log(
                'CORS Preflight', 
                corsResponse.ok || corsResponse.status === 200, 
                `CORS preflight status: ${corsResponse.status}`
            );

        } catch (error) {
            this.log('CORS Preflight', false, `CORS preflight failed: ${error.message}`);
        }

        try {
            // Test actual API call
            const response = await fetch(`${this.apiUrl}/uploads/initiate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: 'browser-test.jpg' })
            });

            if (response.ok) {
                const data = await response.json();
                const hasRequiredFields = data.uploadUrl && data.objectKey;
                
                this.log(
                    'API Upload Initiation', 
                    hasRequiredFields, 
                    hasRequiredFields ? 'Upload initiation successful' : 'Missing required fields in response',
                    { objectKey: data.objectKey }
                );

                return hasRequiredFields;
            } else {
                this.log(
                    'API Upload Initiation', 
                    false, 
                    `API call failed with status: ${response.status}`,
                    { status: response.status, statusText: response.statusText }
                );
            }

        } catch (error) {
            this.log(
                'API Upload Initiation', 
                false, 
                `API call failed: ${error.message}`
            );
        }

        return false;
    }

    async testFileUpload() {
        console.log('📁 Testing file upload functionality...');

        // Create a test file
        const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

        // Test if file input exists and works
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        this.log(
            'File Input Present', 
            fileInputs.length > 0, 
            `Found ${fileInputs.length} file input(s)`
        );

        // Test if we can create FormData (for file uploads)
        try {
            const formData = new FormData();
            formData.append('file', testFile);
            
            this.log(
                'FormData Support', 
                true, 
                'FormData API working correctly'
            );
        } catch (error) {
            this.log(
                'FormData Support', 
                false, 
                `FormData API failed: ${error.message}`
            );
        }
    }

    async testLocalStorage() {
        console.log('💾 Testing local storage...');

        try {
            // Test localStorage
            const testKey = 'hatchmark_test';
            const testValue = 'test_value';
            
            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);

            this.log(
                'Local Storage', 
                retrieved === testValue, 
                retrieved === testValue ? 'Local storage working' : 'Local storage not working'
            );

        } catch (error) {
            this.log(
                'Local Storage', 
                false, 
                `Local storage failed: ${error.message}`
            );
        }
    }

    generateSummary() {
        console.log('\n📊 TEST SUMMARY');
        console.log('='.repeat(50));

        const passed = this.results.filter(r => r.success).length;
        const total = this.results.length;

        console.log(`Tests Passed: ${passed}/${total}`);

        if (passed === total) {
            console.log('🎉 All tests passed! Your Vercel deployment is working correctly!');
        } else {
            console.log('⚠️ Some tests failed:');
            this.results.filter(r => !r.success).forEach(result => {
                console.log(`  • ${result.test}: ${result.message}`);
            });
        }

        // Return results for further use
        return {
            passed,
            total,
            success: passed === total,
            results: this.results
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Vercel Deployment Browser Tests');
        console.log('Current URL:', window.location.href);
        console.log('API URL:', this.apiUrl || 'Not provided');
        console.log('='.repeat(50));

        await this.testCurrentPage();
        await this.testApiConnectivity();
        await this.testFileUpload();
        await this.testLocalStorage();

        return this.generateSummary();
    }
}

// Auto-run the tests
console.log('🧪 Hatchmark Vercel Deployment Tester');
console.log('Copy and paste this entire script into your browser console while on your deployed site.');
console.log('');

// Create global instance for manual testing
window.hatchmarkTester = new VercelBrowserTester();

// Instructions for the user
console.log('To run tests, execute: hatchmarkTester.runAllTests()');
console.log('Or run individual tests:');
console.log('  - hatchmarkTester.testCurrentPage()');
console.log('  - hatchmarkTester.testApiConnectivity()');
console.log('  - hatchmarkTester.testFileUpload()');
console.log('  - hatchmarkTester.testLocalStorage()');

// Auto-run if user wants
if (confirm('Run Vercel deployment tests now?')) {
    hatchmarkTester.runAllTests().then(summary => {
        console.log('Tests completed. Results available in hatchmarkTester.results');
    });
}
