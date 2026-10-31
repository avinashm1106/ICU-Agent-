'use client';

import { useState, useEffect } from 'react';
import { post, patch } from '@/components/use-data';
import {
  Users,
  Building,
  Clock,
  Shield,
  PlusCircle,
  ToggleLeft,
  ToggleRight,
  Activity,
  CheckCircle,
} from 'lucide-react';

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [escalation, setEscalation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Staff@123');
  const [role, setRole] = useState<'STAFF' | 'CONSULTANT' | 'ADMIN'>('STAFF');

  // Escalation form state
  const [firstSec, setFirstSec] = useState(900);
  const [secondSec, setSecondSec] = useState(1800);
  const [escSec, setEscSec] = useState(2700);

  const showNotification = (text: string, error = false) => {
    setMsg({ text, error });
    setTimeout(() => setMsg(null), 4000);
  };

  const loadData = async () => {
    try {
      const [uRes, eRes] = await Promise.all([
        fetch('/api/users', { cache: 'no-store' }),
        fetch('/api/escalation', { cache: 'no-store' }),
      ]);
      if (uRes.ok) setUsers(await uRes.json());
      if (eRes.ok) {
        const esc = await eRes.json();
        setEscalation(esc);
        setFirstSec(esc.firstSeconds);
        setSecondSec(esc.secondSeconds);
        setEscSec(esc.escalateSeconds);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleUser = async (id: string, currentActive: boolean) => {
    try {
      await patch('/api/users', { id, active: !currentActive });
      showNotification(`Staff member ${!currentActive ? 'activated' : 'deactivated'}`);
      loadData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post('/api/users', { name, email, password, role });
      showNotification(`User ${name} created successfully`);
      setName('');
      setEmail('');
      setShowAddUser(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  const handleSaveEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post('/api/escalation', {
        firstSeconds: Number(firstSec),
        secondSeconds: Number(secondSec),
        escalateSeconds: Number(escSec),
      });
      showNotification('Escalation timing updated successfully');
      loadData();
    } catch (err: any) {
      showNotification(err.message, true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-[#1B5E4B]">
          SYSTEM CONFIGURATION & ACCESS
        </span>
        <h1 className="text-3xl font-extrabold text-[#18312A] mt-1">
          ICU Operations Administration
        </h1>
        <p className="text-sm text-[#65756E] mt-1">
          Manage clinical staff rosters, hospital ICUs, escalation timers, and permission tiers.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-xl text-xs font-bold ${
            msg.error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Hospital Overview Card */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#DDE8DF] text-[#123C2F] flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#18312A]">St. Raphael Medical Center</h2>
            <p className="text-xs text-[#65756E]">
              Primary Unit: <strong className="text-[#18312A]">ICU-01 (Intensive Care Unit)</strong> · 20 Monitored Beds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
            ● Active Ward Registry
          </span>
        </div>
      </div>

      {/* Escalation Rules Configuration */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDE8DF]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#1B5E4B]" />
            <h2 className="text-base font-bold text-[#18312A]">Automated Escalation Protocol</h2>
          </div>
          <span className="text-xs text-[#65756E]">ICU-01 Policy</span>
        </div>

        <form onSubmit={handleSaveEscalation} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              1st Reminder Threshold (Seconds)
            </label>
            <input
              type="number"
              min={5}
              className="w-full text-xs p-2.5 border border-[#DDE8DF] rounded-xl focus:outline-none"
              value={firstSec}
              onChange={(e) => setFirstSec(Number(e.target.value))}
            />
            <p className="text-[10px] text-[#65756E] mt-1">Default 900s (15 min) / Demo 30s</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              2nd Reminder Threshold (Seconds)
            </label>
            <input
              type="number"
              min={10}
              className="w-full text-xs p-2.5 border border-[#DDE8DF] rounded-xl focus:outline-none"
              value={secondSec}
              onChange={(e) => setSecondSec(Number(e.target.value))}
            />
            <p className="text-[10px] text-[#65756E] mt-1">Default 1800s (30 min) / Demo 60s</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18312A] mb-1">
              Consultant Escalation (Seconds)
            </label>
            <input
              type="number"
              min={15}
              className="w-full text-xs p-2.5 border border-[#DDE8DF] rounded-xl focus:outline-none"
              value={escSec}
              onChange={(e) => setEscSec(Number(e.target.value))}
            />
            <p className="text-[10px] text-[#65756E] mt-1">Default 2700s (45 min) / Demo 120s</p>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              className="bg-[#123C2F] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#1B5E4B] transition"
            >
              Update Escalation Thresholds
            </button>
          </div>
        </form>
      </div>

      {/* Staff & User Management */}
      <div className="bg-white border border-[#DDE8DF] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DDE8DF]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#1B5E4B]" />
            <h2 className="text-base font-bold text-[#18312A]">Users & Clinical Staff ({users.length})</h2>
          </div>

          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="flex items-center gap-1.5 bg-[#1B5E4B] text-white text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-[#123C2F]"
          >
            <PlusCircle className="w-4 h-4" />
            {showAddUser ? 'Cancel' : '+ Add Staff Member'}
          </button>
        </div>

        {/* Add User Drawer / Form */}
        {showAddUser && (
          <form onSubmit={handleCreateUser} className="p-4 bg-[#FAF8F2] border border-[#DDE8DF] rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-[#18312A] uppercase">Register New Clinical Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                required
                type="text"
                placeholder="Full Name (e.g. Nurse Deepa)"
                className="text-xs p-2.5 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                required
                type="email"
                placeholder="Email address"
                className="text-xs p-2.5 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                required
                type="password"
                placeholder="Initial password"
                className="text-xs p-2.5 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <select
                className="text-xs p-2.5 border border-[#DDE8DF] rounded-lg bg-white focus:outline-none font-semibold"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="STAFF">STAFF</option>
                <option value="CONSULTANT">CONSULTANT</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-[#123C2F] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1B5E4B]"
              >
                Save & Grant Access
              </button>
            </div>
          </form>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F2] border-b border-[#DDE8DF] text-[#65756E] uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Staff Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Tasks Assigned</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE8DF]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8F2]/60 transition">
                  <td className="p-3 font-bold text-[#18312A]">{u.name}</td>
                  <td className="p-3 text-[#65756E] font-mono">{u.email}</td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DDE8DF] text-[#123C2F]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-[#18312A]">
                    {u._count?.assigned ?? 0}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {u.active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleUser(u.id, u.active)}
                      className="text-xs text-[#1B5E4B] hover:text-[#123C2F] font-semibold underline"
                    >
                      {u.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
