import { useState } from 'react';
import { Users, Plus, Target, TrendingDown, HeartPulse } from 'lucide-react';

interface FamilyMember {
  name: string;
  age: number;
  gender: string;
  diet_type: string;
  sun_exposure: string;
  activity_level: string;
  symptoms: string[];
  allergies: string[];
}

export default function FamilyDashboard() {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  const [newMember, setNewMember] = useState<FamilyMember>({
    name: "",
    age: 28,
    gender: "Female",
    diet_type: "Vegetarian",
    sun_exposure: "Medium",
    activity_level: "Moderate",
    symptoms: [],
    allergies: []
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  const addMember = () => {
    if (!newMember.name) return;
    setMembers(prev => [...prev, newMember]);
    setNewMember({
      name: "",
      age: 28,
      gender: "Female",
      diet_type: "Vegetarian",
      sun_exposure: "Medium",
      activity_level: "Moderate",
      symptoms: [],
      allergies: []
    });
  };

  const removeMember = (idx: number) => {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const optimizeFamily = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/family/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: "Our Family Group",
          members: members
        })
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900">Family Menu Optimization</h2>
        <p className="text-sm text-slate-600">Assemble common base dishes to reduce cooking time and household food expenses.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Configure family group */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6 h-fit">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <Users className="h-5 w-5 text-emerald-600" /> Manage Family Group ({members.length})
          </h3>
          
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-600 italic">No family members added yet. Enter names and dietary details below to build your family group.</p>
              </div>
            ) : (
              members.map((m, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{m.name}</span>
                    <span className="text-[11px] text-slate-600 font-medium block">{m.age}y / {m.diet_type}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(idx)}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <span className="text-xs font-bold text-slate-700 block border-b border-slate-200 pb-2">Add Member</span>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Name</label>
              <input
                type="text"
                value={newMember.name}
                onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Daughter (Anisha)"
                className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-lg text-slate-900 outline-none text-xs font-medium placeholder-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Age</label>
                <input
                  type="number"
                  value={newMember.age}
                  onChange={e => setNewMember(prev => ({ ...prev, age: Number(e.target.value) }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-lg text-slate-900 outline-none text-xs font-medium"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Diet</label>
                <select
                  value={newMember.diet_type}
                  onChange={e => setNewMember(prev => ({ ...prev, diet_type: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-lg text-slate-900 text-xs font-medium"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                </select>
              </div>
            </div>

            <button
              onClick={addMember}
              className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add to Group
            </button>
          </div>

          <button
            onClick={optimizeFamily}
            disabled={loading || members.length === 0}
            className="w-full p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            {loading ? "Processing Joint Optimization..." : "Compute Collective Family Diet Plan"}
          </button>
        </div>

        {/* Right 2 Columns: Results display */}
        <div className="lg:col-span-2 space-y-6">
          {results ? (
            <div className="space-y-6">
              {/* Cost Savings display card */}
              <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col md:flex-row justify-between gap-6 shadow-sm">
                <div className="flex gap-4 items-start">
                  <div className="p-3 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl">
                    <TrendingDown className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">Culinary Shared Savings</h3>
                    <p className="text-xs text-emerald-800 mt-1 max-w-sm font-medium">Combining preparation of primary bases dramatically decreases food waste and purchase scaling costs.</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-8 items-center border-t md:border-t-0 md:border-l border-emerald-200 pt-4 md:pt-0 md:pl-6">
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Daily Discount</span>
                    <span className="text-2xl font-black text-emerald-700 block">₹{results.costs.daily_savings}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Monthly Savings</span>
                    <span className="text-2xl font-black text-emerald-700 block">₹{results.costs.monthly_savings}</span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Common Base Meal dishes */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-600" /> Shared Base Menu (Common to All)
                  </h4>
                  
                  <div className="space-y-3">
                    {results.base_menu.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{item.name}</span>
                          <span className="text-[10px] text-slate-600 font-medium capitalize">{item.category}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">{item.qty_g}g</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Personal Add-on items (tailored for deficiencies) */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                    <HeartPulse className="h-4 w-4 text-teal-600" /> Personalized Add-on Portions
                  </h4>
                  
                  <div className="space-y-4">
                    {results.member_addons.map((member: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <span className="text-xs font-bold text-teal-800 tracking-wide block">{member.name}</span>
                        {member.addons.length > 0 ? (
                          <div className="space-y-2 pl-2">
                            {member.addons.map((item: any, fidx: number) => (
                              <div key={fidx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <span className="text-[11px] font-semibold text-slate-800">{item.name}</span>
                                <span className="text-xs text-indigo-700 font-bold">{item.qty_g}g</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 pl-2 block italic">Adequate via Shared Menu. No active add-ons.</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border border-dashed border-slate-300 bg-white rounded-2xl p-10 text-center shadow-xs">
              <Users className="h-10 w-10 text-slate-400 mb-3" />
              <span className="font-bold text-slate-700 text-sm">No Active Simulation Results</span>
              <p className="text-xs mt-1 max-w-xs text-slate-600">Configure your family group on the left and run joint optimization to view the coordinated meal plans.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


