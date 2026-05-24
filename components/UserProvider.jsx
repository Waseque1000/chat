"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const UserContext = createContext(null);

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync Firebase user with our MongoDB backend
  const syncUserToBackend = async (firebaseUser) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          email: firebaseUser.email,
          avatar: firebaseUser.photoURL || ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      } else {
        console.error("Backend sync failed:", data.message);
      }
    } catch (error) {
      console.error("Failed to sync user with backend:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await syncUserToBackend(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserToBackend(result.user);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserToBackend(result.user);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await syncUserToBackend(result.user);
    } catch (error) {
      console.error("Email registration failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateProfile = async (newUsername, newAvatarUrl) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/user/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: newUsername,
          avatar: newAvatarUrl
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        return data;
      } else {
        throw new Error(data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ user, loginWithGoogle, loginWithEmail, registerWithEmail, logout, updateProfile, loading }}>
      {children}
    </UserContext.Provider>
  );
};
