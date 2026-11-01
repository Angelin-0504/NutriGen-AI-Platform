import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Sparkles, ShieldAlert, HeartPulse, RefreshCw, Activity, 
  Target, Sliders, Dna, FileCheck, Scale
} from 'lucide-react';

interface DigitalTwinProps {
  userId: number;
}

export default function DigitalTwin({ userId }: DigitalTwinProps) {
  // Mode switcher between Nutrient Deficiency Digital Twin and Weight-Loss Digital Twin
  const [twinType, setTwinType] = useState<'deficiency' | 'weight_loss'>('deficiency');
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // --- Nutrient Deficiency Digital Twin State (Existing, Unchanged) ---
  const [adherence, setAdherence] = useState(85);
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [dietaryChoice, setDietaryChoice] = useState('standard_recommended');
  const [activeTab, setActiveTab] = useState<'nutrients' | 'risk' | 'adequacy' | 'comparison' | 'assumptions'>('nutrients');
  const [selectedNutrientTab, setSelectedNutrientTab] = useState('iron_deficiency');
  const [simulationData, setSimulationData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Weight-Loss Digital Twin State (New Independent Component) ---
  const [wlAdherence, setWlAdherence] = useState(85);
  const [wlDurationWeeks, setWlDurationWeeks] = useState(12);
  const [wlSimulationData, setWlSimulationData] = useState<any | null>(null);
  const [wlLoading, setWlLoading] = useState(false);
  const [wlErrorMsg, setWlErrorMsg] = useState<string | null>(null);
  const [weeklyWeights, setWeeklyWeights] = useState<any[]>([]);
  const [newLogWeight, setNewLogWeight] = useState('');
  const [newLogWeekNum, setNewLogWeekNum] = useState(1);
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);
  const [weightLogSuccess, setWeightLogSuccess] = useState<string | null>(null);

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

  const runWeightLossSimulation = async () => {
    setWlLoading(true);
    setWlErrorMsg(null);
    try {
      const res = await fetch('/api/digital-twin/weight-loss/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          adherence_score: wlAdherence,
          duration_weeks: wlDurationWeeks
        })
      });
      if (!res.ok) {
        throw new Error(`Weight-Loss simulation failed with status ${res.status}`);
      }
      const data = await res.json();
      setWlSimulationData(data);
    } catch (e: any) {
      console.error(e);
      setWlErrorMsg(e.message || 'Error running Weight-Loss Digital Twin simulation');
    } finally {
      setWlLoading(false);
    }
  };

  const loadWeeklyWeights = async () => {
    try {
      const res = await fetch(`/api/progress/weekly-weight/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setWeeklyWeights(data.records || []);
        if (data.next_week_number) {
          setNewLogWeekNum(data.next_week_number);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitWeeklyWeight = async () => {
    if (!newLogWeight || isNaN(Number(newLogWeight))) {
      alert("Please enter a valid weight in kg.");
      return;
    }
    setIsSubmittingWeight(true);
    setWeightLogSuccess(null);
    try {
      const res = await fetch('/api/progress/weekly-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          week_number: newLogWeekNum,
          weight: Number(newLogWeight)
        })
      });
      if (res.ok) {
        await res.json();
        setWeightLogSuccess(`Week ${newLogWeekNum} scale weight of ${newLogWeight} kg recorded! Digital Twin updated.`);
        setNewLogWeight('');
        await loadWeeklyWeights();
        await runWeightLossSimulation();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingWeight(false);
    }
  };

  // Initial user profile & twin setup
  useEffect(() => {
    fetch(`/api/user/${userId}`)
      .then(r => r.json())
      .then(u => {
        setUserProfile(u);
        if (u.wants_weight_loss) {
          setTwinType('weight_loss');
        }
      })
      .catch(console.error);
    loadWeeklyWeights();
  }, [userId]);

  // Run deficiency simulation on param change
  useEffect(() => {
    if (twinType === 'deficiency') {
      runSimulation();
    }
  }, [userId, adherence, durationWeeks, dietaryChoice, twinType]);

  // Run weight-loss simulation on param change
  useEffect(() => {
    if (twinType === 'weight_loss') {
      runWeightLossSimulation();
    }
  }, [userId, wlAdherence, wlDurationWeeks, twinType]);

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
      {/* Top Twin Mode Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 bg-slate-100 rounded-3xl border border-slate-200">
        <div className="flex items-center gap-2 p-1 bg-white rounded-2xl shadow-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTwinType('deficiency')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              twinType === 'deficiency'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Dna className="h-4 w-4" />
            Nutrient Deficiency Digital Twin
          </button>
          <button
            type="button"
            onClick={() => setTwinType('weight_loss')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              twinType === 'weight_loss'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Scale className="h-4 w-4" />
            Weight-Loss Digital Twin
            {userProfile?.wants_weight_loss && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold uppercase">
                Active Goal
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Independent Digital Twin Simulation Engines</span>
        </div>
      </div>

      {/* RENDER INDEPENDENT COMPONENT BASED ON SELECTED TWIN MODE */}
      {twinType === 'weight_loss' ? (
        /* =====================================================================
           COMPONENT 2: WEIGHT-LOSS DIGITAL TWIN (NEW INDEPENDENT COMPONENT)
           ===================================================================== */
        <div className="space-y-8 animate-in fade-in">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
              <Scale className="h-3.5 w-3.5 text-emerald-700" /> Energy Balance &amp; Adaptive Thermogenesis Digital Twin
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Weight-Loss Digital Twin Simulation Engine</h2>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto">
              Simulate realistic weight trajectories across three scenarios: Following the Plan, Partial Adherence, and Skipping Meals. Distinguishes actual scale weights from AI projections.
            </p>
          </div>

          {/* Scientific Transparency Banner */}
          <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
                <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                  Energy Balance Model &amp; Non-Clinical Simulation Disclaimer
                </h3>
              </div>
              <span className="text-[11px] text-amber-300 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-800 font-semibold">
                Wishnofsky ~7,700 kcal / kg
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This weight-loss simulation is a mathematical energy-balance projection calibrated with adaptive thermogenesis models. It does not constitute a guaranteed clinical prognosis or clinical weight outcome. <strong>Skipping meals does NOT guarantee fat loss</strong> and often triggers adaptive metabolic slowdown and evening compensatory rebound eating.
            </p>
          </div>

          {wlErrorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              {wlErrorMsg}
            </div>
          )}

          {/* Metric Cards Summary */}
          {wlSimulationData && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Weight</span>
                <span className="text-xl font-black text-slate-900">{wlSimulationData.current_weight} kg</span>
                <span className="text-[10px] text-slate-500 block">Baseline: {wlSimulationData.initial_weight} kg</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Weight</span>
                <span className="text-xl font-black text-emerald-600">{wlSimulationData.target_weight} kg</span>
                <span className="text-[10px] text-emerald-700 font-bold block">Goal: -{wlSimulationData.total_to_lose} kg</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Daily Calorie Target</span>
                <span className="text-xl font-black text-blue-600">{wlSimulationData.calorie_target} kcal</span>
                <span className="text-[10px] text-blue-700 font-bold block">Deficit: -{wlSimulationData.calorie_deficit} kcal</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">TDEE / BMR</span>
                <span className="text-xl font-black text-slate-800">{wlSimulationData.tdee}</span>
                <span className="text-[10px] text-slate-500 block">BMR: {wlSimulationData.bmr} kcal</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Meal Adherence</span>
                <span className="text-xl font-black text-purple-600">{wlSimulationData.adherence_score}%</span>
                <span className="text-[10px] text-purple-700 font-bold block">Recorded Compliance</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Projected 12W (Scen A)</span>
                <span className="text-xl font-black text-emerald-700">
                  {wlSimulationData.scenario_summaries?.[0]?.projected_12w || '--'} kg
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block">
                  {wlSimulationData.scenario_summaries?.[0]?.net_change_12w} kg
                </span>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">What-If Simulation Controls</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Adjust simulated dietary adherence and time horizon to model dynamic weight loss outcomes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Duration */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">Horizon:</span>
                  <select
                    value={wlDurationWeeks}
                    onChange={e => setWlDurationWeeks(Number(e.target.value))}
                    className="p-2 border border-slate-300 rounded-xl font-bold bg-slate-50 text-xs outline-none focus:bg-white"
                  >
                    <option value={8}>8 Weeks</option>
                    <option value={12}>12 Weeks (Recommended)</option>
                    <option value={16}>16 Weeks</option>
                    <option value={24}>24 Weeks</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={runWeightLossSimulation}
                  disabled={wlLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${wlLoading ? 'animate-spin' : ''}`} />
                  Recompute Twin
                </button>
              </div>
            </div>

            {/* Adherence Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Simulated Target Adherence:</span>
                <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {wlAdherence}% Adherent
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={wlAdherence}
                onChange={e => setWlAdherence(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                <span>20% (Low / Irregular)</span>
                <span>50% (Partial Adherence)</span>
                <span>85% (Consistent Real-world)</span>
                <span>100% (Strict Compliance)</span>
              </div>
            </div>
          </div>

          {/* THE THREE SCENARIOS CARDS */}
          {wlSimulationData && wlSimulationData.scenario_summaries && (
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-600" /> Three Simulation Scenarios Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {wlSimulationData.scenario_summaries.map((scen: any) => {
                  const isA = scen.id === 'scenario_a';
                  const isB = scen.id === 'scenario_b';
                  return (
                    <div
                      key={scen.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isA
                          ? 'bg-emerald-50/50 border-emerald-200 shadow-sm'
                          : isB
                          ? 'bg-amber-50/50 border-amber-200 shadow-sm'
                          : 'bg-rose-50/50 border-rose-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          isA ? 'bg-emerald-200 text-emerald-900' : isB ? 'bg-amber-200 text-amber-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {scen.adherence_level}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{scen.weekly_rate}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mb-1">{scen.name}</h4>
                      <p className="text-xs text-slate-600 mb-4 leading-relaxed">{scen.description}</p>

                      {/* Milestone projections */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-white/90 rounded-2xl border border-slate-200/80 text-center mb-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Week 4</span>
                          <span className="font-extrabold text-slate-800">{scen.projected_4w} kg</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Week 8</span>
                          <span className="font-extrabold text-slate-800">{scen.projected_8w} kg</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Week 12</span>
                          <span className={`font-black ${isA ? 'text-emerald-700' : isB ? 'text-amber-700' : 'text-rose-700'}`}>
                            {scen.projected_12w} kg
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 space-y-1">
                        <span className="font-bold text-slate-800 block">Metabolic Dynamic:</span>
                        <p>{scen.metabolic_impact}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* INTERACTIVE TRAJECTORY CHART */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Actual Recorded Scale Weight vs. Simulated Projections
                </h3>
                <p className="text-xs text-slate-500">
                  Compares confirmed weekly scale records against the three energy-balance trajectory models over {wlDurationWeeks} weeks.
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-bold">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span> Actual Measured
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-1 bg-emerald-500 inline-block"></span> Scenario A
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-1 bg-amber-500 inline-block"></span> Scenario B
                </span>
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-3 h-1 bg-rose-500 inline-block"></span> Scenario C
                </span>
              </div>
            </div>

            {wlLoading ? (
              <div className="h-80 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                <span className="text-xs font-bold text-slate-600">Calculating Weight-Loss Twin projections...</span>
              </div>
            ) : wlSimulationData?.chart_data ? (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wlSimulationData.chart_data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} unit=" kg" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} kg`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line
                      type="monotone"
                      dataKey="scenario_a"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Scenario A: Following Plan"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="scenario_b"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      name="Scenario B: Partial Adherence"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="scenario_c"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="2 2"
                      name="Scenario C: Skipping / Rebound"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual_weight"
                      stroke="#4f46e5"
                      strokeWidth={3.5}
                      name="Actual Scale Weight [Measured]"
                      connectNulls={true}
                      dot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="target_weight"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="6 6"
                      name="Target Goal"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : null}
          </div>

          {/* WEEKLY WEIGHT LOGGING & HISTORY COMPONENT */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-emerald-600" />
                  Weekly Scale Weight Progress &amp; Comparison
                </h3>
                <p className="text-xs text-slate-500">
                  Enter your verified scale weight at the end of every 7 days. Compares with initial, previous, and target weight.
                </p>
              </div>

              {/* Quick Log Form */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Week:</span>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={newLogWeekNum}
                  onChange={e => setNewLogWeekNum(Number(e.target.value))}
                  className="w-14 p-1.5 border border-slate-300 rounded-xl text-xs font-bold text-center outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Weight (kg)"
                  value={newLogWeight}
                  onChange={e => setNewLogWeight(e.target.value)}
                  className="w-24 p-1.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={submitWeeklyWeight}
                  disabled={isSubmittingWeight || !newLogWeight}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmittingWeight ? 'Saving...' : 'Save Weight'}
                </button>
              </div>
            </div>

            {weightLogSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                {weightLogSuccess}
              </div>
            )}

            {/* Weekly History Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3">Timeline</th>
                    <th className="py-2.5 px-3">Record Date</th>
                    <th className="py-2.5 px-3">Scale Weight</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Change vs Initial</th>
                    <th className="py-2.5 px-3">Change vs Previous</th>
                    <th className="py-2.5 px-3">Target Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {weeklyWeights.map((wRec: any, idx: number) => {
                    const isPending = wRec.status === 'pending';
                    const diffInit = wRec.weight_change_from_initial;
                    const diffPrev = wRec.weight_change_from_previous;
                    const remTarget = (wRec.weight && wRec.target_weight) ? Math.round((wRec.weight - wRec.target_weight) * 10) / 10 : '--';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {wRec.week_number === 0 ? 'Baseline (W0)' : `Week ${wRec.week_number}`}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{wRec.record_date}</td>
                        <td className="py-2.5 px-3 font-black text-slate-900">
                          {isPending ? '--' : `${wRec.weight} kg`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isPending ? 'Pending' : 'Recorded'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {diffInit !== undefined && diffInit !== null && !isPending ? (
                            <span className={`font-bold ${diffInit < 0 ? 'text-emerald-600' : diffInit > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              {diffInit > 0 ? `+${diffInit}` : `${diffInit}`} kg
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-2.5 px-3">
                          {diffPrev !== undefined && diffPrev !== null && !isPending ? (
                            <span className={`font-bold ${diffPrev < 0 ? 'text-emerald-600' : diffPrev > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                              {diffPrev > 0 ? `+${diffPrev}` : `${diffPrev}`} kg
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-semibold">
                          {isPending ? 'Pending' : remTarget !== '--' ? `${remTarget} kg to target` : '--'}
                        </td>
                      </tr>
                    );
                  })}
                  {weeklyWeights.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-medium">
                        No weekly weights logged yet. Log Week 1 weight to start tracking!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SCIENTIFIC ASSUMPTIONS & TRANSPARENCY ACCORDION */}
          {wlSimulationData && wlSimulationData.scientific_assumptions && (
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Scientific Assumptions &amp; Physiological Model Details
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {wlSimulationData.scientific_assumptions.map((ass: any, i: number) => (
                  <div key={i} className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                    <span className="font-extrabold text-slate-900 block text-xs">{ass.parameter}</span>
                    <p className="text-slate-600 text-[11px] font-medium leading-relaxed">{ass.assumption}</p>
                    <span className="text-[10px] text-emerald-700 block font-semibold pt-1">
                      Basis: {ass.clinical_basis}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* =====================================================================
           COMPONENT 1: EXISTING NUTRIENT DEFICIENCY DIGITAL TWIN (UNCHANGED)
           ===================================================================== */
        <div className="space-y-8 animate-in fade-in">
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
                  [Model Predicted]
                </span>
                <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
                  Current probability of deficiency generated by the NutriGen AI machine learning ensemble.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-extrabold text-[10px] uppercase">
                  [Calculated Intake]
                </span>
                <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
                  Sum of dietary micro/macronutrients from reported meals evaluated against ICMR RDA guidelines.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] uppercase">
                  [Simulated Outcome]
                </span>
                <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
                  Hypothetical future curve assuming continuous adherence and absorption synergy factors.
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic pt-1">
              {simulationData?.disclaimer || "Disclaimer: This is an AI-based nutritional scenario simulation based on mathematical dietary adherence models and physiological absorption assumptions. It should not be interpreted as a guaranteed medical prediction, biological diagnosis, or clinical forecast. Actual health status must be verified with certified laboratory blood tests."}
            </p>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              {errorMsg}
            </div>
          )}

          {/* Interactive User Controls */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Scenario Customization &amp; What-If Parameters
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Adjust hypothetical dietary compliance, simulation duration, and nutritional strategies.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Update Simulation
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Adherence Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Adherence to Recommended Plan:</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    {adherence}% Adherent
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={adherence}
                  onChange={e => setAdherence(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>20% (Sporadic)</span>
                  <span>60% (Moderate)</span>
                  <span>100% (Strict)</span>
                </div>
              </div>

              {/* Simulation Duration */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Time Horizon:</span>
                  <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                    {durationWeeks} Weeks
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[4, 8, 12, 16].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDurationWeeks(w)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        durationWeeks === w
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {w}w
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Pattern / Intervention Strategy */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 text-xs block">Intervention Strategy:</span>
                <select
                  value={dietaryChoice}
                  onChange={e => setDietaryChoice(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-bold bg-slate-50 text-xs outline-none focus:bg-white"
                >
                  <option value="standard_recommended">Standard Recommended Plan (Linear Programming)</option>
                  <option value="high_bioavailability">Enhanced Bioavailability (C+Iron, D+Calcium Synergy)</option>
                  <option value="budget_optimized">Budget-Optimized Local Whole Foods</option>
                  <option value="plant_enhanced">Plant &amp; Pulse-Centric Nutritional Plan</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4 Multi-Scenario Cards Preview */}
          {simulationData && simulationData.scenario_summaries && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {simulationData.scenario_summaries.map((s: any, idx: number) => {
                const colors = ['border-slate-300 bg-slate-50', 'border-emerald-300 bg-emerald-50/60', 'border-amber-300 bg-amber-50/60', 'border-teal-300 bg-teal-50/60'];
                const badges = ['bg-slate-200 text-slate-800', 'bg-emerald-200 text-emerald-900', 'bg-amber-200 text-amber-900', 'bg-teal-200 text-teal-900'];
                return (
                  <div key={idx} className={`p-4 rounded-2xl border ${colors[idx % 4]} space-y-1.5`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badges[idx % 4]}`}>
                        {s.adherence}% Adherence
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Scenario {idx + 1}</span>
                    </div>
                    <span className="text-xs font-black text-slate-900 block">{s.name.replace(/Scenario \d: /, '')}</span>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{s.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simulation Tabs & Detailed Displays */}
          {simulationData ? (
            <div className="space-y-6">
              {/* Tab Selector */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                {[
                  { key: 'nutrients', label: 'Nutrient-Wise Trajectories', icon: Dna },
                  { key: 'risk', label: 'Composite Deficiency Risk Curves', icon: Activity },
                  { key: 'adequacy', label: '% RDA Adequacy Projections', icon: HeartPulse },
                  { key: 'comparison', label: 'Dietary Pattern Comparison', icon: Scale },
                  { key: 'assumptions', label: 'Assumptions & Model Parameters', icon: FileCheck }
                ].map(t => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-xs' 
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Nutrient-Wise Results */}
              {activeTab === 'nutrients' && (
                <div className="space-y-6">
                  {/* Nutrient Pills */}
                  <div className="flex flex-wrap gap-2">
                    {nutrientOptions.map(n => {
                      const isSel = selectedNutrientTab === n.key;
                      return (
                        <button
                          key={n.key}
                          type="button"
                          onClick={() => setSelectedNutrientTab(n.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSel 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: n.color }} />
                          {n.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nutrient Detail Card */}
                  {simulationData.nutrient_wise && simulationData.nutrient_wise[selectedNutrientTab] && (
                    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              {simulationData.nutrient_wise[selectedNutrientTab].label}
                            </span>
                            <span className="text-xs text-slate-500 font-bold">
                              RDA Target: {simulationData.nutrient_wise[selectedNutrientTab].rda_target} {simulationData.nutrient_wise[selectedNutrientTab].unit}/day
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 mt-1">
                            {simulationData.nutrient_wise[selectedNutrientTab].label} Simulated Risk &amp; Intake Trajectory
                          </h4>
                        </div>

                        {/* Three Data Classification Badges for This Specific Nutrient */}
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <div className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200">
                            <span className="text-purple-900 font-extrabold">[Predicted Risk]: </span>
                            <span className="font-bold text-purple-700">
                              {simulationData.nutrient_wise[selectedNutrientTab].baseline_predicted_risk}
                            </span>
                          </div>
                          <div className="px-2.5 py-1 rounded-xl bg-teal-50 border border-teal-200">
                            <span className="text-teal-900 font-extrabold">[Calculated Intake]: </span>
                            <span className="font-bold text-teal-700">
                              {simulationData.nutrient_wise[selectedNutrientTab].calculated_daily_intake} {simulationData.nutrient_wise[selectedNutrientTab].unit}
                            </span>
                          </div>
                          <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-amber-900 font-extrabold">[Simulated W{durationWeeks}]: </span>
                            <span className="font-bold text-amber-700">
                              {simulationData.nutrient_wise[selectedNutrientTab].simulated_end_risk}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Chart for This Nutrient Across 4 Scenarios */}
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart 
                            data={simulationData.nutrient_wise[selectedNutrientTab].chart}
                            margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                            <Tooltip 
                              formatter={(val: any, name: any) => [`${val}%`, name]}
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '11px' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="scenario_1" stroke="#64748b" strokeWidth={2} name="Scenario 1: Current Diet (Unadjusted)" />
                            <Line type="monotone" dataKey="scenario_2" stroke="#059669" strokeWidth={3} name="Scenario 2: User-Controlled Plan" />
                            <Line type="monotone" dataKey="scenario_3" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" name="Scenario 3: Lower Adherence (~45%)" />
                            <Line type="monotone" dataKey="scenario_4" stroke="#0d9488" strokeWidth={2} name="Scenario 4: Localized Strategy" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Absorption Synergy & Mechanism */}
                      <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-1">
                        <span className="text-xs font-black text-emerald-950 block">Bioavailability &amp; Absorption Synergy Dynamic:</span>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {simulationData.nutrient_wise[selectedNutrientTab].synergy_note}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Composite Risk Curves */}
              {activeTab === 'risk' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">Composite Deficiency Probability Over Time</h4>
                      <p className="text-xs text-slate-500">Average predicted risk score across all 6 evaluated nutrients.</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500">[Simulated Outcome Timeline]</span>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={simulationData.risk_chart_data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                        <Tooltip 
                          formatter={(val: any, name: any) => [`${val}%`, name]}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line type="monotone" dataKey="scenario_1" stroke="#64748b" strokeWidth={2} name="Scenario 1: Current Diet" />
                        <Line type="monotone" dataKey="scenario_2" stroke="#059669" strokeWidth={3} name={`Scenario 2: User-Controlled (${adherence}% Adherent)`} />
                        <Line type="monotone" dataKey="scenario_3" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" name="Scenario 3: Low Adherence (45%)" />
                        <Line type="monotone" dataKey="scenario_4" stroke="#0d9488" strokeWidth={2} name="Scenario 4: Localized Whole Foods" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 3: Adequacy Projections */}
              {activeTab === 'adequacy' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900">Projected % RDA Adequacy Across Nutrients</h4>
                      <p className="text-xs text-slate-500">Comparison of calculated current baseline intake vs Scenario 2 recommended target.</p>
                    </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={simulationData.adequacy_chart_data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="nutrient" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 150]} />
                        <Tooltip 
                          formatter={(val: any, name: any) => [`${val}%`, name]}
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '1rem', color: '#fff', fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="current_adequacy_pct" fill="#94a3b8" name="Current Baseline Intake (% RDA)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="recommended_adequacy_pct" fill="#059669" name="Recommended Target (% RDA)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 4: Current vs Recommended Comparison Table */}
              {activeTab === 'comparison' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-4">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">Current vs Recommended Dietary Pattern Analysis</h4>
                    <p className="text-xs text-slate-500">
                      Comparing calculated baseline dietary intake against targeted nutrient targets and physiological synergy factors.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-3">Dietary Component</th>
                          <th className="py-2.5 px-3">Current Intake [Calculated]</th>
                          <th className="py-2.5 px-3">Recommended Plan [Target]</th>
                          <th className="py-2.5 px-3">Synergy &amp; Bioavailability Focus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        {simulationData.comparison_table.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{row.nutrient}</td>
                            <td className="py-2.5 px-3 text-slate-600">{row.current_pattern}</td>
                            <td className="py-2.5 px-3 font-bold text-emerald-700">{row.recommended_plan}</td>
                            <td className="py-2.5 px-3 text-slate-600">{row.synergy_factor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: Assumptions & Transparency Documentation */}
              {activeTab === 'assumptions' && (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900">Digital Twin Mathematical Assumptions</h4>
                    <p className="text-xs text-slate-500">
                      Explicit documentation of simulation parameters, biological absorption formulas, and adherence constraints.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {simulationData.simulation_assumptions.map((ass: any, i: number) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                        <span className="font-extrabold text-slate-900 block text-xs">{ass.parameter}</span>
                        <p className="text-slate-600 text-[11px] font-medium leading-relaxed">{ass.assumption}</p>
                        <span className="text-[10px] text-emerald-700 block font-semibold pt-1">
                          Scientific Rationale: {ass.rationale}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Baseline Profile Confirmation */}
                  {simulationData.baseline_profile && (
                    <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-2">
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
      )}
    </div>
  );
}
