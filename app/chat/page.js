"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { useSocket } from "@/components/SocketProvider";
import { useCall } from "@/components/CallProvider";
import { Search, Send, Settings, User, MoreVertical, Phone, Video, Info, Smile, MessageSquare, Edit3, ArrowLeft, Paperclip, Image as ImageIcon, FileText, MapPin, X } from "lucide-react";
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

  // Attachment states
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

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
    if (!newMessage.trim() && !attachment) return;

    let messageContent = newMessage;
    let type = "text";
    let fileUrl = "";
    let locationData = null;

    if (attachment) {
      type = attachment.type;
      if (attachment.type === "image" || attachment.type === "pdf") {
        fileUrl = attachment.previewUrl;
      } else if (attachment.type === "location") {
        locationData = attachment.location;
        messageContent = "Shared a location";
      }
    }

    setNewMessage("");
    setAttachment(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: messageContent,
          chatId: selectedChat._id,
          senderId: user._id,
          type,
          fileUrl,
          locationData
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

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachment({
        type,
        file,
        previewUrl: event.target.result,
        name: file.name
      });
      setIsAttachmentMenuOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleLocationSelect = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAttachment({
          type: 'location',
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "Current Location"
          }
        });
        setIsAttachmentMenuOpen(false);
      },
      (error) => {
        alert("Unable to retrieve your location.");
        setIsAttachmentMenuOpen(false);
      }
    );
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
        className={`w-full md:w-80 lg:w-96 flex-col bg-card border-r border-border rounded-[2rem] z-10 overflow-hidden flex-shrink-0 shadow-sm ${selectedChat ? 'hidden md:flex' : 'flex'}`}
      >
        <div className="p-5 border-b border-border bg-card flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setIsProfileOpen(true)}
          >
            <Avatar className="h-12 w-12 border-2 border-transparent group-hover:border-indigo-500 transition-all">
              <AvatarImage src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} />
              <AvatarFallback>{(user?.username || 'U')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-foreground leading-tight">{user?.username}</h3>
              <p className="text-xs text-muted">My Profile</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsProfileOpen(true)} 
              className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted hover:text-primary transition-colors"
              title="Edit Profile"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={logout} 
              className="p-2.5 rounded-full hover:bg-error/10 text-muted hover:text-error transition-colors"
              title="Log Out"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-border bg-card">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-muted" size={18} />
            <Input 
              placeholder="Search people..." 
              className="pl-11 bg-tertiary border-border h-12 rounded-2xl focus-visible:ring-primary shadow-sm text-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <StoryTray onlineUsers={onlineUsers} />

        <ScrollArea className="flex-1">
          <div className="flex flex-col">
            {search.trim() ? (
              <AnimatePresence>
                <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-bold text-muted uppercase tracking-widest mb-2 mt-2 px-4">Search Results</motion.h3>
                {users.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4">No users found.</p>
                ) : (
                  users.map((u) => (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      key={u._id} 
                      onClick={() => startChat(u)}
                      className="flex items-stretch cursor-pointer hover:bg-tertiary transition-none group"
                    >
                      <div className="pl-4 py-3 pr-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarImage src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username || 'user'}`} />
                          <AvatarFallback>{(u.username || 'U')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-border pr-4 py-3 group-last:border-none">
                        <h4 className="text-base font-medium text-foreground truncate">{u.username}</h4>
                        <p className="text-sm text-muted truncate">Start a conversation</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            ) : (
              <AnimatePresence>
                {chats.length === 0 ? (
                  <div className="px-4 py-10 text-center flex flex-col items-center justify-center text-muted">
                    <div className="w-16 h-16 rounded-full bg-tertiary flex items-center justify-center mb-4">
                      <MessageSquare size={24} className="text-muted" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No recent chats.</p>
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
                        className={`relative flex items-stretch cursor-pointer transition-none group ${
                          isSelected 
                            ? 'bg-primary/10' 
                            : 'bg-transparent hover:bg-tertiary'
                        }`}
                      >
                        <div className="pl-4 py-3 pr-3 relative">
                          <Avatar className="h-12 w-12 shrink-0">
                            <AvatarImage src={getChatAvatar(chat)} />
                            <AvatarFallback className="bg-tertiary text-foreground">{(getChatName(chat) || 'C')[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute bottom-3 right-3 w-3.5 h-3.5 rounded-full bg-success border-2 border-card z-10"></span>
                          )}
                        </div>
                        <div className={`flex-1 min-w-0 border-b border-border pr-4 py-3 flex flex-col justify-center group-last:border-none ${isSelected ? 'border-transparent' : ''}`}>
                          <div className="flex justify-between items-baseline mb-0.5">
                            <h4 className={`text-base truncate ${chat.unread && !isSelected ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                              {getChatName(chat)}
                            </h4>
                            {chat.latestMessage && (
                              <span className={`text-xs whitespace-nowrap ml-2 ${chat.unread && !isSelected ? 'text-success font-bold' : 'text-muted'}`}>
                                {new Date(chat.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-[13px] truncate ${chat.unread && !isSelected ? 'text-foreground font-semibold' : 'text-muted'}`}>
                              {chat.latestMessage ? chat.latestMessage.content : "No messages yet"}
                            </p>
                            {chat.unread && !isSelected && (
                              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center shrink-0">
                                <span className="text-[10px] text-white font-bold">1</span>
                              </div>
                            )}
                          </div>
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
        className={`flex-1 flex-col relative bg-card border border-border shadow-md rounded-[2rem] overflow-hidden ${!selectedChat ? 'hidden md:flex' : 'flex'}`}
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-20 shrink-0 border-b border-border flex items-center justify-between px-4 md:px-8 bg-card z-10 shadow-sm">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-tertiary text-muted transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar className="h-10 w-10 md:h-12 md:w-12 shadow-sm border border-border">
                  <AvatarImage src={getChatAvatar(selectedChat)} />
                  <AvatarFallback className="bg-tertiary text-foreground">{(getChatName(selectedChat) || 'C')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{getChatName(selectedChat)}</h2>
                  {onlineUsers.includes(getOtherParticipantId(selectedChat)) ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-success shadow-sm"></span>
                      <p className="text-xs text-muted font-medium">Online</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-muted"></span>
                      <p className="text-xs text-muted font-medium">Offline</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 md:gap-3">
                <button onClick={() => callUser(getOtherParticipantId(selectedChat), false, getChatName(selectedChat), getChatAvatar(selectedChat))} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-tertiary flex items-center justify-center text-muted hover:text-primary transition-all"><Phone size={16} className="md:w-[18px] md:h-[18px]" /></button>
                <button onClick={() => callUser(getOtherParticipantId(selectedChat), true, getChatName(selectedChat), getChatAvatar(selectedChat))} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-tertiary flex items-center justify-center text-muted hover:text-primary transition-all"><Video size={16} className="md:w-[18px] md:h-[18px]" /></button>
                <button className="hidden sm:flex w-9 h-9 md:w-10 md:h-10 rounded-full bg-tertiary items-center justify-center text-muted hover:text-primary transition-all"><Info size={16} className="md:w-[18px] md:h-[18px]" /></button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 px-4 md:px-8 py-6">
              <div className="space-y-6 flex flex-col pb-4">
                {messages.map((m, i) => {
                  const isMe = m.sender._id === user._id;
                  return (
                    <div key={m._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group items-end gap-2`}>
                      {!isMe && (
                        <Avatar className="h-6 w-6 md:h-8 md:w-8 shadow-sm border border-border">
                          <AvatarImage src={m.sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sender.username}`} />
                          <AvatarFallback className="text-[10px] bg-tertiary">{m.sender.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[75%] md:max-w-[65%] rounded-3xl px-4 py-2.5 shadow-sm text-[14px] md:text-[15px] ${
                        isMe 
                          ? 'bg-primary text-primary-foreground rounded-br-md shadow-[0_4px_14px_rgba(88,101,242,0.3)]' 
                          : 'bg-tertiary text-foreground rounded-bl-md border border-border'
                      }`}>
                        
                        {m.type === 'image' && m.fileUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden">
                            <img src={m.fileUrl} alt="Attached image" className="max-w-full h-auto max-h-[300px] object-contain" />
                          </div>
                        )}
                        {m.type === 'pdf' && m.fileUrl && (
                          <a href={m.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/10 dark:bg-white/10 rounded-xl mb-2 hover:bg-black/20 transition-colors">
                            <FileText size={24} className={isMe ? 'text-white' : 'text-primary'} />
                            <span className="font-semibold text-sm underline">View Document</span>
                          </a>
                        )}
                        {m.type === 'location' && m.locationData && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${m.locationData.lat},${m.locationData.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/10 dark:bg-white/10 rounded-xl mb-2 hover:bg-black/20 transition-colors">
                            <MapPin size={24} className={isMe ? 'text-white' : 'text-primary'} />
                            <span className="font-semibold text-sm underline">View Location</span>
                          </a>
                        )}

                        {m.content && <p className="leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>}
                        
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-foreground/70' : 'text-muted'}`}>
                          {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
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
            <div className="p-3 md:p-6 pt-2 shrink-0 bg-card border-t border-border flex flex-col gap-2">
              
              {/* Attachment Preview */}
              {attachment && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative bg-tertiary rounded-2xl p-3 flex items-center gap-4 w-fit shadow-sm border border-border max-w-sm">
                  <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                    <X size={14} />
                  </button>
                  {attachment.type === 'image' && <img src={attachment.previewUrl} alt="preview" className="w-16 h-16 object-cover rounded-xl border border-border" />}
                  {attachment.type === 'pdf' && <div className="w-16 h-16 bg-red-100 flex items-center justify-center rounded-xl text-red-500"><FileText size={24} /></div>}
                  {attachment.type === 'location' && <div className="w-16 h-16 bg-blue-100 flex items-center justify-center rounded-xl text-blue-500"><MapPin size={24} /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{attachment.type === 'location' ? 'Location Shared' : attachment.name}</p>
                    <p className="text-xs text-muted uppercase">{attachment.type}</p>
                  </div>
                </motion.div>
              )}

              <div className="relative">
                {/* Attachment Menu Popover */}
                <AnimatePresence>
                  {isAttachmentMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute bottom-[calc(100%+12px)] left-0 bg-card border border-border shadow-xl rounded-2xl p-2 flex flex-col gap-1 z-20 w-48"
                    >
                      <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-tertiary text-left text-sm font-bold text-foreground transition-colors"><ImageIcon size={18} className="text-primary" /> Image</button>
                      <button onClick={() => pdfInputRef.current?.click()} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-tertiary text-left text-sm font-bold text-foreground transition-colors"><FileText size={18} className="text-red-500" /> PDF Document</button>
                      <button onClick={handleLocationSelect} className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-tertiary text-left text-sm font-bold text-foreground transition-colors"><MapPin size={18} className="text-green-500" /> Location</button>
                      
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => handleFileSelect(e, 'image')} />
                      <input type="file" accept="application/pdf" className="hidden" ref={pdfInputRef} onChange={(e) => handleFileSelect(e, 'pdf')} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={sendMessage} className="flex items-center gap-2 md:gap-3 bg-tertiary p-1.5 md:p-2 rounded-full shadow-inner border border-border">
                  <button 
                    type="button" 
                    onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                    className={`p-2 md:p-2.5 rounded-full transition-colors ml-0.5 md:ml-1 ${isAttachmentMenuOpen ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-primary hover:bg-card'}`}
                  >
                    <Paperclip size={20} className="md:w-[22px] md:h-[22px]" />
                  </button>
                  <button type="button" className="p-2 md:p-2.5 text-muted hover:text-primary transition-colors rounded-full hover:bg-card">
                    <Smile size={20} className="md:w-[22px] md:h-[22px]" />
                  </button>
                  <Input 
                    value={newMessage}
                    onChange={handleTypingChange}
                    placeholder={attachment ? "Add a caption..." : "Message..."} 
                    className="flex-1 bg-transparent border-transparent focus-visible:ring-0 shadow-none text-[14px] md:text-[15px] font-medium text-foreground placeholder:text-muted px-0 h-10"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!newMessage.trim() && !attachment}
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-[0_4px_14px_rgba(88,101,242,0.4)] disabled:opacity-50 disabled:scale-100 transition-all mr-0.5 md:mr-1 shrink-0"
                  >
                    <Send size={16} className="ml-0.5 md:w-[18px] md:h-[18px]" />
                  </motion.button>
                </form>
              </div>
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
