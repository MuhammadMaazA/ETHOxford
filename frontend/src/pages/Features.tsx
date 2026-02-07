import Header from "@/components/Header";
import { Shield, Database, Eye, Zap, Lock, CheckCircle, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Shield,
    title: "Immutable Ledger",
    description: "Every piece of content gets a permanent, tamper-proof record in our quantum ledger database powered by AWS QLDB.",
    benefits: ["Cryptographically secured", "Tamper-proof records", "Blockchain-like integrity"],
    epic: true
  },
  {
    icon: Eye,
    title: "Invisible Watermarking",
    description: "Embed robust, invisible watermarks that survive compression, editing, and format changes using advanced steganography.",
    benefits: ["Survives compression", "Invisible to naked eye", "Multiple encoding methods"],
    epic: true
  },
  {
    icon: Database,
    title: "Cryptographic Verification",
    description: "Advanced SHA-256 algorithms ensure the integrity and authenticity of your digital assets with mathematical precision.",
    benefits: ["SHA-256 hashing", "Digital fingerprinting", "Collision-resistant"],
    epic: false
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "Lightning-fast processing with AWS Fargate ensures your work is protected within seconds of upload.",
    benefits: ["Sub-second processing", "Auto-scaling", "Global edge distribution"],
    epic: false
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description: "Bank-level security with end-to-end encryption, secure cloud infrastructure, and SOC 2 compliance.",
    benefits: ["End-to-end encryption", "SOC 2 compliant", "Zero-trust architecture"],
    epic: false
  },
  {
    icon: CheckCircle,
    title: "Global Verification",
    description: "Anyone can verify the authenticity of your work through our public verification system and API.",
    benefits: ["Public verification", "REST API access", "Global accessibility"],
    epic: false
  }
];

const Features = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="max-width section-padding relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-balance mb-8 leading-tight">
              Features that make your work{" "}
              <span className="gradient-text">unbreakable</span>
            </h1>
            
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto mb-12">
              Discover the cutting-edge technology stack that powers Hatchmark's revolutionary approach to digital authenticity and content protection.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started">
                <Button size="lg" className="epic-glow group">
                  Start Protecting Now
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="outline" size="lg" className="group">
                  <Play className="w-4 h-4 mr-2" />
                  Try Verification Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className={`card-epic group ${feature.epic ? 'epic-glow' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors ${feature.epic ? 'animate-pulse-epic' : ''}`}>
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:gradient-text transition-all">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {feature.description}
                      </p>
                      
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="w-4 h-4 text-success" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technical Deep Dive */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
              Built on enterprise-grade infrastructure
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Hatchmark leverages the most advanced AWS services to deliver unmatched reliability, security, and performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { name: "AWS QLDB", desc: "Quantum Ledger Database for immutable records", epic: true },
              { name: "AWS Fargate", desc: "Serverless containers for watermarking", epic: true },
              { name: "AWS Lambda", desc: "Event-driven serverless compute", epic: false },
              { name: "Amazon S3", desc: "Secure, scalable object storage", epic: false }
            ].map((tech, index) => (
              <div key={tech.name} className={`card-epic text-center ${tech.epic ? 'epic-glow' : ''}`}>
                <h3 className="font-semibold text-foreground mb-2">{tech.name}</h3>
                <p className="text-sm text-muted-foreground">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Ready to protect your creative work?
            </h2>
            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
              Join thousands of creators who trust Hatchmark to secure their digital assets.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started">
                <Button size="lg" className="epic-glow">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Features;