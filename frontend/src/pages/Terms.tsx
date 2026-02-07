import Header from "@/components/Header";
import { Calendar, Shield, User, FileText } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <section className="pt-24 pb-16">
        <div className="max-width section-padding">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-balance mb-6">
                Terms of Service
              </h1>
              <p className="text-xl text-muted-foreground">
                Last updated: December 2024
              </p>
            </div>

            <div className="card-minimal space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Agreement to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using Hatchmark ("the Service"), you agree to be bound by these Terms of Service ("Terms"). 
                  If you disagree with any part of these terms, then you may not access the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Description of Service
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Hatchmark provides digital authenticity services including:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Cryptographic hashing and verification of digital content</li>
                  <li>Invisible watermarking technology</li>
                  <li>Immutable ledger recording using AWS QLDB</li>
                  <li>Public verification and API access</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  User Accounts
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    When you create an account with us, you must provide information that is accurate, complete, and current at all times.
                  </p>
                  <p>
                    You are responsible for safeguarding the password and for all activities that occur under your account.
                  </p>
                  <p>
                    You must not use our service for any illegal or unauthorized purpose.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Content Rights
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    You retain all rights to the content you upload to Hatchmark. We only store cryptographic hashes 
                    and metadata necessary for verification purposes.
                  </p>
                  <p>
                    By using our service, you grant us permission to process your content for the purpose of 
                    generating cryptographic proofs and watermarks.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security and Privacy
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We implement industry-standard security measures to protect your data, including end-to-end 
                    encryption and SOC 2 Type II compliance.
                  </p>
                  <p>
                    Original files are processed in secure containers and are not permanently stored on our servers.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Limitation of Liability
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  In no event shall Hatchmark be liable for any indirect, incidental, special, consequential, 
                  or punitive damages resulting from your use of the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Changes to Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. We will notify users of significant 
                  changes via email or through the service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Contact Information
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us at legal@hatchmark.com
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Terms;