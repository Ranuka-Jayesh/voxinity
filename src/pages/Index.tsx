import { Link } from "react-router-dom";
import LanguageMarquee from "@/components/LanguageMarquee";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import FeatureCard from "@/components/FeatureCard";
import TestimonialCard from "@/components/TestimonialCard";
import StatusBadge from "@/components/StatusBadge";
import SyntheticHero from "@/components/ui/synthetic-hero";
import { Mic, Languages, Volume2, Accessibility, Zap, Globe, Youtube, ArrowRight, Upload, Cpu, Captions } from "lucide-react";

const Index = () => {
  return (
    <main>
      {/* Hero */}
      <SyntheticHero
        title="Understand any video, in your language — instantly."
        badgeLabel="AI-Powered"
        badgeText="Multilingual Dubbing"
        microDetails={[
          "Low-latency processing",
          "Sinhala & Tamil focus",
          "Accessibility-first design",
        ]}
      />

      {/* Trust Row */}
      <section className="border-y border-border py-6">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-4 px-4">
          <StatusBadge variant="success"><Zap size={12} /> Low-latency</StatusBadge>
          <StatusBadge variant="success"><Globe size={12} /> Sinhala / Tamil Focus</StatusBadge>
          <StatusBadge variant="success"><Accessibility size={12} /> Accessibility-first</StatusBadge>
          <StatusBadge variant="success"><Youtube size={12} /> Works on YouTube</StatusBadge>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold">Powerful Features</h2>
            <p className="mt-3 text-muted-foreground">End-to-end multilingual pipeline built for low-resource languages</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Mic}
              title="Speech Recognition"
              description="Accurate ASR engine optimized for diverse accents and multilingual audio streams."
              image="https://images.unsplash.com/photo-1589903308904-1010c2294adc?w=400&q=80"
            />
            <FeatureCard
              icon={Languages}
              title="Translation"
              description="Neural machine translation with specialized models for Sinhala and Tamil language pairs."
              image="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80"
            />
            <FeatureCard
              icon={Volume2}
              title="AI Dubbing"
              description="Natural-sounding text-to-speech with voice cloning and audio synchronization."
              image="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400&q=80"
            />
            <FeatureCard
              icon={Accessibility}
              title="Sign Avatar"
              description="Prototype sign language avatar for enhanced accessibility (research stage)."
              image="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80"
              badgeLabel="Coming soon"
            />
          </div>
        </div>
      </section>

      {/* How it works mini */}
      <section className="border-y border-border py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Upload, step: "1", title: "Input", desc: "Paste a YouTube link or upload your video file." },
              { icon: Cpu, step: "2", title: "Process", desc: "AI extracts speech, translates, and generates dubbed audio." },
              { icon: Captions, step: "3", title: "Output", desc: "Watch with synced subtitles and dubbed audio in your language." },
            ].map((item) => (
              <GlassCard key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-display text-xl font-bold">
                  {item.step}
                </div>
                <item.icon size={24} className="mx-auto mb-3 text-primary" />
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Language Marquee */}
      <LanguageMarquee />

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="mb-12 text-center font-display text-3xl font-bold">What People Say</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <TestimonialCard
              quote="Voxinity made our Sinhala lecture content accessible to Tamil-speaking students for the first time. The latency is impressively low."
              name="Dr. Anura Perera"
              role="Senior Lecturer, University of Colombo"
            />
            <TestimonialCard
              quote="As a content creator, I can now reach audiences in multiple languages without expensive dubbing studios. Game-changing prototype."
              name="Kavitha Rajasinghe"
              role="YouTube Content Creator"
            />
            <TestimonialCard
              quote="The accessibility-first approach with sign language avatar research is exactly what the deaf community needs from tech innovation."
              name="Tharushi Fernando"
              role="Accessibility Advocate"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-muted/30 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold">Ready to try?</h2>
          <p className="mt-3 text-muted-foreground">Experience real-time multilingual dubbing in your browser.</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/demo">
              Try the Demo <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
};

export default Index;
