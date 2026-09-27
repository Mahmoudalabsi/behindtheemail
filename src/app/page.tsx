"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import Hero from "@/components/sections/Hero";
import LiveResults from "@/components/sections/LiveResults";
import Stats from "@/components/sections/Stats";
import SupportedServices from "@/components/sections/SupportedServices";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import BulkSearchDemo from "@/components/sections/BulkSearchDemo";
import ExampleProfile from "@/components/sections/ExampleProfile";
import UseCases from "@/components/sections/UseCases";
import Pricing from "@/components/sections/Pricing";
import FAQ from "@/components/sections/FAQ";
import ContactCTA from "@/components/sections/ContactCTA";

export default function Home() {
  const [searchedEmail, setSearchedEmail] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // When user searches, scroll to results section
  useEffect(() => {
    if (searchedEmail) {
      // wait a tick so the section is rendered
      const t = setTimeout(() => {
        document.getElementById("search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [searchedEmail]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1117] text-[#F2F7FB]">
      <Header />
      <main className="flex-1">
        <Hero onSearch={setSearchedEmail} />
        {searchedEmail && (
          <div ref={resultsRef}>
            <LiveResults email={searchedEmail} key={searchedEmail} />
          </div>
        )}
        <Stats />
        <SupportedServices />
        <Features />
        <HowItWorks />
        <BulkSearchDemo />
        <ExampleProfile />
        <UseCases />
        <Pricing />
        <FAQ />
        <ContactCTA />
      </main>
      <Footer />
    </div>
  );
}
