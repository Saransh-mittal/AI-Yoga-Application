"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, User, LogIn } from "lucide-react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
    );
  }

  if (session && session.user) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end hidden sm:flex">
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {session.user.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {session.user.email}
          </span>
        </div>
        
        <div className="relative group cursor-pointer">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-10 h-10 rounded-full border-2 border-purple-500/30 group-hover:border-purple-500 transition-colors"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white border-2 border-purple-500/30 group-hover:border-purple-500 transition-colors">
              <User size={18} />
            </div>
          )}
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
             <button
              onClick={() => signOut()}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-2"
    >
      <LogIn size={16} />
      Sign In
    </button>
  );
}
