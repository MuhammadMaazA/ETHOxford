import Header from "@/components/Header";
import UploadSection from "@/components/UploadSection";
import { Shield, Clock, FileImage, CheckCircle2, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Upload = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
        <div className="max-width section-padding relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-balance mb-8 leading-tight">
              Protect your work in{" "}
              <span className="gradient-text">seconds</span>
            </h1>
            
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto mb-12">
              Upload your creative work and we'll create an immutable record with invisible watermarking. Your content is protected from the moment it touches our servers.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                End-to-end encrypted
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                GDPR compliant
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                SOC 2 Type II certified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Component */}
      <UploadSection />

      {/* Process Explanation */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
              How the magic happens
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Our three-step process ensures your work is protected with military-grade security and mathematical precision.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: FileImage,
                title: "File Analysis",
                description: "Your file is analyzed and a unique cryptographic hash is generated using SHA-256 algorithms.",
                details: ["Metadata extraction", "Hash generation", "Format validation"],
                epic: true
              },
              {
                step: "02", 
                icon: Shield,
                title: "Watermark Embedding",
                description: "Invisible watermarks are embedded using advanced steganography that survives compression and editing.",
                details: ["Steganographic encoding", "Redundant embedding", "Quality preservation"],
                epic: true
              },
              {
                step: "03",
                icon: CheckCircle2,
                title: "Ledger Registration",
                description: "The cryptographic proof is permanently recorded in our quantum ledger database for immutable verification.",
                details: ["QLDB registration", "Timestamp certification", "Global distribution"],
                epic: false
              }
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div 
                  key={step.step}
                  className={`card-epic relative ${step.epic ? 'epic-glow' : ''}`}
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg epic-glow">
                    {step.step}
                  </div>
                  
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {step.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security Notice */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="max-w-4xl mx-auto">
            <div className="card-epic bg-warning/5 border-warning/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-warning/10 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Important Security Information
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      • Original files are processed in secure, encrypted containers and are never permanently stored
                    </p>
                    <p>
                      • Only cryptographic hashes and watermarked versions are retained for verification purposes
                    </p>
                    <p>
                      • All data transmission uses TLS 1.3 encryption with perfect forward secrecy
                    </p>
                    <p>
                      • Processing occurs in isolated AWS Fargate containers that are destroyed after each session
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Stats */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Lightning-fast performance
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Our infrastructure is optimized for speed without compromising security.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { stat: "< 2 sec", label: "Average processing time", icon: Clock },
              { stat: "99.9%", label: "Uptime guarantee", icon: Zap },
              { stat: "256-bit", label: "Encryption strength", icon: Shield },
              { stat: "< 1%", label: "Quality degradation", icon: FileImage }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.label}
                  className="card-epic text-center"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-3xl font-bold gradient-text mb-2">{item.stat}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Need help or have questions?
            </h2>
            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
              Our support team is here to help you get the most out of Hatchmark's protection features.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="outline">
                Contact Support
              </Button>
              <Link to="/verify">
                <Button size="lg" className="epic-glow">
                  Verify Content
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Upload;