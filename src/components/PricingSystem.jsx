import React, { useState } from 'react';
import { Check, Crown, Rocket, Shield, Zap, Users, Globe, TrendingUp, Lock } from 'lucide-react';

/**
 * Pricing & Credit System
 * 
 * Hybrid Monetization Model:
 * - Enterprise Platform License (Subscription)
 * - CGS Credit Packages (Usage-based for premium features)
 * 
 * Tiers:
 * - Professional: Mid-enterprise, single domain
 * - Enterprise: YMYL, multi-brand, full feature access
 */

export const PricingSystem = ({ onPlanSelected }) => {
  const [selectedTier, setSelectedTier] = useState('enterprise');
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' | 'annual'

  const plans = [
    {
      id: 'professional',
      name: 'Professional',
      tagline: 'For Growing Teams',
      icon: Rocket,
      color: '#3b82f6',
      monthlyPrice: 499,
      annualPrice: 4990,
      savings: '17% off',
      cgsCredits: 1000,
      features: [
        { text: 'Unlimited content optimization', included: true },
        { text: 'Core CGS scoring (0-100%)', included: true },
        { text: 'Single domain tracking', included: true },
        { text: 'Attribution Frequency Tracker', included: true },
        { text: 'AI Action Center (basic)', included: true },
        { text: '1,000 CGS credits/month', included: true, highlight: true },
        { text: 'Email support (24hr response)', included: true },
        { text: 'Outcome Engineering Studio', included: false },
        { text: 'Source Intelligence Engine', included: false },
        { text: 'Multi-domain tracking', included: false },
        { text: 'Team collaboration', included: false },
      ],
      cta: 'Start Free Trial',
      popular: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      tagline: 'For YMYL & Multi-Brand',
      icon: Crown,
      color: '#8b5cf6',
      monthlyPrice: 1999,
      annualPrice: 19990,
      savings: '17% off',
      cgsCredits: 5000,
      features: [
        { text: 'Everything in Professional', included: true },
        { text: 'Outcome Engineering Studio', included: true, highlight: true },
        { text: 'Source Intelligence Engine', included: true, highlight: true },
        { text: 'Multi-domain tracking (unlimited)', included: true },
        { text: 'Team collaboration & seats', included: true },
        { text: '5,000 CGS credits/month', included: true, highlight: true },
        { text: 'Additional credit packages available', included: true },
        { text: 'Multi-regional tracking', included: true },
        { text: 'Deterministic Citation Tools', included: true },
        { text: 'Priority support (2hr response)', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: 'Custom integrations', included: true },
      ],
      cta: 'Book Demo',
      popular: true
    }
  ];

  const creditPackages = [
    { credits: 1000, price: 299, pricePerCredit: 0.30, popular: false },
    { credits: 5000, price: 1199, pricePerCredit: 0.24, popular: true },
    { credits: 10000, price: 1999, pricePerCredit: 0.20, popular: false },
  ];

  const getPrice = (plan) => {
    return billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-purple-900 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Choose Your Citation Guarantee Plan
          </h1>
          <p className="text-xl text-purple-200 mb-6">
            Hybrid pricing: Platform access + usage-based CGS credits
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-purple-900'
                  : 'text-white hover:text-purple-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-purple-900'
                  : 'text-white hover:text-purple-200'
              }`}
            >
              Annual <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = getPrice(plan);
            const isSelected = selectedTier === plan.id;
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl overflow-hidden transition-all ${
                  isSelected ? 'ring-4 ring-purple-500 scale-105' : 'hover:scale-102'
                } ${plan.popular ? 'shadow-2xl' : 'shadow-xl'}`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 text-sm font-bold">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: plan.color + '20' }}
                    >
                      <Icon className="h-8 w-8" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-sm text-slate-600">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-5xl font-bold text-slate-900">
                        ${billingCycle === 'monthly' ? price : Math.round(price / 12)}
                      </span>
                      <span className="text-xl text-slate-600">/mo</span>
                    </div>
                    {billingCycle === 'annual' && (
                      <p className="text-sm text-green-600 font-semibold">
                        ${price}/year - {plan.savings}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-2">
                      + {plan.cgsCredits.toLocaleString()} CGS credits/month included
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-start gap-3 text-sm ${
                          feature.included ? 'text-slate-700' : 'text-slate-400'
                        } ${feature.highlight ? 'font-semibold' : ''}`}
                      >
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Lock className="h-5 w-5 text-slate-300 flex-shrink-0" />
                        )}
                        <span>{feature.text}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => {
                      setSelectedTier(plan.id);
                      onPlanSelected && onPlanSelected(plan);
                    }}
                    className="w-full py-4 rounded-xl font-bold text-lg transition-all"
                    style={{
                      backgroundColor: plan.color,
                      color: 'white',
                      boxShadow: isSelected ? `0 10px 30px ${plan.color}40` : 'none'
                    }}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* CGS Credit Packages */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border-2 border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Additional CGS Credit Packages</h2>
              <p className="text-purple-200">
                Power premium features: Outcome Engineering, Source Intelligence, Deep Competitive Analysis
              </p>
            </div>
            <Zap className="h-12 w-12 text-yellow-400" />
          </div>

          <div className="grid grid-cols-3 gap-6">
            {creditPackages.map((pkg, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-xl p-6 ${
                  pkg.popular ? 'ring-4 ring-yellow-400 relative' : ''
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-xs font-bold">
                    BEST VALUE
                  </div>
                )}
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-900 mb-2">
                    {pkg.credits.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-600 mb-4">CGS Credits</div>
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    ${pkg.price}
                  </div>
                  <div className="text-xs text-slate-500 mb-4">
                    ${pkg.pricePerCredit.toFixed(2)} per credit
                  </div>
                  <button className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all">
                    Purchase
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">What do CGS credits power?</h4>
            <ul className="text-sm text-blue-100 space-y-1">
              <li>• Full Outcome Engineering Studio simulations</li>
              <li>• Proprietary Query Volume Estimation</li>
              <li>• Deep competitive Source Intelligence reports</li>
              <li>• Advanced multi-platform citation tracking</li>
            </ul>
          </div>
        </div>

        {/* Enterprise Features */}
        <div className="mt-16 grid grid-cols-4 gap-6">
          <FeatureHighlight
            icon={<Shield className="h-8 w-8 text-green-400" />}
            title="YMYL Compliant"
            description="Built for regulated industries"
          />
          <FeatureHighlight
            icon={<Users className="h-8 w-8 text-blue-400" />}
            title="Team Collaboration"
            description="Unlimited seats included"
          />
          <FeatureHighlight
            icon={<Globe className="h-8 w-8 text-purple-400" />}
            title="Multi-Domain"
            description="Track unlimited brands"
          />
          <FeatureHighlight
            icon={<TrendingUp className="h-8 w-8 text-yellow-400" />}
            title="8.5x ROI"
            description="Proven conversion lift"
          />
        </div>
      </div>
    </div>
  );
};

const FeatureHighlight = ({ icon, title, description }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
    <div className="flex justify-center mb-3">{icon}</div>
    <h4 className="text-white font-bold mb-1">{title}</h4>
    <p className="text-sm text-purple-200">{description}</p>
  </div>
);

export default PricingSystem;
