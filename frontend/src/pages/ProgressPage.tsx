import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  CheckCircle2, RefreshCw, Sparkles, Clock, Calendar, 
  AlertTriangle, ShieldAlert, Save, Plus, Scale, Flame
} from 'lucide-react';

interface ProgressPageProps {
  userId: number;
}

const MEAL_SLOTS = [
  { id: 'Breakfast', label: 'Breakfast', defaultCals: 300 },
  { id: 'Mid-Morning Snack', label: 'Mid-Morning Snack', defaultCals: 150 },
  { id: 'Lunch', label: 'Lunch', defaultCals: 500 },
  { id: 'Evening Snack', label: 'Evening Snack', defaultCals: 150 },
  { id: 'Dinner', label: 'Dinner', defaultCals: 400 }
];

const COMMON_SYMPTOMS = [
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'pale_skin', label: 'Pale Skin' },
  { id: 'hair_loss', label: 'Hair Loss' },
  { id: 'weak_nails', label: 'Weak Nails' },
  { id: 'bone_pain', label: 'Bone Pain' },
  { id: 'muscle_cramps', label: 'Muscle Cramps' },
  { id: 'numbness_tingling', label: 'Numbness / Tingling' }
];

export default function ProgressPage({ userId }: ProgressPageProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Today's date default
  const todayStr = new Date().toISOString().split('T')[0];
  const [checkinDate, setCheckinDate] = useState(todayStr);

  // User profile
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Planned meals & calories for selected day
  const [plannedMeals, setPlannedMeals] = useState<Record<string, string>>({});
  const [plannedMealCalories, setPlannedMealCalories] = useState<Record<string, number>>({});
  
  // Daily checkin form state
  const [mealCheckins, setMealCheckins] = useState<Record<string, {
    status: 'unreported' | 'eaten_as_planned' | 'eaten_with_modifications' | 'replaced' | 'skipped';
    portion_pct: number;
    planned_food?: string;
    planned_calories?: number;
    actual_food?: string;
    actual_calories?: number;
    reason?: string;
    notes?: string;
  }>>({
    'Breakfast': { status: 'unreported', portion_pct: 100 },
    'Mid-Morning Snack': { status: 'unreported', portion_pct: 100 },
    'Lunch': { status: 'unreported', portion_pct: 100 },
    'Evening Snack': { status: 'unreported', portion_pct: 100 },
    'Dinner': { status: 'unreported', portion_pct: 100 }
  });

  const [currentWeight, setCurrentWeight] = useState<number | ''>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [dailyNotes, setDailyNotes] = useState('');

  // Weekly weight tracking state
  const [weeklyWeights, setWeeklyWeights] = useState<any[]>([]);
  const [newLogWeight, setNewLogWeight] = useState<string>('');
  const [newLogWeekNum, setNewLogWeekNum] = useState<number>(1);
  const [submittingWeeklyWeight, setSubmittingWeeklyWeight] = useState(false);
  const [weeklyWeightNotice, setWeeklyWeightNotice] = useState<string | null>(null);

  // Optional new lab measurement input
  const [newLabTest, setNewLabTest] = useState({
    name: 'Hemoglobin',
    value: '',
    unit: 'g/dL',
    date: todayStr
  });
  const [recordedLabs, setRecordedLabs] = useState<Record<string, any>>({});

  // History and aggregated stats
  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any | null>(null);
  const [labHistory, setLabHistory] = useState<any[]>([]);
  const [adaptationNotes, setAdaptationNotes] = useState<string[]>([]);

  const estimateFoodCaloriesClient = (name: string): number => {
    if (!name) return 220;
    const clean = name.toLowerCase();
    if (clean.includes('salad') || clean.includes('soup') || clean.includes('sprout') || clean.includes('cucumber')) return 110;
    if (clean.includes('fruit') || clean.includes('apple') || clean.includes('banana') || clean.includes('smoothie')) return 130;
    if (clean.includes('buttermilk') || clean.includes('curd') || clean.includes('milk')) return 95;
    if (clean.includes('egg') || clean.includes('omelette')) return 145;
    if (clean.includes('idli') || clean.includes('dosa') || clean.includes('roti') || clean.includes('dal')) return 210;
    if (clean.includes('rice') || clean.includes('khichdi') || clean.includes('pongal')) return 250;
    if (clean.includes('paneer') || clean.includes('soya')) return 240;
    if (clean.includes('chicken') || clean.includes('fish')) return 280;
    if (clean.includes('biryani') || clean.includes('fried') || clean.includes('burger') || clean.includes('sweet')) return 420;
    return 220;
  };

  // Load planned meals from saved plan and progress history
  const loadInitialData = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      // 1. Fetch user progress history
      const histRes = await fetch(`/api/progress/${userId}`);
      if (histRes.ok) {
        const hData = await histRes.json();
        setProgressHistory(hData.history || []);
        setWeeklyStats(hData.weekly_stats || null);
        setLabHistory(hData.lab_history || []);
        setAdaptationNotes(hData.adaptation_notes || []);
      }

      // 2. Fetch user profile
      const userRes = await fetch(`/api/user/${userId}`);
      if (userRes.ok) {
        const u = await userRes.json();
        setUserProfile(u);
        if (u.weight) setCurrentWeight(u.weight);
        if (u.symptoms) setSelectedSymptoms(u.symptoms);
      }

      // 3. Fetch meal plan to show planned meals for the check-in day
      const planRes = await fetch(`/api/meal-plan?user_id=${userId}`, { method: 'POST' });
      if (planRes.ok) {
        const pData = await planRes.json();
        if (Array.isArray(pData) && pData.length > 0) {
          const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const currentDayName = dayNames[new Date().getDay()];
          const matchingDay = pData.find(d => d.day.toLowerCase() === currentDayName.toLowerCase()) || pData[0];
          
          const mealsMap: Record<string, string> = {};
          const calsMap: Record<string, number> = {};
          if (matchingDay && matchingDay.meals) {
            Object.entries(matchingDay.meals).forEach(([slot, val]: [string, any]) => {
              mealsMap[slot] = (val.foods || []).join(' + ') || 'Nutrient Balanced Food';
              calsMap[slot] = val.nutrients?.calories || 250;
            });
          }
          setPlannedMeals(mealsMap);
          setPlannedMealCalories(calsMap);
        }
      }

      // 4. Fetch weekly weight records
      const weightRes = await fetch(`/api/progress/weekly-weight/${userId}`);
      if (weightRes.ok) {
        const wData = await weightRes.json();
        setWeeklyWeights(wData.records || []);
        if (wData.next_week_number) {
          setNewLogWeekNum(wData.next_week_number);
        }
      }
    } catch (e: any) {
      console.error(e);
      setErrorNotice("Could not load initial progress records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [userId]);

  // Handle meal status update
  const handleMealStatusChange = (slot: string, status: any) => {
    const pCals = plannedMealCalories[slot] || 250;
    setMealCheckins(prev => {
      const cur = prev[slot] || { status: 'unreported', portion_pct: 100 };
      let actCals: number | undefined = undefined;
      if (status === 'eaten_as_planned') {
        actCals = pCals;
      } else if (status === 'eaten_with_modifications') {
        actCals = Math.round(pCals * ((cur.portion_pct || 100) / 100));
      } else if (status === 'replaced') {
        const repBase = estimateFoodCaloriesClient(cur.actual_food || '');
        actCals = Math.round(repBase * ((cur.portion_pct || 100) / 100));
      } else if (status === 'skipped') {
        actCals = 0;
      }
      return {
        ...prev,
        [slot]: {
          ...cur,
          status,
          planned_calories: pCals,
          actual_calories: actCals,
          actual_food: status === 'replaced' ? cur.actual_food || '' : undefined,
          reason: (status === 'skipped' || status === 'replaced') ? cur.reason || '' : undefined
        }
      };
    });
  };

  const handleMealFieldChange = (slot: string, field: string, val: any) => {
    const pCals = plannedMealCalories[slot] || 250;
    setMealCheckins(prev => {
      const cur = prev[slot] || { status: 'unreported', portion_pct: 100 };
      const updated = { ...cur, [field]: val };
      
      // Recalculate actual calories on portion change or replacement food change
      if (field === 'portion_pct') {
        if (updated.status === 'eaten_with_modifications') {
          updated.actual_calories = Math.round(pCals * (Number(val) / 100));
        } else if (updated.status === 'replaced') {
          const repBase = estimateFoodCaloriesClient(updated.actual_food || '');
          updated.actual_calories = Math.round(repBase * (Number(val) / 100));
        }
      } else if (field === 'actual_food' && updated.status === 'replaced') {
        const repBase = estimateFoodCaloriesClient(String(val));
        updated.actual_calories = Math.round(repBase * ((updated.portion_pct || 100) / 100));
      }
      
      return {
        ...prev,
        [slot]: updated
      };
    });
  };

  const toggleSymptom = (symId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symId) ? prev.filter(s => s !== symId) : [...prev, symId]
    );
  };

  const addLabMeasurement = () => {
    if (!newLabTest.value || isNaN(Number(newLabTest.value))) {
      alert("Please enter a valid numeric value for the lab test.");
      return;
    }
    const valNum = Number(newLabTest.value);
    let status = "Normal";
    if (newLabTest.name === "Hemoglobin" && valNum < 12.0) status = "Low";
    if (newLabTest.name === "25-OH Vitamin D" && valNum < 30.0) status = "Low";
    if (newLabTest.name === "Vitamin B12" && valNum < 200.0) status = "Low";
    if (newLabTest.name === "Serum Calcium" && valNum < 8.5) status = "Low";

    setRecordedLabs(prev => ({
      ...prev,
      [newLabTest.name]: {
        value: valNum,
        unit: newLabTest.unit,
        date: newLabTest.date,
        status: status
      }
    }));

    setNewLabTest(prev => ({ ...prev, value: '' }));
  };

  const removeLabMeasurement = (name: string) => {
    setRecordedLabs(prev => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  // Submit Daily Checkin
  const handleSaveProgress = async () => {
    setSubmitting(true);
    setSaveSuccessNotice(null);
    setErrorNotice(null);

    // Enrich meal check-in payload with planned & actual calories
    const enrichedCheckins: Record<string, any> = {};
    MEAL_SLOTS.forEach(slot => {
      const checkin = mealCheckins[slot.id] || { status: 'unreported' };
      const pCals = plannedMealCalories[slot.id] || slot.defaultCals;
      enrichedCheckins[slot.id] = {
        ...checkin,
        planned_food: plannedMeals[slot.id] || 'Nutrient Balanced Food',
        planned_calories: pCals
      };
    });

    const payload = {
      user_id: userId,
      record_date: checkinDate,
      meal_checkins: enrichedCheckins,
      symptoms: selectedSymptoms,
      lab_measurements: recordedLabs,
      weight: currentWeight ? Number(currentWeight) : undefined,
      notes: dailyNotes
    };

    try {
      const res = await fetch('/api/progress/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        throw new Error('Checkin submission failed');
      }
      const data = await res.json();
      setSaveSuccessNotice(
        `Check-in for ${data.record_date} saved! Adherence: ${data.adherence_pct}% • Confirmed Intake: ${data.total_actual_calories || 0} kcal (Remaining: ${data.remaining_calorie_allowance || 0} kcal)`
      );
      
      // Reload history to show updated tables & charts
      await loadInitialData();
    } catch (e: any) {
      console.error(e);
      setErrorNotice(e.message || "Failed to save progress check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Weekly Weight Progress
  const handleSaveWeeklyWeight = async () => {
    if (!newLogWeight || isNaN(Number(newLogWeight))) {
      alert("Please enter a valid scale weight in kg.");
      return;
    }
    setSubmittingWeeklyWeight(true);
    setWeeklyWeightNotice(null);
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
        setWeeklyWeightNotice(`Week ${newLogWeekNum} scale weight of ${newLogWeight} kg recorded! Weight-Loss Digital Twin updated.`);
        setNewLogWeight('');
        await loadInitialData();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmittingWeeklyWeight(false);
    }
  };

  // Compute live adherence and calories
  const computeLiveStats = () => {
    let completed = 0;
    let modified = 0;
    let replaced = 0;
    let skipped = 0;
    let pending = 0;
    let plannedTotal = 0;
    let actualTotal = 0;

    MEAL_SLOTS.forEach(slot => {
      const pCals = plannedMealCalories[slot.id] || slot.defaultCals;
      plannedTotal += pCals;
      const item = mealCheckins[slot.id];

      if (!item || item.status === 'unreported') {
        pending++;
      } else if (item.status === 'eaten_as_planned') {
        completed++;
        actualTotal += pCals;
      } else if (item.status === 'eaten_with_modifications') {
        modified++;
        actualTotal += Math.round(pCals * ((item.portion_pct || 100) / 100));
      } else if (item.status === 'replaced') {
        replaced++;
        const repCals = estimateFoodCaloriesClient(item.actual_food || '');
        actualTotal += Math.round(repCals * ((item.portion_pct || 100) / 100));
      } else if (item.status === 'skipped') {
        skipped++;
      }
    });

    const totalSlots = MEAL_SLOTS.length;
    const score = (completed * 100) + (modified * 75) + (replaced * 50);
    const adherencePct = totalSlots > 0 ? Math.round((score / (totalSlots * 100)) * 100) : 0;
    
    const calTarget = userProfile?.calorie_target || (userProfile?.gender === 'Male' ? 2200 : 2000);
    const calDifference = Math.round((actualTotal - calTarget) * 10) / 10;
    const remainingAllowance = Math.max(0, Math.round((calTarget - actualTotal) * 10) / 10);

    return { 
      completed, modified, replaced, skipped, pending, adherencePct, 
      plannedTotal, actualTotal, calTarget, calDifference, remainingAllowance 
    };
  };

  const liveStats = computeLiveStats();

  if (loading && progressHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin" />
        <span className="text-slate-600 text-sm font-bold">
          Loading progress records, calorie tracking, and check-in history...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5 text-emerald-700" /> Real User-Acknowledged Progress Tracking
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Daily Meal Adherence, Calorie Intake &amp; Weight Progress</h2>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          NutriGen AI never assumes adherence merely because a meal plan was generated. Record what you actually ate, track estimated calorie intake, and monitor weekly scale progress.
        </p>
      </div>

      {/* Prominent Scientific Transparency Banner */}
      <div className="p-4 rounded-3xl bg-slate-900 text-white shadow-md space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Scientific Integrity &amp; Strict Distinction of Health Data</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-[11px] text-slate-300">
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <span className="font-extrabold text-blue-300 block">[Planned Target]</span>
            Recommended calories &amp; nutrients from meal optimization.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <span className="font-extrabold text-emerald-300 block">[Reported Actual]</span>
            Calories &amp; portions explicitly acknowledged by you.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <span className="font-extrabold text-purple-300 block">[Pending Unreported]</span>
            Unchecked meals remain pending (never assumed eaten).
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <span className="font-extrabold text-teal-300 block">[Confirmed Scale]</span>
            Weekly measured body weight in kilograms.
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <span className="font-extrabold text-amber-300 block">[Digital Twin]</span>
            Adaptive energy-balance trajectory projections.
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          {successNotice}
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2 shadow-sm animate-in fade-in">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
          {errorNotice}
        </div>
      )}

      {/* DAILY CALORIE TRACKER & ADHERENCE BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Daily Calorie Intelligence &amp; Consumption Tracking
              </h3>
              <p className="text-[11px] text-slate-300">
                Calculates actual calories consumed vs planned recommendations and daily calorie targets.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-700">
            Target: {liveStats.calTarget} kcal/day
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Planned Calories</span>
            <span className="text-lg font-black text-slate-200">{liveStats.plannedTotal} kcal</span>
            <span className="text-[10px] text-slate-400 block">5 Planned Slots</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Actual Consumed</span>
            <span className="text-lg font-black text-amber-300">{liveStats.actualTotal} kcal</span>
            <span className="text-[10px] text-amber-400 block font-semibold">Reported Meals</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Calorie Target</span>
            <span className="text-lg font-black text-blue-300">{liveStats.calTarget} kcal</span>
            <span className="text-[10px] text-blue-400 block font-semibold">Daily Budget</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Remaining Allowance</span>
            <span className="text-lg font-black text-emerald-400">{liveStats.remainingAllowance} kcal</span>
            <span className="text-[10px] text-emerald-500 block font-semibold">Available Today</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Difference vs Target</span>
            <span className={`text-lg font-black ${liveStats.calDifference > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {liveStats.calDifference > 0 ? `+${liveStats.calDifference}` : `${liveStats.calDifference}`} kcal
            </span>
            <span className="text-[10px] text-slate-400 block">
              {liveStats.calDifference > 0 ? 'Caloric Surplus' : 'Caloric Deficit'}
            </span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Adherence Rate</span>
            <span className="text-lg font-black text-purple-300">{liveStats.adherencePct}%</span>
            <span className="text-[10px] text-purple-400 block font-semibold">{liveStats.pending} Pending Meals</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: TODAY'S CHECK-IN INTERFACE */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Daily Meal-by-Meal Check-In</h3>
              <p className="text-xs text-slate-500">Record your actual consumption and portion for each planned meal slot.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Check-In Date:</span>
            <input
              type="date"
              value={checkinDate}
              onChange={e => setCheckinDate(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-slate-50 focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* Meal Slot Items */}
        <div className="space-y-4">
          {MEAL_SLOTS.map(slot => {
            const checkin = mealCheckins[slot.id] || { status: 'unreported', portion_pct: 100 };
            const plannedFoodName = plannedMeals[slot.id] || 'Nutrient Balanced Food';
            const plannedCals = plannedMealCalories[slot.id] || slot.defaultCals;

            // Live estimated meal calories
            let liveMealCals: number | null = null;
            if (checkin.status === 'eaten_as_planned') liveMealCals = plannedCals;
            else if (checkin.status === 'eaten_with_modifications') liveMealCals = Math.round(plannedCals * ((checkin.portion_pct || 100) / 100));
            else if (checkin.status === 'replaced') liveMealCals = Math.round(estimateFoodCaloriesClient(checkin.actual_food || '') * ((checkin.portion_pct || 100) / 100));
            else if (checkin.status === 'skipped') liveMealCals = 0;

            return (
              <div 
                key={slot.id} 
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  checkin.status === 'unreported' 
                    ? 'bg-slate-50 border-slate-200' 
                    : checkin.status === 'eaten_as_planned'
                    ? 'bg-emerald-50/40 border-emerald-300'
                    : checkin.status === 'eaten_with_modifications'
                    ? 'bg-blue-50/40 border-blue-300'
                    : checkin.status === 'replaced'
                    ? 'bg-purple-50/40 border-purple-300'
                    : 'bg-rose-50/40 border-rose-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {slot.label}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        Planned: ~{plannedCals} kcal
                      </span>
                      {liveMealCals !== null ? (
                        <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                          checkin.status === 'eaten_as_planned'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : checkin.status === 'eaten_with_modifications'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : checkin.status === 'replaced'
                            ? 'bg-purple-100 text-purple-800 border-purple-200'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}>
                          Estimated Consumed: ~{liveMealCals} kcal
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 uppercase">
                          Pending Check-In
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 font-medium block mt-1">
                      Planned Menu: <strong className="text-slate-800">{plannedFoodName}</strong>
                    </span>
                  </div>

                  {/* Status Radio Pills */}
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {[
                      { key: 'eaten_as_planned', label: 'Eaten as Planned', color: 'bg-emerald-600' },
                      { key: 'eaten_with_modifications', label: 'Modified', color: 'bg-blue-600' },
                      { key: 'replaced', label: 'Replaced', color: 'bg-purple-600' },
                      { key: 'skipped', label: 'Skipped', color: 'bg-rose-600' }
                    ].map(st => {
                      const isActive = checkin.status === st.key;
                      return (
                        <button
                          key={st.key}
                          type="button"
                          onClick={() => handleMealStatusChange(slot.id, st.key)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                            isActive 
                              ? `${st.color} text-white shadow-xs` 
                              : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {isActive && '✓ '}
                          {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-inputs based on status */}
                {checkin.status === 'eaten_with_modifications' && (
                  <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-bold">Approximate Portion Consumed:</span>
                      <span className="font-extrabold text-blue-700">
                        {checkin.portion_pct}% (~{liveMealCals} kcal)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="25"
                      max="150"
                      step="25"
                      value={checkin.portion_pct}
                      onChange={e => handleMealFieldChange(slot.id, 'portion_pct', Number(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                      <span>Quarter (25%)</span>
                      <span>Half (50%)</span>
                      <span>Full (100%)</span>
                      <span>Extra (150%)</span>
                    </div>
                  </div>
                )}

                {checkin.status === 'replaced' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-purple-200 text-xs">
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">
                        What food did you eat instead? (Estimated: ~{liveMealCals} kcal)
                      </label>
                      <input
                        type="text"
                        value={checkin.actual_food || ''}
                        onChange={e => handleMealFieldChange(slot.id, 'actual_food', e.target.value)}
                        placeholder="e.g. Sprouted Moong Salad or Vegetable Khichdi"
                        className="w-full p-2 border border-slate-300 rounded-lg font-medium outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-bold block mb-1">Reason for Replacement:</label>
                      <select
                        value={checkin.reason || ''}
                        onChange={e => handleMealFieldChange(slot.id, 'reason', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg font-medium outline-none focus:border-purple-500 bg-white"
                      >
                        <option value="">Select Reason...</option>
                        <option value="Prefer different taste">Prefer different taste</option>
                        <option value="Ingredient not available">Ingredient not available</option>
                        <option value="Too expensive">Too expensive</option>
                        <option value="Ate out with friends">Ate out with friends</option>
                      </select>
                    </div>
                  </div>
                )}

                {checkin.status === 'skipped' && (
                  <div className="p-3 bg-white rounded-xl border border-rose-200 text-xs">
                    <label className="text-slate-700 font-bold block mb-1">Reason for Skipping (0 kcal):</label>
                    <select
                      value={checkin.reason || ''}
                      onChange={e => handleMealFieldChange(slot.id, 'reason', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg font-medium outline-none focus:border-rose-500 bg-white"
                    >
                      <option value="">Select Reason...</option>
                      <option value="Too expensive / budget constraint">Too expensive / budget constraint</option>
                      <option value="No time / busy schedule">No time / busy schedule</option>
                      <option value="Not hungry / fasting">Not hungry / fasting</option>
                      <option value="Felt nauseous or unwell">Felt nauseous or unwell</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Clinical & Vitals Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          {/* Weight & Symptoms */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-extrabold text-slate-900 uppercase tracking-wide block">
              Daily Scale Weight &amp; Symptoms
            </span>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Today's Scale Weight (kg):</label>
              <input
                type="number"
                step="0.1"
                value={currentWeight}
                onChange={e => setCurrentWeight(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 74.5"
                className="w-full p-2 border border-slate-300 rounded-xl bg-white font-semibold outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Experienced Symptoms Today:</label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map(sym => {
                  const isChecked = selectedSymptoms.includes(sym.id);
                  return (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => toggleSymptom(sym.id)}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        isChecked 
                          ? 'bg-rose-600 text-white shadow-xs' 
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {isChecked ? '✓ ' : ''}{sym.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* New Lab Measurements Input */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-extrabold text-slate-900 uppercase tracking-wide block">
              Enter New Lab Test Results [Measured Values]
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Biomarker Test:</label>
                <select
                  value={newLabTest.name}
                  onChange={e => {
                    const name = e.target.value;
                    let unit = "mg/dL";
                    if (name === "Hemoglobin") unit = "g/dL";
                    if (name === "25-OH Vitamin D") unit = "ng/mL";
                    if (name === "Vitamin B12") unit = "pg/mL";
                    if (name === "Serum Zinc" || name === "Serum Magnesium") unit = "mcg/dL";
                    setNewLabTest(prev => ({ ...prev, name, unit }));
                  }}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-semibold outline-none"
                >
                  <option value="Hemoglobin">Hemoglobin</option>
                  <option value="25-OH Vitamin D">25-OH Vitamin D</option>
                  <option value="Vitamin B12">Vitamin B12</option>
                  <option value="Serum Calcium">Serum Calcium</option>
                  <option value="Serum Magnesium">Serum Magnesium</option>
                  <option value="Serum Zinc">Serum Zinc</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Value ({newLabTest.unit}):</label>
                <input
                  type="number"
                  step="0.1"
                  value={newLabTest.value}
                  onChange={e => setNewLabTest(prev => ({ ...prev, value: e.target.value }))}
                  placeholder={`Value in ${newLabTest.unit}`}
                  className="w-full p-2 border border-slate-300 rounded-xl bg-white font-semibold outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addLabMeasurement}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" /> Add Lab Test Record
            </button>

            {/* Added Lab Records Tags */}
            {Object.keys(recordedLabs).length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">To Be Saved Today:</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(recordedLabs).map(([k, v]: [string, any]) => (
                    <span key={k} className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-bold flex items-center gap-1">
                      {k}: {v.value} {v.unit}
                      <button type="button" onClick={() => removeLabMeasurement(k)} className="hover:text-rose-600 ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daily Notes Input */}
        <div className="pt-2">
          <label className="text-xs font-bold text-slate-700 block mb-1">Optional Daily Reflection / Notes:</label>
          <input
            type="text"
            value={dailyNotes}
            onChange={e => setDailyNotes(e.target.value)}
            placeholder="e.g. Replaced lunch with salad, felt energetic; met calorie target."
            className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
          />
        </div>

        {/* Save Progress Button */}
        <button
          type="button"
          onClick={handleSaveProgress}
          disabled={submitting}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Save Daily Progress Check-In
        </button>
      </div>

      {/* SECTION 2: WEEKLY WEIGHT PROGRESS TRACKING (CRITICAL FOR WEIGHT LOSS) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Weekly Body Weight Tracking &amp; Milestones</h3>
              <p className="text-xs text-slate-500">
                Log your body weight at the end of every 7 days. Compares with initial, previous, and target weight.
              </p>
            </div>
          </div>

          {/* Quick Weekly Log Form */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Week:</span>
            <input
              type="number"
              min="1"
              max="52"
              value={newLogWeekNum}
              onChange={e => setNewLogWeekNum(Number(e.target.value))}
              className="w-14 p-1.5 border border-slate-300 rounded-xl text-xs font-bold text-center outline-none focus:border-indigo-500"
            />
            <input
              type="number"
              step="0.1"
              placeholder="Scale Weight (kg)"
              value={newLogWeight}
              onChange={e => setNewLogWeight(e.target.value)}
              className="w-28 p-1.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveWeeklyWeight}
              disabled={submittingWeeklyWeight || !newLogWeight}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {submittingWeeklyWeight ? 'Saving...' : 'Record Weight'}
            </button>
          </div>
        </div>

        {weeklyWeightNotice && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            {weeklyWeightNotice}
          </div>
        )}

        {/* Weekly Weight Records Table */}
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
                    No weekly weights recorded yet. Enter Week 1 scale weight above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: ADAPTIVE RECOMMENDATIONS CONNECTED TO PROGRESS */}
      {adaptationNotes.length > 0 && (
        <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <span>How Your Real Check-Ins Have Adapted Subsequent Recommendations</span>
          </div>
          <div className="space-y-2 text-xs text-emerald-800">
            {adaptationNotes.map((note, idx) => (
              <div key={idx} className="p-3 bg-white/80 rounded-xl border border-emerald-200 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {idx + 1}
                </span>
                <p className="font-medium leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: HISTORICAL PROGRESS & CHARTS */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Adherence Trends Chart */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Recorded Adherence History (%)</h4>
              {weeklyStats && (
                <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                  Avg: {weeklyStats.average_adherence_pct}% • Avg Calories: {weeklyStats.average_daily_actual_calories || 0} kcal • Pending Meals: {weeklyStats.total_pending}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 shrink-0">{progressHistory.length} Check-ins on Record</span>
          </div>

          {progressHistory.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...progressHistory].reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', backgroundColor: '#ffffff', color: '#0f172a' }} itemStyle={{ color: '#0f172a' }} />
                  <Bar dataKey="adherence_pct" name="Adherence %" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed rounded-2xl">
              No daily check-ins recorded yet. Complete today's check-in above.
            </div>
          )}
        </div>

        {/* Available Lab Measurements History */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-sm font-extrabold text-slate-900">Laboratory Biomarker Records [Measured Values]</h4>
            <span className="text-xs text-slate-500">{labHistory.length} Test Records</span>
          </div>

          {labHistory.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
              {labHistory.map((entry, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">{entry.date}</span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(entry.labs).map(([tName, tData]: [string, any]) => (
                      <span key={tName} className="px-2 py-0.5 rounded bg-white border border-slate-200 font-semibold">
                        {tName}: <strong className="text-slate-800">{tData.value} {tData.unit}</strong> ({tData.status})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed rounded-2xl">
              No laboratory blood test measurements entered yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
