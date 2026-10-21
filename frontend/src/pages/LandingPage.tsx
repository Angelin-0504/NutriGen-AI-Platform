import { Activity, ShieldAlert, Sparkles, Users, RefreshCw, Cpu, BookOpen } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  setView: (view: string) => void;
}

export default function LandingPage({ onStart, setView }: LandingPageProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center relative py-14 mb-14 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/10"></div>
        <div className="relative z-10 px-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-emerald-200" /> Explainable Clinical Nutrition AI
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6 leading-tight">
            NutriGen AI
          </h1>
          <p className="text-lg text-emerald-50 mb-8 max-w-2xl mx-auto font-medium leading-relaxed">
            An Explainable Multi-Nutrient Deficiency Prediction and Personalized Dietary Intelligence System with Family Nutrition Optimization and Digital Twin Simulation.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={onStart}
              className="px-8 py-4 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-base shadow-lg shadow-emerald-950/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Start Nutrition Assessment
            </button>
            <button
              onClick={() => setView('admin')}
              className="px-8 py-4 rounded-2xl bg-emerald-700/60 backdrop-blur-md border border-white/30 hover:bg-emerald-700/80 text-white font-semibold text-base transition-colors"
            >
              Explore Research & ML Models
            </button>
          </div>
        </div>
      </div>

      {/* Healthcare Disclaimer Box */}
      <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 mb-14 flex gap-4 items-start shadow-sm">
        <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-amber-900 font-bold mb-1 text-sm uppercase tracking-wider">Important Healthcare Disclaimer</h4>
          <p className="text-amber-800 text-xs md:text-sm leading-relaxed">
            NutriGen AI is designed strictly as an educational decision-support and dietary selection helper platform. It does <b>not</b> serve as a medical diagnostic device. Projections, estimated deficiencies, and suggested meal plans represent statistical and optimization model inferences. Always seek a doctor's advice and confirm nutrition profiles with qualified clinical laboratory blood diagnostics.
          </p>
        </div>
      </div>

      {/* Novel Features Grid */}
      <h3 className="text-2xl font-black text-slate-900 text-center mb-8">System Architecture & Core Novel Contributions</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit mb-4">
              <Cpu className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Multi-Nutrient Classifier</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Predicts the risk of 6 common deficiencies (Iron, Vitamin D, Vitamin B12, Calcium, Magnesium, Zinc) using optimized Multi-Label Binary Relevance algorithms.
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between">
          <div>
            <div className="p-3 bg-teal-50 text-teal-600 rounded-xl w-fit mb-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Explainable AI (SHAP)</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Provides absolute transparent decision tracking. Click any nutrient to visualize positive risk accelerators and protective lifestyle coefficients.
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between">
          <div>
            <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit mb-4">
              <Activity className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Nutrition Digital Twin</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Simulates future health risks under varying dietary adherence scenarios (4w, 8w, 12w timelines), visualizing projected changes in bone, blood, and muscle systems.
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between">
          <div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl w-fit mb-4">
              <Users className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Family Shared Optimization</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Joint optimization script compiling a unified base meal plan for the entire family. Minimizes cooking costs and ingredient replication.
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit mb-4">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Bioavailability Intelligence</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Evaluates food interactions. Suggests synergies like Iron + Vitamin C to enhance absorption, and issues warnings on inhibitors (e.g. coffee with food).
            </p>
          </div>
        </div>
        
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-300 transition-all flex flex-col justify-between">
          <div>
            <div className="p-3 bg-violet-50 text-violet-600 rounded-xl w-fit mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">Regional Food Integration</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tailors meal selections to regional preferences (Tamil Nadu keerai/Ragi, Kerala seafood, Maharashtra millets) and is fully configured to respect dietary budgets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
