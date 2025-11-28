import React, { useState } from 'react';
import { Lock, Sparkles, Zap, TrendingUp, Brain, Shield, Eye, EyeOff } from 'lucide-react';

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate authentication
    setTimeout(() => {
      if (email && password.length >= 6) {
        localStorage.setItem('algorizz_authenticated', 'true');
        localStorage.setItem('algorizz_user', email);
        onLogin();
      } else {
        setError('Invalid email or password (min 6 characters)');
        setIsLoading(false);
      }
    }, 1000);
  };

  const features = [
    { icon: Brain, title: "AI-Powered Optimization", desc: "Neural networks trained on millions of viral content pieces" },
    { icon: TrendingUp, title: "Algorithm Intelligence", desc: "Real-time adaptation to platform ranking signals" },
    { icon: Sparkles, title: "Brand Analysis Engine", desc: "Deep semantic understanding of your unique voice" },
    { icon: Shield, title: "Enterprise Security", desc: "Bank-level encryption for your creative assets" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0520] via-[#1a0b2e] to-[#0d0520] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Login Required Banner */}
      <div className="w-full bg-[#FF1493]/20 backdrop-blur-sm border-b border-[#FF1493]/40 text-center py-3 fixed top-0 left-0 z-50">
        <span className="font-['Press_Start_2P'] text-xs tracking-wider text-[#FF1493]">
          LOGIN REQUIRED — ACCESS IS GATED UNTIL AUTHENTICATED
        </span>
      </div>
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(#FF1493 1px, transparent 1px),
            linear-gradient(90deg, #FF1493 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'grid-pulse 4s ease-in-out infinite'
        }} />
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-[#FF1493] rounded-full blur-[120px] opacity-20 animate-pulse" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#00E5FF] rounded-full blur-[120px] opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center relative z-10 mt-12">
        {/* Left side - Branding & Features */}
        <div className="text-white space-y-8 p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <img src="/logo.png" alt="AlgoRizz" className="w-20 h-20 pixelated" />
              <div>
                <h1 className="text-5xl font-bold" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  <span className="text-[#FF1493] drop-shadow-[0_0_10px_#FF1493]">Algo</span>
                  <span className="text-[#00E5FF] drop-shadow-[0_0_10px_#00E5FF]">Rizz</span>
                </h1>
                <p className="text-[#FFFF00] text-sm mt-2 drop-shadow-[0_0_8px_#FFFF00]" style={{ fontFamily: "'VT323', monospace", fontSize: '1.2rem' }}>
                  SEDUCE THE ALGORITHM.
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold leading-tight">
              <span className="text-white">The Most Advanced</span><br />
              <span className="text-[#00E5FF] drop-shadow-[0_0_10px_#00E5FF]">AEO Platform</span><br />
              <span className="text-white">On The Planet</span>
            </h2>

            <p className="text-gray-300 text-lg" style={{ fontFamily: "'VT323', monospace", fontSize: '1.3rem' }}>
              Transform your content with AI-powered optimization that makes algorithms fall in love with your brand.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="neon-card p-4 hover:border-[#00E5FF] transition-all duration-300 group"
                >
                  <Icon className="w-8 h-8 text-[#FF1493] mb-2 group-hover:text-[#00E5FF] transition-colors" />
                  <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-xs" style={{ fontFamily: "'VT323', monospace", fontSize: '0.9rem' }}>
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold text-[#FF1493] drop-shadow-[0_0_10px_#FF1493]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                10M+
              </div>
              <div className="text-gray-400 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                Content Pieces Analyzed
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#00E5FF] drop-shadow-[0_0_10px_#00E5FF]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                95%
              </div>
              <div className="text-gray-400 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                Engagement Increase
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#FFFF00] drop-shadow-[0_0_10px_#FFFF00]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                24/7
              </div>
              <div className="text-gray-400 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                AI Optimization
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="neon-card p-8 max-w-md mx-auto w-full backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF1493] to-[#00E5FF] mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '1.2rem' }}>
              {isLogin ? 'ACCESS PORTAL' : 'CREATE ACCOUNT'}
            </h2>
            <p className="text-gray-400" style={{ fontFamily: "'VT323', monospace", fontSize: '1.1rem' }}>
              {isLogin ? 'Enter your credentials to continue' : 'Join the AEO revolution'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="neon-label block mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="neon-input w-full"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="neon-label block mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="neon-input w-full pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#00E5FF] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm" style={{ fontFamily: "'VT323', monospace" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="neon-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>PROCESSING...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>{isLogin ? 'LOGIN' : 'SIGN UP'}</span>
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-4 text-center">
              <button className="text-[#00E5FF] hover:text-[#FF1493] transition-colors text-sm" style={{ fontFamily: "'VT323', monospace", fontSize: '1rem' }}>
                Forgot Password?
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm mb-2" style={{ fontFamily: "'VT323', monospace" }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-[#FF1493] hover:text-[#00E5FF] font-bold transition-colors"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem' }}
            >
              {isLogin ? 'CREATE ACCOUNT' : 'LOGIN'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-center text-gray-500 text-xs" style={{ fontFamily: "'VT323', monospace" }}>
              Protected by enterprise-grade encryption<br />
              Your data is safe with us 🔒
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }
        .pixelated {
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
