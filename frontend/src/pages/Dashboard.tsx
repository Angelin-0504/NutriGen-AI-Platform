import { useState } from 'react';
import { AlertOctagon, CheckCircle2, ChevronRight, Download, Info, ShieldAlert, Sparkles, Activity, Calendar, Clock, ArrowRight, HelpCircle } from 'lucide-react';

interface NutrientRisk {
  nutrient: string;
  probability: number;
  risk_category: string;
  confidence: string;
  guidance: string;
}

interface DashboardProps {
  userId: number;
  bmi: number;
  deficiencies: NutrientRisk[];
  explanations: any; // SHAP explanations
  preventionScore: number;
  weightLoss?: any;
  onNavigate: (view: string) => void;
  onDownloadReport: () => void;
}

const NUTRIENT_TABS = [
  { key: 'iron_deficiency', label: 'Iron' },
  { key: 'vitamin_d_deficiency', label: 'Vitamin D' },
  { key: 'vitamin_b12_deficiency', label: 'Vitamin B12' },
  { key: 'calcium_deficiency', label: 'Calcium' },
  { key: 'magnesium_deficiency', label: 'Magnesium' },
  { key: 'zinc_deficiency', label: 'Zinc' },
];

export default function Dashboard({
  bmi,
  deficiencies,
  explanations = {},
  preventionScore,
  weightLoss,
  onNavigate,
  onDownloadReport
}: DashboardProps) {
  // Sort deficiencies so highest risk is displayed first
  const sortedDef = [...deficiencies].sort((a, b) => b.probability - a.probability);
  
  // Track selected nutrient for SHAP explanation
  const [selectedNutrient, setSelectedNutrient] = useState<string>(
    sortedDef.length > 0 ? sortedDef[0].nutrient.toLowerCase().replace(" ", "_") + "_deficiency" : "iron_deficiency"
  );

  const selectedExp = explanations?.[selectedNutrient] || null;
  const currentDefObj = sortedDef.find(
    d => d.nutrient.toLowerCase().replace(" ", "_") + "_deficiency" === selectedNutrient
  );

  const currentRiskPct = selectedExp?.predicted_risk_pct ?? (currentDefObj ? Math.round(currentDefObj.probability * 100) : 0);
  const currentRiskCat = selectedExp?.risk_category ?? (
    currentRiskPct >= 60 ? "Elevated predicted risk" : currentRiskPct >= 35 ? "Moderate predicted risk" : "Low predicted risk"
  );

  // Extract SHAP contributors for chart
  const getShapData = () => {
    if (!selectedExp) return { positive: [], negative: [] };
    
    const positive = (selectedExp.positive_contributors || []).map((x: any) => ({
      name: x.display_name,
      value: Math.abs(x.shap_value),
      user_provided: x.user_provided,
      desc: x.user_value_desc
    })).slice(0, 5);

    const negative = (selectedExp.negative_contributors || []).map((x: any) => ({
      name: x.display_name,
      value: Math.abs(x.shap_value),
      user_provided: x.user_provided,
      desc: x.user_value_desc
    })).slice(0, 5);

    return { positive, negative };
  };

  const { positive: posData, negative: negData } = getShapData();

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    if (val < 25.0) return { label: 'Normal weight', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (val < 30.0) return { label: 'Overweight', color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { label: 'Obese', color: 'text-red-700 bg-red-50 border-red-200' };
  };

  const bmiCat = getBmiCategory(bmi);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Health &amp; Nutrition Dashboard</h2>
          <p className="text-sm text-slate-600">Personalized nutrient deficiency risk predictions and dietary guidance.</p>
        </div>
        <button
          onClick={onDownloadReport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-sm shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Download className="h-4 w-4 text-white" /> Download PDF Medical Report
        </button>
      </div>

      {/* Weight Management & Calorie Intelligence Section (When Active) */}
      {weightLoss?.wants_weight_loss && (
        <div className="p-6 rounded-3xl bg-white border border-emerald-200/90 shadow-sm mb-8 space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Weight-Loss &amp; Calorie Management Intelligence
                </h3>
                <p className="text-xs text-slate-500">
                  Integrated calorie targets synchronized with nutrient deficiency prevention.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('mealplan')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>View Calorie-Aware Meal Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Current &rarr; Target</span>
              <span className="text-base font-black text-slate-900">
                {weightLoss.current_weight} kg &rarr; {weightLoss.target_weight} kg
              </span>
              <span className="text-[11px] text-emerald-700 font-extrabold block mt-0.5">
                Goal: Lose {weightLoss.weight_to_lose} kg
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Metabolism (BMR &amp; TDEE)</span>
              <span className="text-base font-black text-sky-900">
                {weightLoss.tdee} kcal
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Basal rate: {weightLoss.bmr} kcal/day
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Safe Calorie Deficit</span>
              <span className="text-base font-black text-amber-900">
                -{weightLoss.calorie_deficit} kcal/day
              </span>
              <span className="text-[10px] text-amber-700 block mt-0.5">
                Rate: {weightLoss.weight_loss_rate || 0.5} kg / week
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Daily Calorie Target</span>
              <span className="text-base font-black text-emerald-950">
                {weightLoss.calorie_target} kcal/day
              </span>
              <span className="text-[10px] text-emerald-700 font-extrabold block mt-0.5">
                Est. Duration: ~{weightLoss.estimated_weeks || '—'} wks
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <b>Dual Optimization Strategy:</b> Recommendations satisfy both your safe daily calorie allowance ({weightLoss.calorie_target} kcal) and address the {sortedDef.length} predicted nutrient deficiency risks through nutrient-dense regional recipes.
              </span>
            </div>
            <span className="text-[10px] text-slate-400 italic shrink-0">
              Validated Mifflin-St Jeor formula
            </span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: General Prevention Score & BMI */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Overall Health Index</h3>
            
            {/* Prevention Meter */}
            <div className="flex flex-col items-center justify-center py-6 border-b border-slate-100 mb-6">
              <div className="relative flex items-center justify-center w-36 h-36 rounded-full border-4 border-slate-100 bg-slate-50 shadow-inner">
                <svg className="absolute w-full h-full -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    fill="transparent"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray={400}
                    strokeDashoffset={400 - (preventionScore / 100) * 400}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="text-4xl font-extrabold text-slate-900">{preventionScore}%</span>
                  <span className="block text-[10px] text-emerald-700 font-bold tracking-wider uppercase mt-1">Health Index</span>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-4 text-center px-4 leading-normal font-medium">
                {preventionScore > 75 
                  ? "Good overall balance. Low predicted deficiency risk across key nutrients." 
                  : "Attention needed. Elevated predicted risks require targeted dietary updates."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* BMI Card */}
            <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs text-slate-600 font-semibold uppercase tracking-wider block">Biological BMI</span>
                <span className="text-sm font-bold text-slate-900 mt-1 block">{bmi} kg/m²</span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${bmiCat.color}`}>
                {bmiCat.label}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('mealplan')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 transition-all group font-bold text-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" /> View 7-Day Meal Plan
                </span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('digitaltwin')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 transition-all group font-bold text-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-600" /> Nutrition Digital Twin
                </span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => onNavigate('progress')}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 transition-all group font-bold text-xs cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" /> Daily Meal Progress
                </span>
                <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Nutrient list */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900">Predicted Deficiency Risks</h3>
            <span className="text-xs text-slate-500 font-medium">Click any nutrient to view why it was predicted</span>
          </div>
          
          <div className="space-y-3">
            {sortedDef.map((def) => {
              const probVal = Math.round(def.probability * 100);
              const nutKey = def.nutrient.toLowerCase().replace(" ", "_") + "_deficiency";
              const isSelected = selectedNutrient === nutKey;

              let statusBg = "bg-slate-50/80 border-slate-200";
              let riskBadge = "text-sky-700 bg-sky-50 border-sky-200";
              if (def.risk_category === "Very High") {
                statusBg = "border-red-200 bg-red-50/40 hover:bg-red-50/70";
                riskBadge = "text-red-700 bg-red-100 border-red-200";
              } else if (def.risk_category === "High") {
                statusBg = "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70";
                riskBadge = "text-amber-700 bg-amber-100 border-amber-200";
              } else if (def.risk_category === "Moderate") {
                statusBg = "border-yellow-200 bg-yellow-50/40 hover:bg-yellow-50/70";
                riskBadge = "text-yellow-700 bg-yellow-100 border-yellow-200";
              }

              return (
                <div 
                  key={def.nutrient}
                  onClick={() => setSelectedNutrient(nutKey)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${statusBg} ${
                    isSelected ? 'ring-2 ring-emerald-500 border-transparent shadow-md bg-white' : 'hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-base">{def.nutrient}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${riskBadge} uppercase`}>
                          {def.risk_category}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Selected for explanation
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-normal line-clamp-1 font-medium">{def.guidance}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-2xl font-black text-slate-900">{probVal}%</span>
                      <span className="block text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Predicted Risk</span>
                    </div>
                  </div>
                  
                  {/* Probability bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full ${
                        def.risk_category === "Very High" ? 'bg-red-500' :
                        def.risk_category === "High" ? 'bg-amber-500' :
                        def.risk_category === "Moderate" ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`} 
                      style={{ width: `${probVal}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. SHAP-BASED EXPLANATION SECTION (Requirement 4) */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Why Was This Risk Predicted?</h3>
              <p className="text-xs text-slate-600 font-medium">SHAP model feature attribution showing how your reported inputs influenced the prediction.</p>
            </div>
          </div>
        </div>

        {/* 6 Nutrient Selector Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {NUTRIENT_TABS.map((tab) => {
            const isTabSelected = selectedNutrient === tab.key;
            const tabDef = sortedDef.find(d => d.nutrient.toLowerCase().replace(" ", "_") + "_deficiency" === tab.key);
            const tabRisk = tabDef ? Math.round(tabDef.probability * 100) : null;

            return (
              <button
                key={tab.key}
                onClick={() => setSelectedNutrient(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isTabSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                {tabRisk !== null && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                    isTabSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tabRisk}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Nutrient Explanation Card */}
        {selectedExp ? (
          <div className="space-y-6">
            {/* Header with Risk % and Category Status */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  {selectedExp.nutrient || selectedNutrient.replace("_deficiency", "").toUpperCase()}
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-black text-slate-900">
                    Predicted Risk: {currentRiskPct}%
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    currentRiskPct >= 60 
                      ? 'text-red-700 bg-red-50 border-red-200' 
                      : currentRiskPct >= 35 
                      ? 'text-amber-700 bg-amber-50 border-amber-200' 
                      : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  }`}>
                    Status: {currentRiskCat}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                <span>Confidence: {selectedExp.confidence || "High confidence"}</span>
              </div>
            </div>

            {/* Why This Prediction? User-Friendly Explanation Bullets */}
            <div className="p-5 rounded-xl bg-emerald-50/40 border border-emerald-200">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="h-4 w-4 text-emerald-700" /> Why this prediction?
              </h4>
              <ul className="space-y-2 text-xs text-slate-700 font-medium leading-relaxed">
                {(selectedExp.summary_reasons || []).map((reason: string, rIdx: number) => (
                  <li key={rIdx} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* User Profile Distinction Notice */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Profile Information Used
              </div>
              <p>
                Calculated strictly from your confirmed demographics, dietary habits, sun exposure, and reported symptoms.
              </p>
              <div className="pt-1 text-slate-500 italic">
                {selectedExp.unprovided_info || "Laboratory blood biomarkers (e.g. serum ferritin, 25(OH)D) were not collected in profile; predictions are estimated from reported lifestyle and symptoms."}
              </div>
            </div>

            {/* Directional SHAP Feature Contributions Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Positive Risk Boosters */}
              <div className="p-5 rounded-xl bg-red-50/40 border border-red-200">
                <h4 className="text-xs font-bold text-red-700 mb-3 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-red-600" /> Factors That Increased Predicted Risk
                </h4>
                
                {posData.length > 0 ? (
                  <div className="space-y-2.5">
                    {posData.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white border border-red-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{item.desc || "Reported in profile"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          +{item.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No major risk-increasing factors identified for this nutrient.
                  </div>
                )}
              </div>

              {/* Protective Factors */}
              <div className="p-5 rounded-xl bg-emerald-50/40 border border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Protective Factors That Lowered Predicted Risk
                </h4>
                
                {negData.length > 0 ? (
                  <div className="space-y-2.5">
                    {negData.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white border border-emerald-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{item.name}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{item.desc || "Protective lifestyle habit"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          -{item.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No strong protective factors identified. Improving dietary intake will lower risk.
                  </div>
                )}
              </div>
            </div>

            {/* Scientific Disclaimer */}
            <p className="text-[11px] text-slate-500 italic text-center">
              {selectedExp.disclaimer || "Notice: Model-predicted risk based on feature attribution, not a confirmed clinical diagnosis."}
            </p>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            SHAP explanations are currently being initialized for this prediction.
          </div>
        )}
      </div>

      {/* NUTRITION DIGITAL TWIN INTEGRATION CARD */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white shadow-xl mb-8 relative overflow-hidden border border-emerald-500/30">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Activity className="h-3.5 w-3.5 text-emerald-300" /> Nutrition Digital Twin Active
            </div>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Nutrition Digital Twin Simulator
            </h3>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
              Simulate multi-week dietary scenarios. Compare your baseline diet against the recommended plan, test partial adherence (20%–100%), and project nutrient risk reductions.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-semibold text-emerald-200">
              <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">• Iron &amp; Hemoglobin Recovery</span>
              <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">• Vitamin D &amp; Calcium Synergy</span>
              <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">• Magnesium &amp; Zinc Balance</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('digitaltwin')}
            className="px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 shrink-0 transform hover:scale-[1.02] cursor-pointer"
          >
            Launch Digital Twin Simulation <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* DAILY PROGRESS TRACKING QUICK ACCESS CARD */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Daily Meal Progress Check-In</h3>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Log your daily meals and track your actual nutrient consumption and symptom improvements.
          </p>
        </div>
        <button
          onClick={() => onNavigate('progress')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center gap-2 shrink-0 shadow-md cursor-pointer"
        >
          Open Progress Tracker <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Absorption interactions warning box */}
      <h3 className="text-xl font-black text-slate-900 mb-4">Nutrient Absorption Guidance</h3>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-5 rounded-xl border border-sky-200 bg-sky-50/60 flex gap-4 items-start shadow-xs">
          <Info className="h-5 w-5 text-sky-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Synergy: Iron + Vitamin C</h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Vitamin C (lemon juice, citrus fruits, tomatoes) helps the body absorb non-heme plant iron. Pair lemon juice or salads with lentils and greens to significantly boost iron uptake.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/60 flex gap-4 items-start shadow-xs">
          <ShieldAlert className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Inhibitor: Tea &amp; Coffee with Meals</h4>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Tannins in tea and coffee bind to dietary iron and block absorption. <b>Wait at least 1 hour before or after meals</b> to have coffee or tea.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
