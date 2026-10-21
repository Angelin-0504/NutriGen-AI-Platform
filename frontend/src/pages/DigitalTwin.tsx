import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Play, Sparkles, ShieldAlert, HeartPulse, RefreshCw, Activity, 
  Target, HelpCircle, Sliders, Dna, FileCheck, Scale
} from 'lucide-react';

interface DigitalTwinProps {
  userId: number;
}

export default function DigitalTwin({ userId }: DigitalTwinProps) {
  const [adherence, setAdherence] = useState(85);
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [dietaryChoice, setDietaryChoice] = useState('standard_recommended');
  const [activeTab, setActiveTab] = useState<'nutrients' | 'risk' | 'adequacy' | 'comparison' | 'assumptions'>('nutrients');
  const [selectedNutrientTab, setSelectedNutrientTab] = useState('iron_deficiency');
  const [simulationData, setSimulationData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/digital-twin/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          adherence_score: adherence,
          duration_weeks: durationWeeks,
          dietary_choice: dietaryChoice
        })
      });
      if (!res.ok) {
        throw new Error(`Simulation failed with status ${res.status}`);
      }
      const data = await res.json();
      setSimulationData(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error running Digital Twin simulation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [userId]);

  const nutrientOptions = [
    { key: 'iron_deficiency', label: 'Iron', symbol: 'Fe', color: '#ef4444' },
    { key: 'vitamin_d_deficiency', label: 'Vitamin D', symbol: 'Vit D', color: '#f59e0b' },
    { key: 'vitamin_b12_deficiency', label: 'Vitamin B12', symbol: 'B12', color: '#8b5cf6' },
    { key: 'calcium_deficiency', label: 'Calcium', symbol: 'Ca', color: '#3b82f6' },
    { key: 'magnesium_deficiency', label: 'Magnesium', symbol: 'Mg', color: '#10b981' },
    { key: 'zinc_deficiency', label: 'Zinc', symbol: 'Zn', color: '#06b6d4' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-emerald-700" /> Physiological Scenario Digital Twin
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nutrition Digital Twin Simulation Engine</h2>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Simulate how your nutritional profile and deficiency risks mathematically evolve under different dietary choices, adherence rates, and meal plans over time.
        </p>
      </div>

      {/* Prominent Scientific Integrity Banner: Data Type Badges */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Scientific Transparency &amp; Data Classification Guide
            </h3>
          </div>
          <span className="text-[11px] text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800 font-semibold">
            Non-Clinical Mathematical Model
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold text-[10px] uppercase">
              [Measured Value]
            </span>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              Direct blood biomarkers from uploaded doctor lab reports (e.g. Serum Ferritin, 25(OH)D).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold text-[10px] uppercase">
              [Model-Predicted Risk]
            </span>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              ML super-ensemble probability of deficiency based on symptoms, diet, and clinical profile.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase">
              [Calculated Intake]
            </span>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              Dietary nutrient intake calculated from reported foods against CDC/ICMR-NIN RDA standards.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
            <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase">
              [Simulated Outcome]
            </span>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              Mathematical what-if trajectory based on assumed adherence. <strong>Not a biological cure or guarantee.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Main Simulation Control Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Scenario Controls */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-md space-y-6 h-fit">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-600" /> Scenario Controls
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              What-If Engine
            </span>
          </div>

          {/* Adherence Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 font-bold">Assumed Adherence Rate</span>
              <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {adherence}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={adherence}
              onChange={e => setAdherence(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>Low (10%)</span>
              <span>Moderate (50%)</span>
              <span>High (100%)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Tests how the simulation shifts if you adhere to {adherence}% of the recommended meal plan meals.
            </p>
          </div>

          {/* Duration Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Simulation Horizon (Weeks)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[4, 8, 12, 16].map(weeks => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => setDurationWeeks(weeks)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    durationWeeks === weeks
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {weeks}w
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Choice / Strategy Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Alternative Dietary Strategy
            </label>
            <select
              value={dietaryChoice}
              onChange={e => setDietaryChoice(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
            >
              <option value="standard_recommended">Scenario 2: Recommended Meal Plan (LP Balanced)</option>
              <option value="high_bioavailability">Scenario 2: Enhanced Bioavailability (Pairing & Synergy)</option>
              <option value="budget_optimized">Scenario 2: Budget &amp; Local Whole Foods Focus</option>
              <option value="plant_enhanced">Scenario 2: Plant &amp; Pulse-Centric Plan</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Modifies gut absorption coefficients based on synergistic food pairings (e.g. Vit C + Iron).
            </p>
          </div>

          {/* 4 Compared Scenarios Description Box */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="text-[11px] font-extrabold text-slate-900 block uppercase tracking-wider">
              Simulated Scenarios:
            </span>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0"></span>
                <span>Scenario 1: Current Dietary Pattern</span>
              </div>
              <p className="text-[11px] text-slate-500 pl-4.5">Unadjusted baseline dietary habits (~30% adherence).</p>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0"></span>
                <span>Scenario 2: Recommended Plan ({adherence}%)</span>
              </div>
              <p className="text-[11px] text-emerald-800 pl-4.5">NutriGen AI 7-day LP tailored meals at your selected adherence.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <span>Scenario 3: Lower Adherence (45%)</span>
              </div>
              <p className="text-[11px] text-amber-800 pl-4.5">Frequent meal skips or irregular adherence.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs space-y-0.5">
              <div className="flex items-center gap-2 font-bold text-teal-900">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shrink-0"></span>
                <span>Scenario 4: Alternative Local Strategy</span>
              </div>
              <p className="text-[11px] text-teal-800 pl-4.5">Affordable localized whole foods strategy (~72% adherence).</p>
            </div>
          </div>

          <button
            type="button"
            onClick={runSimulation}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-white" />}
            Compute What-If Scenarios
          </button>
        </div>

        {/* Right 2 Columns: Multi-Scenario Interactive Tabs & Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main View Tabs */}
          <div className="flex p-1.5 bg-slate-200/80 rounded-2xl gap-1 text-xs font-bold overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('nutrients')}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'nutrients' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Dna className="h-4 w-4" /> 6-Nutrient Trajectories
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comparison')}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'comparison' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="h-4 w-4" /> Current vs Recommended
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('risk')}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'risk' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="h-4 w-4" /> Deficiency Risks (%)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('adequacy')}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'adequacy' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="h-4 w-4" /> Nutrient Adequacy (%)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assumptions')}
              className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                activeTab === 'assumptions' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="h-4 w-4" /> Model Assumptions
            </button>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-bold flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" /> {errorMsg}
            </div>
          )}

          {simulationData ? (
            <div className="space-y-6">
              {/* TAB 1: 6-Nutrient Detailed Results */}
              {activeTab === 'nutrients' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                  {/* Nutrient Selector Pill Buttons */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                    {nutrientOptions.map(nut => {
                      const isSelected = selectedNutrientTab === nut.key;
                      const nutData = simulationData.nutrient_wise ? simulationData.nutrient_wise[nut.key] : null;
                      return (
                        <button
                          key={nut.key}
                          type="button"
                          onClick={() => setSelectedNutrientTab(nut.key)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nut.color }} />
                          {nut.label}
                          {nutData?.status && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              nutData.status === 'High Risk' ? 'bg-rose-500 text-white' :
                              nutData.status === 'Moderate Risk' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                            }`}>
                              {nutData.status}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Nutrient Deep-Dive */}
                  {(() => {
                    const activeNut = simulationData.nutrient_wise ? simulationData.nutrient_wise[selectedNutrientTab] : null;
                    const nutMeta = nutrientOptions.find(n => n.key === selectedNutrientTab);

                    if (!activeNut) {
                      return <div className="text-xs text-slate-400">Nutrient data not available.</div>;
                    }

                    return (
                      <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black text-slate-900">{nutMeta?.label} Trajectory Projection</h4>
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                [SIMULATED SCENARIO]
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Estimated dietary intake vs Recommended Daily Allowance ({activeNut.target_rda} {activeNut.unit}/day).
                            </p>
                          </div>

                          <div className="flex items-center gap-4 text-xs shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Baseline Intake</span>
                              <span className="text-sm font-extrabold text-slate-800">
                                {activeNut.baseline_intake} {activeNut.unit}
                              </span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-4">
                              <span className="text-[10px] text-slate-400 block font-bold uppercase">Target RDA</span>
                              <span className="text-sm font-extrabold text-emerald-700">
                                {activeNut.target_rda} {activeNut.unit}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Baseline Lab Confirmation if available */}
                        {activeNut.baseline_lab && (
                          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-blue-600" />
                              <span className="font-extrabold text-blue-900">
                                [MEASURED VALUE] Clinical Lab Biomarker on Record:
                              </span>
                              <span className="font-bold text-slate-800">
                                {activeNut.baseline_lab.value} {activeNut.baseline_lab.unit}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              activeNut.baseline_lab.status === 'Low' ? 'bg-rose-100 text-rose-800' :
                              activeNut.baseline_lab.status === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {activeNut.baseline_lab.status}
                            </span>
                          </div>
                        )}

                        {/* Chart: 4 Scenarios for this specific nutrient */}
                        <div className="h-72 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activeNut.timeline}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="week" stroke="#64748b" fontSize={11} fontWeight={600} />
                              <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '11px', backgroundColor: '#ffffff', color: '#0f172a' }} 
                                itemStyle={{ color: '#0f172a' }} 
                                formatter={(val: any) => [`${val}% Adequacy`, '']}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                              <Line 
                                name="Scenario 1: Current Pattern" 
                                type="monotone" 
                                dataKey="current_pattern" 
                                stroke="#64748b" 
                                strokeWidth={2} 
                                strokeDasharray="4 4" 
                                dot={{ r: 3 }} 
                              />
                              <Line 
                                name={`Scenario 2: Recommended Plan (${adherence}%)`} 
                                type="monotone" 
                                dataKey="recommended_plan" 
                                stroke="#059669" 
                                strokeWidth={3} 
                                dot={{ r: 5 }} 
                              />
                              <Line 
                                name="Scenario 3: Lower Adherence (45%)" 
                                type="monotone" 
                                dataKey="lower_adherence" 
                                stroke="#f59e0b" 
                                strokeWidth={2} 
                                dot={{ r: 3 }} 
                              />
                              <Line 
                                name="Scenario 4: Alternative Local Strategy" 
                                type="monotone" 
                                dataKey="alternative_strategy" 
                                stroke="#0d9488" 
                                strokeWidth={2} 
                                dot={{ r: 3 }} 
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: Current vs Recommended Dietary Pattern Comparison */}
              {activeTab === 'comparison' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Dietary Pattern Comparison: Current vs. Recommended Meal Plan
                    </h4>
                    <p className="text-xs text-slate-500">
                      Evaluates current unadjusted food intake vs. NutriGen AI LP-optimized daily intake against RDA guidelines.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3">Nutrient</th>
                          <th className="py-3 px-3">Current Intake [Calculated]</th>
                          <th className="py-3 px-3">Recommended Plan [Planned]</th>
                          <th className="py-3 px-3">Target RDA [Benchmark]</th>
                          <th className="py-3 px-3">Current Adequacy</th>
                          <th className="py-3 px-3">Optimized Adequacy</th>
                          <th className="py-3 px-3">Improvement Shift</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {(simulationData.dietary_comparison || []).map((row: any) => (
                          <tr key={row.nutrient} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-900">{row.nutrient}</td>
                            <td className="py-3 px-3 text-slate-700">
                              {row.current_intake} {row.unit}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-700">
                              {row.recommended_intake} {row.unit}
                            </td>
                            <td className="py-3 px-3 text-slate-500">
                              {row.target_rda} {row.unit}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.current_adequacy_pct < 60 ? 'bg-rose-100 text-rose-800' :
                                row.current_adequacy_pct < 85 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {row.current_adequacy_pct}%
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {row.recommended_adequacy_pct}%
                              </span>
                            </td>
                            <td className="py-3 px-3 font-extrabold text-emerald-600">
                              +{row.change_pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <span className="font-extrabold text-slate-800 block mb-0.5">Note on Dietary Nutrient Calculations:</span>
                    Calculations reflect bioavailable nutrient sums delivered by the LP optimization engine. Real biological uptake is subject to personal gastrointestinal health, cooking methods, and individual metabolism.
                  </div>
                </div>
              )}

              {/* TAB 3: Deficiency Risk Scores */}
              {activeTab === 'risk' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Deficiency Risk Score Trajectories (%) Over {durationWeeks} Weeks
                    </h4>
                    <p className="text-xs text-slate-500">
                      Estimated probability of clinical deficiency under 4 different adherence scenarios.
                    </p>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={simulationData.risk_chart_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="week" stroke="#64748b" fontSize={11} fontWeight={600} />
                        <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '11px', backgroundColor: '#ffffff', color: '#0f172a' }} itemStyle={{ color: '#0f172a' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                        <Line name="Scenario 1: Current Pattern" type="monotone" dataKey="scenario_1" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
                        <Line name={`Scenario 2: Recommended Plan (${adherence}%)`} type="monotone" dataKey="scenario_2" stroke="#059669" strokeWidth={3.5} dot={{ r: 5 }} />
                        <Line name="Scenario 3: Lower Adherence (45%)" type="monotone" dataKey="scenario_3" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        <Line name="Scenario 4: Alternative Plan" type="monotone" dataKey="scenario_4" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 4: Nutrient Adequacy Bar Chart */}
              {activeTab === 'adequacy' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Nutrient Adequacy Against RDA Targets (%)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Simulated percentage of Recommended Dietary Allowance achieved across all 4 scenarios.
                    </p>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simulationData.adequacy_chart_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="nutrient" stroke="#64748b" fontSize={11} fontWeight={600} />
                        <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 120]} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '11px', backgroundColor: '#ffffff', color: '#0f172a' }} itemStyle={{ color: '#0f172a' }} />
                        <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                        <Bar name="Scenario 1: Current Pattern" dataKey="scenario_1" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar name={`Scenario 2: Recommended Plan (${adherence}%)`} dataKey="scenario_2" fill="#059669" radius={[4, 4, 0, 0]} />
                        <Bar name="Scenario 3: Lower Adherence" dataKey="scenario_3" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar name="Scenario 4: Alternative Plan" dataKey="scenario_4" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 5: Assumptions & Mathematical Formulation */}
              {activeTab === 'assumptions' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">
                      Digital Twin Simulation Assumptions &amp; Mathematical Principles
                    </h4>
                    <p className="text-xs text-slate-500">
                      Explicit transparent breakdown of the equations, biological constants, and limitations utilized in this model.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs text-slate-700">
                    {(simulationData.assumptions || []).map((assump: string, idx: number) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed font-medium">{assump}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                    <span className="font-extrabold block text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600" /> Non-Clinical Nature of Simulation
                    </span>
                    <p className="leading-relaxed">
                      {simulationData.disclaimer || "Simulated results represent mathematical projections and not biological cures. Health outcomes must be confirmed through clinical blood testing."}
                    </p>
                  </div>
                </div>
              )}

              {/* User Baseline Nutritional Profile & Lab Card */}
              {simulationData.baseline_profile && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="h-5 w-5 text-emerald-600" />
                      <h4 className="text-sm font-extrabold text-slate-900">
                        Baseline Profile &amp; Available Measurements
                      </h4>
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      User Assessment Baseline
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Age</span>
                      <span className="font-bold text-slate-800">{simulationData.baseline_profile.age || '—'} yrs</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Gender</span>
                      <span className="font-bold text-slate-800">{simulationData.baseline_profile.gender || '—'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">BMI</span>
                      <span className="font-bold text-slate-800">{simulationData.baseline_profile.bmi || '—'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Diet</span>
                      <span className="font-bold text-slate-800">{simulationData.baseline_profile.diet_type || '—'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Daily Budget</span>
                      <span className="font-bold text-slate-800">₹{simulationData.baseline_profile.daily_food_budget || '—'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Region</span>
                      <span className="font-bold text-slate-800 truncate block">{simulationData.baseline_profile.region || '—'}</span>
                    </div>
                  </div>

                  {/* Confirmed Lab Measurements Table if available */}
                  {simulationData.baseline_profile.lab_measurements && simulationData.baseline_profile.lab_measurements.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                        Confirmed Laboratory Biomarkers [Measured Values]:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {simulationData.baseline_profile.lab_measurements.map((lab: any, i: number) => (
                          <div key={i} className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-800 block">{lab.name}</span>
                              <span className="text-[10px] text-slate-500">{lab.value} {lab.unit}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              lab.status === 'Low' ? 'bg-rose-100 text-rose-800' :
                              lab.status === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {lab.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl bg-white p-10 text-center shadow-sm">
              <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mb-3" />
              <span className="font-extrabold text-slate-800 text-sm">Computing Digital Twin 4-Scenario simulation...</span>
              <p className="text-xs text-slate-500 mt-1">Applying mathematical adherence models and bioavailability algorithms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
