import Header from "@/components/Header";
import { Shield, Database, Eye, Lock, Users, FileText } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      <section className="pt-24 pb-16">
        <div className="max-width section-padding">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-balance mb-6">
                Privacy Policy
              </h1>
              <p className="text-xl text-muted-foreground">
                Last updated: December 2024
              </p>
            </div>

            <div className="card-minimal space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Information We Collect
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Account Information:</strong> Email address, name, company (optional), and password.
                  </p>
                  <p>
                    <strong>Content Metadata:</strong> File hashes, timestamps, and verification records. We do not store your original files.
                  </p>
                  <p>
                    <strong>Usage Data:</strong> Information about how you use our service, including API calls and verification requests.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  How We Use Your Information
                </h2>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Provide and maintain our digital authenticity services</li>
                  <li>Generate cryptographic proofs and verification records</li>
                  <li>Communicate with you about your account and service updates</li>
                  <li>Improve and optimize our service performance</li>
                  <li>Ensure security and prevent fraud</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Data Security
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We implement industry-leading security measures including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>End-to-end encryption for all data transmission</li>
                    <li>SOC 2 Type II certified infrastructure</li>
                    <li>AWS security best practices and compliance</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>Zero-trust network architecture</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Data Processing and Storage
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    <strong>Original Files:</strong> Processed in secure, isolated containers and never permanently stored. 
                    Files are automatically deleted after processing.
                  </p>
                  <p>
                    <strong>Verification Data:</strong> Cryptographic hashes and metadata are stored in our quantum 
                    ledger database for verification purposes.
                  </p>
                  <p>
                    <strong>Data Location:</strong> All data is processed and stored in secure AWS facilities with 
                    geographic redundancy.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Data Sharing
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    We do not sell, trade, or otherwise transfer your personal information to third parties, except:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Service providers who assist in our operations (under strict confidentiality agreements)</li>
                    <li>When required by law or to protect our rights</li>
                    <li>In connection with a business transfer (with user notification)</li>
                  </ul>
                  <p>
                    <strong>Public Verification:</strong> Verification records (hashes and timestamps) are publicly 
                    accessible for authenticity checking, but contain no personal information.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Your Rights
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>You have the right to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Access and review your personal data</li>
                    <li>Request correction of inaccurate information</li>
                    <li>Request deletion of your account and associated data</li>
                    <li>Export your verification records</li>
                    <li>Opt out of marketing communications</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Cookies and Analytics
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use essential cookies for service functionality and analytics cookies to improve our service. 
                  You can control cookie preferences through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  International Data Transfers
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Your data may be processed in countries other than your residence. We ensure appropriate 
                  safeguards are in place for international transfers.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy periodically. We will notify you of significant changes 
                  via email or through our service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Contact Us
                </h2>
                <div className="text-muted-foreground leading-relaxed">
                  <p>For privacy-related questions or requests, contact us at:</p>
                  <p className="mt-2">
                    <strong>Email:</strong> privacy@hatchmark.com<br/>
                    <strong>Address:</strong> Hatchmark Privacy Office, 123 Tech Street, San Francisco, CA 94105
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Privacy;