import Header from "@/components/Header";
import VerificationSection from "@/components/VerificationSection";
import { Search, Shield, CheckCircle, Clock, FileImage, Database, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Verify = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <div className="max-width section-padding relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-balance mb-8 leading-tight">
              Verify authenticity{" "}
              <span className="gradient-text">instantly</span>
            </h1>
            
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto mb-12">
              Check if any digital content has been registered in our immutable ledger. Get instant verification results with detailed authenticity reports powered by cryptographic proof.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Cryptographic verification
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Global accessibility
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Real-time results
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Component */}
      <VerificationSection />

      {/* Verification Methods */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
              Multiple verification methods
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Choose the verification method that works best for your workflow and requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: "Hash Lookup",
                description: "Verify using the unique cryptographic hash of your content. Most accurate method for exact matches.",
                features: ["SHA-256 hash verification", "Instant results", "100% accuracy"],
                epic: true
              },
              {
                icon: FileImage,
                title: "Image Upload",
                description: "Upload an image to detect embedded invisible watermarks and verify against our database.",
                features: ["Watermark detection", "Format-agnostic", "Compression-resistant"],
                epic: true
              },
              {
                icon: Database,
                title: "Batch Verification",
                description: "Verify multiple files at once using our API or bulk upload interface for enterprise workflows.",
                features: ["API integration", "Bulk processing", "Automated workflows"],
                epic: false
              }
            ].map((method, index) => {
              const Icon = method.icon;
              return (
                <div 
                  key={method.title}
                  className={`card-epic ${method.epic ? 'epic-glow' : ''}`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {method.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {method.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {method.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Understanding Results */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Understanding verification results
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Learn how to interpret verification results and what each status means for content authenticity.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                status: "verified",
                icon: CheckCircle,
                title: "Verified ✓",
                description: "Content is authentic and registered in our ledger",
                color: "success",
                details: [
                  "Exact match found in database",
                  "Cryptographic integrity confirmed", 
                  "Original creator identified",
                  "Registration timestamp verified"
                ]
              },
              {
                status: "unverified",
                icon: AlertCircle,
                title: "Unverified ⚠",
                description: "Content could not be verified or is not registered",
                color: "warning",
                details: [
                  "No match found in database",
                  "Content may be modified",
                  "Watermark may be removed",
                  "Never registered with Hatchmark"
                ]
              },
              {
                status: "processing",
                icon: Clock,
                title: "Processing ⏳",
                description: "Verification is in progress, please wait",
                color: "primary",
                details: [
                  "Analyzing content structure",
                  "Scanning for watermarks",
                  "Checking database records",
                  "Generating confidence score"
                ]
              }
            ].map((result, index) => (
              <div 
                key={result.status}
                className="card-epic"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`p-3 bg-${result.color}/10 rounded-xl w-fit mb-4`}>
                  <result.icon className={`w-6 h-6 text-${result.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {result.title}
                </h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {result.description}
                </p>
                
                <ul className="space-y-2">
                  {result.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full mt-2" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Access */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              API for developers
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Integrate Hatchmark's verification capabilities directly into your applications with our RESTful API.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="card-epic bg-card/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    Easy integration
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Simple REST endpoints with comprehensive documentation and SDKs for popular programming languages.
                  </p>
                  
                  <ul className="space-y-3">
                    {[
                      "RESTful API with JSON responses",
                      "Rate limiting and authentication",
                      "Webhooks for real-time updates", 
                      "SDKs for Python, Node.js, and more"
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Example API call:</div>
                  <pre className="text-xs text-foreground overflow-x-auto">
{`curl -X POST https://api.hatchmark.com/verify \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"hash": "sha256:abc123..."}'`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Start verifying content today
            </h2>
            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
              Join the global network of creators and businesses using Hatchmark for content verification.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started">
                <Button size="lg" className="epic-glow">
                  Get API Access
                </Button>
              </Link>
              <Link to="/upload">
                <Button variant="outline" size="lg">
                  Protect Content
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Verify;