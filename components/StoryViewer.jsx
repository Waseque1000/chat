"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const StoryViewer = ({ group, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentIndex < group.stories.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onClose();
      }
    }, 5000); // 5 seconds per story

    return () => clearTimeout(timer);
  }, [currentIndex, group.stories.length, onClose]);

  const handleTap = (e) => {
    const { clientX } = e;
    const { innerWidth } = window;
    if (clientX < innerWidth / 2) {
      // Tap left -> previous
      if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    } else {
      // Tap right -> next
      if (currentIndex < group.stories.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onClose();
      }
    }
  };

  if (!group || !group.stories.length) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center cursor-pointer"
        onClick={handleTap}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        {/* Progress Bars */}
        <div className="absolute top-6 left-0 w-full px-4 flex gap-1 z-10">
          {group.stories.map((story, i) => (
            <div key={story._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-white"
                initial={{ width: i < currentIndex ? "100%" : "0%" }}
                animate={{ width: i === currentIndex ? "100%" : i < currentIndex ? "100%" : "0%" }}
                transition={i === currentIndex ? { duration: 5, ease: "linear" } : { duration: 0 }}
              />
            </div>
          ))}
        </div>

        {/* Header (Avatar + Username) */}
        <div className="absolute top-10 left-4 flex items-center gap-3 z-10">
          <Avatar className="h-10 w-10 border border-white/20">
            <AvatarImage src={group.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.user.username}`} />
          </Avatar>
          <div>
            <h3 className="text-white font-bold text-sm shadow-black drop-shadow-md">{group.user.username}</h3>
            <span className="text-white/70 text-xs shadow-black drop-shadow-md">
              {new Date(group.stories[currentIndex].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Story Image */}
        <img 
          src={group.stories[currentIndex].imageUrl} 
          alt="Story"
          className="max-h-[100dvh] w-full max-w-md object-contain select-none pointer-events-none"
        />
      </motion.div>
    </AnimatePresence>
  );
};
