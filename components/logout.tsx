'use client';

import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';

export function Logout() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-200 hover:text-white bg-[#1B5E4B]/50 hover:bg-[#1B5E4B] transition"
    >
      <LogOut className="w-3.5 h-3.5" />
      Sign out
    </button>
  );
}
