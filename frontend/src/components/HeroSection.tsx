import { Button } from "./ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero-minimal.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />

      {/* Main Content */}
      <div className="relative z-10 max-width section-padding text-center">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-balance mb-8 leading-tight">
            Prove the authenticity of your{" "}
            <span className="text-muted-foreground">digital creative work</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground text-balance max-w-2xl mx-auto mb-12">
            Create an immutable, verifiable record of your creative works using cryptographic hashing and invisible watermarking technology.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link to="/get-started">
              <Button size="lg" className="group">
                Start Protecting Your Work
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="outline" size="lg">
                View Documentation
              </Button>
            </Link>
          </div>

          {/* Social Proof / Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              Immutable Records
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              Invisible Watermarking
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-success" />
              Instant Verification
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;