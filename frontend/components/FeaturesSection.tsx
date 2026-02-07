import { Shield, Database, Eye, Zap, Lock, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Immutable Ledger",
    description: "Every piece of content gets a permanent, tamper-proof record in our quantum ledger database."
  },
  {
    icon: Eye,
    title: "Invisible Watermarking",
    description: "Embed robust, invisible watermarks that survive compression, editing, and format changes."
  },
  {
    icon: Database,
    title: "Cryptographic Verification",
    description: "Advanced algorithms ensure the integrity and authenticity of your digital assets."
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "Lightning-fast processing ensures your work is protected within seconds of upload."
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description: "Bank-level security with end-to-end encryption and secure cloud infrastructure."
  },
  {
    icon: CheckCircle,
    title: "Global Verification",
    description: "Anyone can verify the authenticity of your work through our public verification system."
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24">
      <div className="max-width section-padding">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
            Bulletproof protection for your creative work
          </h2>
          <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
            Leverage enterprise-grade AWS infrastructure to create an unbreakable chain of authenticity for your digital creations.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.title}
                className="p-6 rounded-lg border border-border bg-card card-hover"
              >
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Technical Stack */}
        <div className="mt-20 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-8">
            Powered by enterprise AWS infrastructure
          </h3>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <div>AWS QLDB</div>
            <div>•</div>
            <div>AWS Fargate</div>
            <div>•</div>
            <div>AWS Lambda</div>
            <div>•</div>
            <div>Amazon S3</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;