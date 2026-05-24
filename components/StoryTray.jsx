"use client";
import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { useUser } from "./UserProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StoryViewer } from "./StoryViewer";

export const StoryTray = ({ onlineUsers = [] }) => {
  const { user } = useUser();
  const [groupedStories, setGroupedStories] = useState([]);
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [newStoryUrl, setNewStoryUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);

  const fetchStories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/story`);
      const data = await res.json();
      setGroupedStories(data);
    } catch (error) {
      console.error("Failed to fetch stories", error);
    }
  };

  useEffect(() => {
    fetchStories();
    // Poll for new stories occasionally
    const interval = setInterval(fetchStories, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAddStory = async (e) => {
    e.preventDefault();
    if (!newStoryUrl.trim()) return;

    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, imageUrl: newStoryUrl })
      });
      setIsAddingStory(false);
      setNewStoryUrl("");
      fetchStories();
    } catch (error) {
      console.error("Failed to add story", error);
    } finally {
      setLoading(false);
    }
  };

  // Find my own stories
  const myStoriesGroup = groupedStories.find(g => g.user._id === user?._id);

  return (
    <div className="w-full border-b border-black/5 bg-white/30 backdrop-blur-sm p-4 pt-5 pb-3 shrink-0 overflow-x-auto scrollbar-hide">
      <div className="flex gap-4">
        {/* Add Story / My Story */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer" onClick={() => myStoriesGroup ? setViewingUser(myStoriesGroup) : setIsAddingStory(true)}>
          <div className="relative">
            <div className={`p-[2px] rounded-full ${myStoriesGroup ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-indigo-500' : 'bg-transparent'}`}>
              <Avatar className="h-14 w-14 border-2 border-white">
                <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
              </Avatar>
            </div>
            {!myStoriesGroup && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <Plus size={12} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>
          <span className="text-[11px] font-semibold text-gray-700">Your Day</span>
        </div>

        {/* Other Users' Stories */}
        {groupedStories.filter(g => g.user._id !== user?._id).map(group => {
          const isOnline = onlineUsers.includes(group.user._id);
          return (
            <div 
              key={group.user._id} 
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer transition-transform hover:scale-105"
              onClick={() => setViewingUser(group)}
            >
              <div className="relative">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-indigo-500">
                  <Avatar className="h-14 w-14 border-2 border-white">
                    <AvatarImage src={group.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${group.user.username}`} />
                  </Avatar>
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-gray-700 w-16 text-center truncate">{group.user.username}</span>
            </div>
          );
        })}
      </div>

      {/* Add Story Dialog */}
      <Dialog open={isAddingStory} onOpenChange={setIsAddingStory}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add to Your Day</DialogTitle>
            <DialogDescription>
              Share a photo with your friends. It will disappear after 24 hours.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStory} className="grid gap-4 py-4">
            <Input
              placeholder="Paste Image URL here..."
              value={newStoryUrl}
              onChange={(e) => setNewStoryUrl(e.target.value)}
              className="rounded-xl"
            />
            <button 
              type="submit" 
              disabled={loading || !newStoryUrl.trim()}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl disabled:opacity-50 transition-all"
            >
              {loading ? "Adding..." : "Post Story"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Story Viewer Modal */}
      {viewingUser && (
        <StoryViewer group={viewingUser} onClose={() => setViewingUser(null)} />
      )}
    </div>
  );
};
