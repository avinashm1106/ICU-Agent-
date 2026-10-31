'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ShieldCheck, Stethoscope, User, ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('consultant@icu-demo.com');
  const [password, setPassword] = useState('Doctor@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const r = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (r?.error) {
      setError('Invalid login credentials. Please check password or select a demo preset.');
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  const selectUser = (eMail: string, pWord: string) => {
    setEmail(eMail);
    setPassword(pWord);
    setError('');
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#FAF8F2]">
      {/* Brand & Narrative Panel (5 cols) */}
      <section className="lg:col-span-5 bg-[#123C2F] text-white p-8 md:p-14 flex flex-col justify-between shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-2xl">✳</span>
            <span className="font-extrabold tracking-widest text-sm text-emerald-200 uppercase">
              ST. RAPHAEL MEDICAL CENTER
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#FAF8F2] leading-none">
            ICU COMMAND
          </h1>
          <p className="text-base text-emerald-200 mt-4 font-medium">
            AI-Powered ICU Task Orchestration & Accountability Platform
          </p>

          <div className="mt-12 space-y-4 text-xs text-emerald-100/90 leading-relaxed max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#1B5E4B] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">1</span>
              </div>
              <p>
                <strong className="text-white">Doctor Speaks:</strong> Head consultant speaks natural clinical operational tasks.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#1B5E4B] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">2</span>
              </div>
              <p>
                <strong className="text-white">AI Extracts:</strong> Voice audio is transcribed and parsed into explicit tasks and assignees.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#1B5E4B] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">3</span>
              </div>
              <p>
                <strong className="text-white">Multi-Staff WhatsApp:</strong> Tasks dispatch to nurses and technicians for immediate YES/NO confirmation.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-[#1B5E4B] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold">4</span>
              </div>
              <p>
                <strong className="text-white">Live Closed Loop:</strong> ICU command center reflects completion in real time with automated escalation.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 mt-8 border-t border-[#1B5E4B] text-[11px] text-emerald-300">
          🔒 Closed Operational Coordination System · Zero Clinical Diagnoses Invented
        </div>
      </section>

      {/* Login & Demo Environment Panel (7 cols) */}
      <section className="lg:col-span-7 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-lg space-y-6">
          <div className="bg-white border border-[#DDE8DF] rounded-3xl p-8 shadow-sm">
            <h2 className="text-2xl font-black text-[#18312A]">Sign In</h2>
            <p className="text-xs text-[#65756E] mt-1">
              Select any demo role below or enter credentials to sign into the command center.
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#18312A] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-[#65756E]" />
                  <input
                    required
                    type="email"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-[#DDE8DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#18312A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-[#65756E]" />
                  <input
                    required
                    type="password"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-[#DDE8DF] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#123C2F] text-white text-xs font-bold py-3 rounded-xl hover:bg-[#1B5E4B] transition shadow-md disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign in to ICU Command'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Demo Accounts Quick-Select Card */}
          <div className="bg-[#FAF8F2] border border-[#DDE8DF] rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#123C2F] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#1B5E4B]" />
                Demo Environment Accounts
              </span>
              <span className="text-[10px] text-[#65756E]">Click to auto-fill</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => selectUser('consultant@icu-demo.com', 'Doctor@123')}
                className="p-3 rounded-xl border border-[#DDE8DF] bg-white hover:border-[#1B5E4B] text-left transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#18312A]">Dr. Arjun (Consultant)</p>
                  <p className="text-[10px] text-[#65756E]">consultant@icu-demo.com</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Doctor
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectUser('admin@icu-demo.com', 'Admin@123')}
                className="p-3 rounded-xl border border-[#DDE8DF] bg-white hover:border-[#1B5E4B] text-left transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#18312A]">Admin</p>
                  <p className="text-[10px] text-[#65756E]">admin@icu-demo.com</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                  Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectUser('anitha@icu-demo.com', 'Staff@123')}
                className="p-3 rounded-xl border border-[#DDE8DF] bg-white hover:border-[#1B5E4B] text-left transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#18312A]">Nurse Anitha</p>
                  <p className="text-[10px] text-[#65756E]">anitha@icu-demo.com</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Staff
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectUser('ramesh@icu-demo.com', 'Staff@123')}
                className="p-3 rounded-xl border border-[#DDE8DF] bg-white hover:border-[#1B5E4B] text-left transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#18312A]">Ramesh (Ventilator Tech)</p>
                  <p className="text-[10px] text-[#65756E]">ramesh@icu-demo.com</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Staff
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectUser('priya@icu-demo.com', 'Staff@123')}
                className="p-3 rounded-xl border border-[#DDE8DF] bg-white hover:border-[#1B5E4B] text-left transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#18312A]">Sister Priya</p>
                  <p className="text-[10px] text-[#65756E]">priya@icu-demo.com</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Staff
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectUser('suresh@icu-demo.com', 'Staff@123')}
                className="p-3 rounded-xl border border-[#DDE8DF] bg-white hover:border-[#1B5E4B] text-left transition flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-[#18312A]">Suresh (ICU Tech)</p>
                  <p className="text-[10px] text-[#65756E]">suresh@icu-demo.com</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  Staff
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
