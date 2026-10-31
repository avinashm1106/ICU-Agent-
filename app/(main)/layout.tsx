import { currentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Logout } from '@/components/logout';
import {
  Activity,
  Mic,
  MessageSquare,
  CheckSquare,
  BarChart3,
  History,
  ShieldCheck,
  Settings,
  Users,
} from 'lucide-react';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u) redirect('/login');

  const consultantNav = [
    { url: '/dashboard', label: 'Command Center', icon: Activity },
    { url: '/voice', label: 'Voice Agent', icon: Mic },
    { url: '/demo/whatsapp-simulator', label: 'WhatsApp Simulator', icon: Users },
    { url: '/tasks', label: 'Task Board', icon: CheckSquare },
    { url: '/whatsapp', label: 'My WhatsApp', icon: MessageSquare },
    { url: '/analytics', label: 'Analytics', icon: BarChart3 },
    { url: '/voice-history', label: 'Voice History', icon: History },
    { url: '/audit', label: 'Audit Logs', icon: ShieldCheck },
  ];

  const staffNav = [
    { url: '/dashboard', label: 'My Tasks', icon: CheckSquare },
    { url: '/whatsapp', label: 'WhatsApp Inbox', icon: MessageSquare },
    { url: '/tasks', label: 'Task History', icon: History },
  ];

  const adminNav = [
    { url: '/dashboard', label: 'Operations Overview', icon: Activity },
    { url: '/admin', label: 'Administration', icon: Settings },
    { url: '/demo/whatsapp-simulator', label: 'WhatsApp Simulator', icon: Users },
    { url: '/tasks', label: 'All Tasks', icon: CheckSquare },
    { url: '/analytics', label: 'Analytics', icon: BarChart3 },
    { url: '/audit', label: 'Audit Trail', icon: ShieldCheck },
  ];

  const navItems = u.role === 'STAFF' ? staffNav : u.role === 'ADMIN' ? adminNav : consultantNav;

  return (
    <div className="min-h-screen md:flex bg-[#FAF8F2] text-[#18312A]">
      {/* Sidebar */}
      <aside className="bg-[#123C2F] text-white md:w-64 p-5 md:min-h-screen flex flex-col justify-between shrink-0 shadow-lg">
        <div>
          {/* Logo & Brand Header */}
          <div className="pb-5 mb-5 border-b border-[#1B5E4B]">
            <div className="flex items-center gap-2">
              <span className="text-xl">✳</span>
              <h1 className="font-extrabold text-xl tracking-wider text-[#FAF8F2]">
                ICU COMMAND
              </h1>
            </div>
            <p className="text-[11px] text-emerald-200/80 mt-1 uppercase tracking-widest font-semibold">
              St. Raphael · ICU-01
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.url}
                  href={item.url}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-100 hover:bg-[#1B5E4B] hover:text-white transition whitespace-nowrap"
                >
                  <Icon className="w-4 h-4 text-emerald-300 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Current User & Role Profile Footer */}
        <div className="mt-8 pt-4 border-t border-[#1B5E4B]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-bold text-xs text-white truncate max-w-[140px]">{u.name}</p>
              <p className="text-[10px] text-emerald-300 font-semibold uppercase">{u.role}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <Logout />
        </div>
      </aside>

      {/* Main Page Content */}
      <main className="flex-1 min-w-0 p-5 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
