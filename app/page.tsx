import {
  Navbar,
  SiteFooter,
  HeroSection,
  HowItWorksSection,
  WhoItsForSection,
  PricingSection,
} from "@ariclear/components";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <WhoItsForSection />
        <PricingSection />
      </main>

      <SiteFooter />
    </div>
  );
}
