'use client';

import Link from 'next/link';
import { Shield, Upload, Search, CheckCircle, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 py-24 md:py-32">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 dark:bg-neutral-900 rounded-full text-sm text-neutral-600 dark:text-neutral-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Built on Sui Blockchain
          </div>
          
          <h1 className="text-4xl md:text-6xl font-semibold text-neutral-900 dark:text-white tracking-tight">
            Protect your content
            <br />
            <span className="text-neutral-400 dark:text-neutral-500">on-chain forever</span>
          </h1>
          
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-xl">
            Register image ownership on the blockchain. Verify authenticity instantly. 
            Flag unauthorized use with cryptographic proof.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Register Content
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-white px-6 py-3 rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              <Search className="w-4 h-4" />
              Verify Content
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-24">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-12">
            How it works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-white mb-1">Upload</h3>
                <p className="text-sm text-neutral-500">
                  Upload your image. We compute a unique perceptual hash that identifies your content.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-white mb-1">Register</h3>
                <p className="text-sm text-neutral-500">
                  Your hash is stored on-chain with an immutable timestamp proving ownership.
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-900 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-white mb-1">Verify</h3>
                <p className="text-sm text-neutral-500">
                  Anyone can verify content against the registry. Flag stolen content with proof.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-4xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-4">
            Ready to protect your work?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
            Join creators using blockchain to prove content ownership in the AI age.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-neutral-400" />
              <span className="font-medium text-neutral-900 dark:text-white">Hatchmark</span>
            </div>
            <p className="text-sm text-neutral-500">
              Built on Sui • ETHOxford 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
