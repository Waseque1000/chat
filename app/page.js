"use client";

import { motion } from "framer-motion";
import { MessageSquare, Users, Shield, Zap, LogIn } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function LandingPage() {
  const router = useRouter();
  const { user, loginWithGoogle, loginWithEmail, registerWithEmail } = useUser();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStartChatting = () => {
    if (user) {
      router.push("/chat");
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      await loginWithGoogle();
      setIsLoginOpen(false);
      router.push("/chat");
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setErrorMsg("");
    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      setIsLoginOpen(false);
      router.push("/chat");
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center selection:bg-indigo-500/20">
      
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Navbar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-black/5 flex items-center justify-center text-primary">
            <MessageSquare size={20} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-gray-900">ChatSphere</span>
        </div>
        <div>
          <button 
            onClick={handleStartChatting}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-gray-50 transition-all shadow-sm border border-black/5 text-sm font-semibold flex items-center gap-2 text-gray-900 hover:shadow-md"
          >
            {user ? "Go to Dashboard" : "Sign In"} <LogIn size={16} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 z-10 w-full max-w-5xl mx-auto mt-16 sm:mt-24">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-600 mb-8 uppercase tracking-widest shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Real-time Messaging Evolved
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-6xl md:text-[5.5rem] font-extrabold tracking-tighter mb-6 leading-[1.05] text-gray-900 drop-shadow-sm">
            Communicate at the <br className="hidden sm:block"/>
            speed of <span className="text-gradient">thought.</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mb-12 leading-relaxed">
            Experience ultra-fast, perfectly synchronized messaging wrapped in a stunning interface. Designed for teams, communities, and friends.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button 
              onClick={handleStartChatting}
              className="px-8 py-4 rounded-full bg-gray-900 hover:bg-black transition-all font-semibold text-white shadow-xl shadow-gray-900/20 hover:scale-105"
            >
              Start Chatting Now
            </button>
            <button className="px-8 py-4 rounded-full bg-white hover:bg-gray-50 transition-all font-semibold border border-black/10 text-gray-900 shadow-sm hover:shadow-md">
              Explore Features
            </button>
          </motion.div>
        </motion.div>

        {/* Features Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full pb-20"
        >
          <div className="glass-card p-8 rounded-3xl flex flex-col items-start text-left hover:scale-[1.02] transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-6 border border-indigo-100 shadow-inner">
              <Zap size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">Lightning Fast</h3>
            <p className="text-gray-500 text-[15px] leading-relaxed font-medium">Real-time socket connections ensure your messages are delivered instantly without any delay.</p>
          </div>
          
          <div className="glass-card p-8 rounded-3xl flex flex-col items-start text-left hover:scale-[1.02] transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 mb-6 border border-cyan-100 shadow-inner">
              <Shield size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">Secure & Private</h3>
            <p className="text-gray-500 text-[15px] leading-relaxed font-medium">Your conversations are protected with industry-leading security practices and modern architecture.</p>
          </div>
          
          <div className="glass-card p-8 rounded-3xl flex flex-col items-start text-left hover:scale-[1.02] transition-transform duration-300">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 mb-6 border border-purple-100 shadow-inner">
              <Users size={28} />
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 tracking-tight">Group Ready</h3>
            <p className="text-gray-500 text-[15px] leading-relaxed font-medium">Create spaces for your team or community with limitless real-time collaboration features.</p>
          </div>
        </motion.div>
      </main>

      {/* Login Dialog (Firebase Auth) */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white/80 backdrop-blur-2xl border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl">
          <DialogHeader className="pt-2">
            <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight text-center">
              {isRegistering ? "Create an Account" : "Welcome Back"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-center mt-2">
              Sign in to start chatting with your friends and communities instantly.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 mt-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-4 py-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="grid gap-4">
              <Input
                type="email"
                placeholder="Email address"
                className="h-12 bg-gray-50/50 border-gray-200 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 rounded-xl px-4 text-[15px] shadow-inner transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                className="h-12 bg-gray-50/50 border-gray-200 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 rounded-xl px-4 text-[15px] shadow-inner transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 mt-2 bg-gray-900 hover:bg-black text-white font-medium rounded-xl shadow-lg shadow-gray-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isRegistering ? "Sign Up" : "Sign In"
                )}
              </button>
            </form>

            <div className="text-center mt-2 pb-2">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[13px] text-gray-500 hover:text-gray-800 font-semibold transition-colors"
              >
                {isRegistering ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
