import Header from "../components/Header";
import HeroSection from "../components/HeroSection";
import FeaturesSection from "../components/FeaturesSection";
import UploadSection from "../components/UploadSection";
import VerificationSection from "../components/VerificationSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <UploadSection />
        <VerificationSection />
      </main>
    </div>
  );
};

export default Index;
