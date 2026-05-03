"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check } from "lucide-react";
import { CREDIT_PACKAGES } from "@/lib/credits";
import { Footer } from "@/components/landing/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F0F7FF]">
      <main className="flex-1 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-6 gap-1 -ml-2 text-[#4A7AFF] hover:text-[#3B5FE6]">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>

        <div className="text-center mb-10">
          <div className="inline-block bg-[#EFF6FF] text-[#2563EB] text-sm font-medium px-3 py-1.5 rounded-full mb-4">
            You&apos;ve used your 3 free credits
          </div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-3">
            Unlock your full prep kit
          </h1>
          <p className="text-[#64748B] max-w-md mx-auto">
            Credits don&apos;t expire. No subscriptions required. No auto-renewal.
            Buy what you need for your job search.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card
              key={pkg.name}
              className={`relative bg-white ${
                pkg.tag === "Best value"
                  ? "border-2 border-[#4A7AFF]"
                  : "border border-[#DBEAFE]"
              }`}
            >
              {pkg.tag && (
                <div className="absolute -top-3 left-6">
                  <span className="text-xs font-bold bg-[#4A7AFF] text-white px-3 py-1 rounded-full">
                    {pkg.tag}
                  </span>
                </div>
              )}
              <CardContent className="p-6 pt-7">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-[#0F172A] text-lg">{pkg.name}</p>
                    <p className="text-sm text-[#64748B] mt-0.5">
                      {pkg.credits ? `${pkg.credits} credits` : "Unlimited"}{" "}
                      {"monthly" in pkg && pkg.monthly ? "· monthly" : "· never expire"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#0F172A]">
                      ${pkg.price}
                      {"monthly" in pkg && pkg.monthly && (
                        <span className="text-sm font-normal text-[#94A3B8]">/mo</span>
                      )}
                    </p>
                    {pkg.credits && (
                      <p className="text-xs text-[#94A3B8]">
                        ${(pkg.price / pkg.credits).toFixed(2)}/credit
                      </p>
                    )}
                  </div>
                </div>
                <Separator className="my-4" />
                <p className="text-sm text-[#475569] mb-4">{pkg.description}</p>
                <Button
                  className="w-full"
                  variant={pkg.tag === "Best value" ? "default" : "outline"}
                  disabled
                >
                  Coming soon — payments in v1.1
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#DBEAFE] p-6">
          <h3 className="font-semibold text-[#0F172A] mb-3">
            What 1 credit unlocks
          </h3>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              "1 full behavioral STAR answer (built from your resume)",
              "1 Tell Me About Yourself narrative",
              "1 cold call roleplay script",
              "1 company research brief",
              "1 filter question answer (Why sales? Why company?)",
              "1 stage cheat sheet",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-[#475569]">
                <Check className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                {item}
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-[#94A3B8] text-center">
            ROI framing: $19 to prep for a $70K+ SDR role = less than 2 hours
            of the salary you&apos;re landing
          </p>
        </div>
      </div>
      </main>
      <Footer />
    </div>
  );
}
