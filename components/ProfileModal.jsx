import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "./UserProvider";
import { useTheme } from "./ThemeProvider";
import { X, Check, Camera, User as UserIcon, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useUser();
  const { isDark, toggleTheme } = useTheme();
  const [username, setUsername] = useState(user?.username || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await updateProfile(username, avatar);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] w-full max-w-md rounded-3xl overflow-hidden relative"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-gray-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-8 flex flex-col items-center border-b border-black/5">
                <div className="absolute top-4 left-4">
                  <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-black/5 text-gray-500 transition-colors">
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                  </button>
                </div>
                <div className="relative group cursor-pointer mb-4">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-xl">
                    <AvatarImage src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} />
                    <AvatarFallback><UserIcon size={32} className="text-gray-400" /></AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white drop-shadow-md" size={24} />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Your Profile</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Customize your identity</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-medium flex items-center gap-2">
                    <Check size={16} /> Profile updated successfully!
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 pl-1">Display Name</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-12 bg-gray-50/50 border-gray-200 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 rounded-xl px-4 text-base shadow-inner transition-all"
                    placeholder="Enter your username"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 pl-1">Avatar Image URL</label>
                  <Input
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className="h-12 bg-gray-50/50 border-gray-200 focus-visible:ring-indigo-500/30 focus-visible:border-indigo-400 rounded-xl px-4 text-base shadow-inner transition-all text-gray-500"
                    placeholder="Paste an image URL (optional)"
                  />
                  <p className="text-xs text-gray-400 pl-1 mt-1">Leave empty to use your auto-generated avatar.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (!username.trim())}
                  className="w-full h-12 mt-2 bg-gray-900 hover:bg-black text-white font-medium rounded-xl shadow-lg shadow-gray-900/20 disabled:opacity-50 disabled:hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
