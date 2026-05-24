"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { useSocket } from "@/components/SocketProvider";
import { useCall } from "@/components/CallProvider";
import { Search, Send, Settings, User, MoreVertical, Phone, Video, Info, Smile, MessageSquare, Edit3, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import ProfileModal from "@/components/ProfileModal";
import { StoryTray } from "@/components/StoryTray";

export default function ChatDashboard() {
  const router = useRouter();
  const { user, loading, logout } = useUser();
  const { socket, onlineUsers = [] } = useSocket() || {};
  const { callUser } = useCall();

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [typing, setTyping] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const scrollRef = useRef(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  // Fetch users based on search
  useEffect(() => {
    if (!user || !search.trim()) {
      setUsers([]);
      return;
    }
    const fetchUsers = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const res = await fetch(`${backendUrl}/api/user?search=${search}&userId=${user._id}`);
        const data = await res.json();
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users", error);
      }
    };
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user]);

  // Fetch recent chats
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const res = await fetch(`${backendUrl}/api/chat/${user._id}`);
        const data = await res.json();
        setChats(data);
      } catch (error) {
        console.error("Failed to fetch chats", error);
      }
    };
    fetchChats();
  }, [user]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !user) return;
    socket.emit("user_join", user._id);

    const handleReceiveMessage = (data) => {
      if (selectedChat && selectedChat._id === data.chatId) {
        setMessages((prev) => {
          if (prev.some(m => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
      }
      
      setChats((prev) => {
        const chatExists = prev.find(c => c._id === data.chatId);
        const isCurrentlyViewed = selectedChat && selectedChat._id === data.chatId;
        const isFromMe = data.message.sender._id === user._id;
        const shouldMarkUnread = !isCurrentlyViewed && !isFromMe;

        if (chatExists) {
          const updatedChat = { 
            ...chatExists, 
            latestMessage: data.message,
            unread: shouldMarkUnread || chatExists.unread 
          };
          return [updatedChat, ...prev.filter(c => c._id !== data.chatId)];
        } else if (data.message.chat) {
          const newChat = { 
            ...data.message.chat, 
            latestMessage: data.message,
            unread: shouldMarkUnread
          };
          return [newChat, ...prev];
        }
        return prev;
      });
    };

    const handleTyping = (data) => {
      if (selectedChat && selectedChat._id === data.chatId && data.userId !== user._id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 3000);
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing_indicator", handleTyping);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing_indicator", handleTyping);
    };
  }, [socket, user, selectedChat]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typing]);

  const startChat = async (otherUser) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentUserId: user._id, userId: otherUser._id })
      });
      const data = await res.json();
      setSelectedChat(data);
      if (socket) socket.emit("join_chat", data._id);
      fetchMessages(data._id);
      setSearch(""); 
      setUsers([]);
      
      // Update chats list if new
      setChats((prev) => {
        if (!prev.find(c => c._id === data._id)) {
          return [data, ...prev];
        }
        return prev;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/message/${chatId}`);
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const messageContent = newMessage;
    setNewMessage("");

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageContent,
          chatId: selectedChat._id,
          senderId: user._id
        })
      });
      const data = await res.json();
      
      if (socket) {
        socket.emit("send_message", {
          chatId: selectedChat._id,
          message: data
        });
      }
      setMessages((prev) => [...prev, data]);
      
      // Update latest message locally
      setChats((prev) => {
        const chatExists = prev.find(c => c._id === selectedChat._id);
        if (chatExists) {
          const updatedChat = { ...chatExists, latestMessage: data };
          return [updatedChat, ...prev.filter(c => c._id !== selectedChat._id)];
        }
        return prev;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleTypingChange = (e) => {
    setNewMessage(e.target.value);
    if (socket && selectedChat) {
      socket.emit("typing", { chatId: selectedChat._id, userId: user._id });
    }
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-primary text-xl font-medium animate-pulse">Loading Workspace...</div>;
  }

  const getChatName = (chat) => {
    if (!chat) return "";
    if (chat.isGroupChat) return chat.chatName;
    const otherParticipant = chat.participants.find(p => p._id !== user._id);
    return otherParticipant?.username || "Unknown User";
  };
  
  const getChatAvatar = (chat) => {
    if (!chat) return "";
    if (chat.isGroupChat) return `https://api.dicebear.com/7.x/initials/svg?seed=${chat.chatName}`;
    const otherParticipant = chat.participants.find(p => p._id !== user._id);
    return otherParticipant?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${getChatName(chat)}`;
  };

  const getOtherParticipantId = (chat) => {
    if (!chat || chat.isGroupChat) return null;
    return chat.participants.find(p => p._id !== user._id)?._id;
  };

  return (
    <div className="flex h-[100dvh] bg-background p-2 md:p-4 lg:p-6 overflow-hidden gap-4 lg:gap-6">
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Floating Sidebar */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`w-full md:w-80 lg:w-96 flex-col glass-panel rounded-[2rem] z-10 overflow-hidden flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="p-5 border-b border-black/5 bg-white/40 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setIsProfileOpen(true)}
          >
            <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-indigo-500 transition-all">
              <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
              <AvatarFallback>{(user?.username || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight">{user?.username}</h3>
              <p className="text-xs text-gray-500">My Profile</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsProfileOpen(true)} 
              className="p-2.5 rounded-full hover:bg-black/5 text-gray-400 hover:text-indigo-600 transition-colors"
              title="Edit Profile"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={logout} 
              className="p-2.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              title="Log Out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-black/5 bg-white/40">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-gray-400" size={18} />
            <Input 
              placeholder="Search people..." 
              className="pl-11 bg-white/60 border-black/5 h-12 rounded-2xl focus-visible:ring-indigo-500 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <StoryTray onlineUsers={onlineUsers} />

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 py-2 px-2">
            {search.trim() ? (
              <AnimatePresence>
                <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2 px-1">Search Results</motion.h3>
                {users.length === 0 ? (
                  <p className="text-sm text-gray-400 px-1">No users found.</p>
                ) : (
                  users.map((u) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={u._id} 
                      onClick={() => startChat(u)}
                      className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/60 cursor-pointer transition-all border border-transparent hover:border-black/5 hover:shadow-sm mb-1"
                    >
                      <Avatar className="h-12 w-12 shadow-sm">
                        <AvatarImage src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username || 'user'}`} />
                        <AvatarFallback>{(u.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 truncate">{u.username}</h4>
                        <p className="text-sm text-primary font-medium truncate">Start a conversation</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            ) : (
              <AnimatePresence>
                <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2 px-1">Recent Chats</motion.h3>
                {chats.length === 0 ? (
                  <div className="px-2 py-10 text-center flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
                      <MessageSquare size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No recent chats.</p>
                    <p className="text-xs mt-1">Search for a username above.</p>
                  </div>
                ) : (
                  chats.map((chat) => {
                    const isSelected = selectedChat?._id === chat._id;
                    const isOnline = onlineUsers.includes(getOtherParticipantId(chat));
                    return (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={chat._id} 
                        onClick={() => {
                          setSelectedChat(chat);
                          
                          // Mark as read locally
                          setChats(prev => prev.map(c => 
                            c._id === chat._id ? { ...c, unread: false } : c
                          ));
                          
                          if (socket) socket.emit("join_chat", chat._id);
                          fetchMessages(chat._id);
                        }}
                        className={`relative flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border mb-1 ${
                          isSelected 
                            ? 'bg-white shadow-md border-black/5 ring-1 ring-black/5' 
                            : chat.unread
                              ? 'bg-indigo-50/80 border-indigo-100 shadow-sm'
                              : 'bg-transparent border-transparent hover:bg-white/50 hover:border-black/5'
                        }`}
                      >
                        <div className="relative">
                          <Avatar className="h-12 w-12 shadow-sm">
                            <AvatarImage src={getChatAvatar(chat)} />
                            <AvatarFallback>{(getChatName(chat) || 'C')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className={`text-base font-semibold truncate ${isSelected ? 'text-primary' : chat.unread ? 'text-indigo-900' : 'text-gray-900'}`}>{getChatName(chat)}</h4>
                            <div className="flex items-center gap-2">
                              {chat.unread && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse"></span>
                              )}
                              <span className={`text-[10px] font-medium ${chat.unread ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {chat.latestMessage ? new Date(chat.latestMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                              </span>
                            </div>
                          </div>
                          <p className={`text-sm truncate ${isSelected ? 'text-gray-600' : chat.unread ? 'text-indigo-800 font-semibold' : 'text-gray-500'}`}>
                            {chat.latestMessage ? chat.latestMessage.content : "Start chatting"}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })
                )}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </motion.div>

      {/* Main Chat Floating Panel */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`flex-1 flex-col relative glass-panel rounded-[2rem] overflow-hidden shadow-xl ${!selectedChat ? 'hidden md:flex' : 'flex'}`}
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-20 shrink-0 border-b border-black/5 flex items-center justify-between px-4 md:px-8 bg-white/40 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-black/5 text-gray-600 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar className="h-10 w-10 md:h-12 md:w-12 shadow-sm">
                  <AvatarImage src={getChatAvatar(selectedChat)} />
                  <AvatarFallback>{(getChatName(selectedChat) || 'C')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{getChatName(selectedChat)}</h2>
                  {onlineUsers.includes(getOtherParticipantId(selectedChat)) ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                      <p className="text-xs text-gray-500 font-medium">Online</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                      <p className="text-xs text-gray-500 font-medium">Offline</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-3">
                <button onClick={() => callUser(getOtherParticipantId(selectedChat), false, getChatName(selectedChat), getChatAvatar(selectedChat))} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-gray-600 hover:text-primary hover:shadow-md transition-all"><Phone size={16} className="md:w-[18px] md:h-[18px]" /></button>
                <button onClick={() => callUser(getOtherParticipantId(selectedChat), true, getChatName(selectedChat), getChatAvatar(selectedChat))} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 flex items-center justify-center text-gray-600 hover:text-primary hover:shadow-md transition-all"><Video size={16} className="md:w-[18px] md:h-[18px]" /></button>
                <button className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 rounded-full bg-white border border-black/5 items-center justify-center text-gray-600 hover:text-primary hover:shadow-md transition-all"><Info size={16} className="md:w-[18px] md:h-[18px]" /></button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 px-4 md:px-8 py-6">
              <div className="space-y-6 flex flex-col pb-4">
                {messages.map((m, i) => {
                  const isMe = m.sender._id === user._id;
                  return (
                    <motion.div 
                      key={m._id || i}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                        {!isMe && (
                          <Avatar className="h-8 w-8 shrink-0 mb-1 shadow-sm">
                            <AvatarImage src={m.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sender.username}`} />
                          </Avatar>
                        )}
                        <div 
                          className={`px-5 py-3.5 rounded-3xl shadow-sm relative ${
                            isMe 
                              ? 'bg-gradient-to-br from-indigo-500 to-primary text-white rounded-br-sm' 
                              : 'bg-white border border-black/5 text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-[15px] leading-relaxed break-words">{m.content}</p>
                          <span className={`text-[10px] font-medium absolute -bottom-5 whitespace-nowrap ${isMe ? 'right-1 text-gray-400' : 'left-1 text-gray-400'}`}>
                            {new Date(m.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
                {typing && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start items-end gap-3 mt-4">
                    <Avatar className="h-8 w-8 shrink-0 shadow-sm">
                      <AvatarImage src={getChatAvatar(selectedChat)} />
                    </Avatar>
                    <div className="bg-white border border-black/5 px-4 py-3.5 rounded-3xl rounded-bl-sm shadow-sm flex items-center gap-1.5 h-[46px]">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                    </div>
                  </motion.div>
                )}
                <div ref={scrollRef} className="h-4" />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 md:p-6 pt-2 shrink-0 bg-white/20 backdrop-blur-md">
              <form onSubmit={sendMessage} className="flex items-center gap-2 md:gap-3 bg-white p-1.5 md:p-2 rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-black/5">
                <button type="button" className="p-2 md:p-2.5 text-gray-400 hover:text-primary transition-colors rounded-full hover:bg-black/5 ml-0.5 md:ml-1">
                  <Smile size={20} className="md:w-[22px] md:h-[22px]" />
                </button>
                <Input 
                  value={newMessage}
                  onChange={handleTypingChange}
                  placeholder="Message..." 
                  className="flex-1 bg-transparent border-transparent focus-visible:ring-0 shadow-none text-[14px] md:text-[15px] text-gray-800 placeholder:text-gray-400 px-0 h-10"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-md disabled:opacity-50 disabled:scale-100 hover:scale-105 transition-all mr-0.5 md:mr-1 shrink-0"
                >
                  <Send size={16} className="ml-0.5 md:w-[18px] md:h-[18px]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 relative">
            {/* Background decorative elements */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
              <div className="w-[400px] h-[400px] bg-indigo-200/50 rounded-full blur-[100px] mix-blend-multiply" />
            </div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="w-24 h-24 mb-8 rounded-full bg-white shadow-xl shadow-indigo-100 border border-white flex items-center justify-center z-10"
            >
              <MessageSquare size={36} className="text-primary" />
            </motion.div>
            <motion.h2 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight z-10"
            >
              Welcome to <span className="text-gradient">ChatSphere</span>
            </motion.h2>
            <motion.p 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-500 max-w-md font-medium z-10 text-[15px]"
            >
              Select a conversation from the sidebar or search for a user to start a new chat. Experience the speed of real-time messaging.
            </motion.p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
