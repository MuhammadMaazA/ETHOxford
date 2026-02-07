import Header from "@/components/Header";
import { CheckCircle, Zap, Shield, Crown, Star, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "Perfect for individual creators getting started",
    features: [
      "10 uploads per month",
      "Basic watermarking",
      "Public verification",
      "SHA-256 hashing",
      "Community support"
    ],
    cta: "Get Started Free",
    popular: false,
    epic: false
  },
  {
    name: "Creator",
    price: "$19",
    period: "per month",
    description: "For professional creators and small teams", 
    features: [
      "500 uploads per month",
      "Advanced watermarking",
      "Priority verification",
      "API access",
      "Email support",
      "Custom branding",
      "Batch processing"
    ],
    cta: "Start Free Trial",
    popular: true,
    epic: true
  },
  {
    name: "Business",
    price: "$79",
    period: "per month",
    description: "For agencies and growing businesses",
    features: [
      "2,500 uploads per month",
      "Enterprise watermarking",
      "Advanced analytics",
      "White-label solutions",
      "Priority support",
      "Custom integrations",
      "SLA guarantee",
      "Team management"
    ],
    cta: "Start Free Trial",
    popular: false,
    epic: false
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large organizations with specific needs",
    features: [
      "Unlimited uploads",
      "Custom watermarking",
      "Dedicated infrastructure",
      "24/7 phone support",
      "Custom contracts",
      "On-premise deployment",
      "Advanced security",
      "Compliance certifications"
    ],
    cta: "Contact Sales",
    popular: false,
    epic: true
  }
];

const Pricing = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-success/5" />
        <div className="max-width section-padding relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-balance mb-8 leading-tight">
              Plans that scale with{" "}
              <span className="gradient-text">your success</span>
            </h1>
            
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto mb-12">
              Choose the perfect plan for your needs. Start free and upgrade as you grow. All plans include our core security features and global verification network.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                No setup fees
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                30-day money back
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={plan.name}
                className={`card-epic relative ${plan.epic ? 'epic-glow' : ''} ${plan.popular ? 'border-primary' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold gradient-text">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground ml-1">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to="/get-started" className="block">
                  <Button 
                    className={`w-full ${plan.popular ? 'epic-glow' : ''}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance mb-6">
              Enterprise-grade features
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              All plans include our core security and verification features. Upgrade for advanced capabilities and priority support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Bank-Level Security",
                description: "SOC 2 Type II certified infrastructure with end-to-end encryption and zero-trust architecture.",
                included: "All Plans"
              },
              {
                icon: Zap,
                title: "Lightning Performance",
                description: "Sub-second processing with auto-scaling infrastructure and global edge distribution.",
                included: "All Plans"
              },
              {
                icon: Users,
                title: "24/7 Support",
                description: "Round-the-clock technical support with dedicated account managers for Enterprise customers.",
                included: "Business+"
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={feature.title}
                  className="card-epic"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <div className="inline-flex items-center gap-1 bg-success/10 text-success px-2 py-1 rounded text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    {feature.included}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24">
        <div className="max-width section-padding">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Frequently asked questions
            </h2>
            <p className="text-xl text-muted-foreground text-balance max-w-3xl mx-auto">
              Everything you need to know about our pricing and plans.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {[
              {
                question: "Can I upgrade or downgrade my plan anytime?",
                answer: "Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing cycle."
              },
              {
                question: "What happens if I exceed my monthly upload limit?",
                answer: "Your uploads will be queued until the next billing cycle, or you can upgrade to a higher plan instantly to process them immediately."
              },
              {
                question: "Do you offer discounts for annual billing?",
                answer: "Yes, save 20% when you choose annual billing. This discount applies to all paid plans except Enterprise, which has custom pricing."
              },
              {
                question: "Is there a setup fee or contract required?",
                answer: "No setup fees for any plan. Month-to-month plans have no contract. Annual plans have a 12-month commitment but offer significant savings."
              }
            ].map((faq, index) => (
              <div 
                key={index}
                className="card-epic"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {faq.question}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-muted/30">
        <div className="max-width section-padding">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-balance mb-6">
              Ready to protect your creative work?
            </h2>
            <p className="text-xl text-muted-foreground text-balance mb-8 max-w-2xl mx-auto">
              Start with our free plan and experience the power of immutable content protection.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/get-started">
                <Button size="lg" className="epic-glow">
                  Start Free Trial
                </Button>
              </Link>
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;