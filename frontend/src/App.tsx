import { useState } from 'react';
import { 
  Heart, 
  Users, 
  Calendar, 
  Activity, 
  Cpu, 
  Clock, 
  RotateCcw,
  User as UserIcon,
  LogOut
} from 'lucide-react';

import LandingPage from './pages/LandingPage';
import UserAssessment from './pages/UserAssessment';
import Dashboard from './pages/Dashboard';
import MealPlanPage from './pages/MealPlanPage';
import FamilyDashboard from './pages/FamilyDashboard';
import DigitalTwin from './pages/DigitalTwin';
import ProgressPage from './pages/ProgressPage';
import AdminDashboard from './pages/AdminDashboard';
import AuthModal from './pages/AuthModal';

export default function App() {
  const [user, setUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('nutrigen_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('nutrigen_auth_token');
    } catch {
      return null;
    }
  });

  const [userId, setUserId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('nutrigen_user_id');
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const [assessmentResults, setAssessmentResults] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem('nutrigen_assessment_results');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [view, setView] = useState<string>(() => {
    try {
      const savedView = localStorage.getItem('nutrigen_view') || 'landing';
      const savedUser = localStorage.getItem('nutrigen_user_id');
      if (['bioavailability', 'dataset'].includes(savedView)) {
        return 'landing';
      }
      if (['assessment', 'dashboard', 'mealplan', 'digitaltwin', 'progress'].includes(savedView) && !savedUser) {
        return 'landing';
      }
      return savedView;
    } catch {
      return 'landing';
    }
  });

  const [assessmentLoading, setAssessmentLoading] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData: any, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setUserId(userData.id);
    localStorage.setItem('nutrigen_user', JSON.stringify(userData));
    localStorage.setItem('nutrigen_auth_token', authToken);
    localStorage.setItem('nutrigen_user_id', String(userData.id));

    if (userData.latest_prediction) {
      setAssessmentResults(userData.latest_prediction);
      localStorage.setItem('nutrigen_assessment_results', JSON.stringify(userData.latest_prediction));
      localStorage.setItem('nutrigen_view', 'dashboard');
      setView('dashboard');
    } else {
      localStorage.setItem('nutrigen_view', 'assessment');
      setView('assessment');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignored
    }
    setUser(null);
    setToken(null);
    setUserId(null);
    setAssessmentResults(null);
    localStorage.removeItem('nutrigen_user');
    localStorage.removeItem('nutrigen_auth_token');
    localStorage.removeItem('nutrigen_user_id');
    localStorage.removeItem('nutrigen_assessment_results');
    localStorage.setItem('nutrigen_view', 'landing');
    setView('landing');
  };

  const handleAssessmentSubmit = async (formData: any) => {
    setAssessmentLoading(true);
    try {
      const payload = {
        ...formData,
        user_id: userId || undefined
      };

      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : "Error submitting assessment. Check input values.");
        return;
      }
      
      setUserId(data.user_id);
      setAssessmentResults(data);
      localStorage.setItem('nutrigen_user_id', String(data.user_id));
      localStorage.setItem('nutrigen_assessment_results', JSON.stringify(data));
      localStorage.setItem('nutrigen_view', 'dashboard');
      
      if (user) {
        const updated = {
          ...user,
          has_profile: true,
          wants_weight_loss: Boolean(formData.wants_weight_loss),
          latest_prediction: data
        };
        setUser(updated);
        localStorage.setItem('nutrigen_user', JSON.stringify(updated));
      }

      setView('dashboard');
    } catch (e) {
      console.error(e);
      alert("Error submitting assessment. Check model loading status.");
    } finally {
      setAssessmentLoading(false);
    }
  };

  const resetSession = () => {
    setUserId(null);
    setAssessmentResults(null);
    localStorage.removeItem('nutrigen_user_id');
    localStorage.removeItem('nutrigen_assessment_results');
    localStorage.setItem('nutrigen_view', 'landing');
    setView('landing');
  };

  const changeView = (newView: string) => {
    // Protected routes require authentication
    if (!user && ['assessment', 'dashboard', 'mealplan', 'progress'].includes(newView)) {
      openAuthModal('register');
      return;
    }
    setView(newView);
    localStorage.setItem('nutrigen_view', newView);
  };

  // Download PDF Report
  const downloadPdfReport = () => {
    if (!userId) return;
    window.open(`/api/report/${userId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 antialiased">
      {/* Navigation Topbar */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/80 px-6 py-3.5 flex flex-wrap justify-between items-center gap-4 shadow-xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-slate-900 font-extrabold text-base tracking-tight block">NutriGen AI</span>
            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Explainable Clinical Nutrition Intelligence</span>
          </div>
        </div>

        <nav className="flex items-center gap-2 flex-wrap">
          {/* Always visible tabs */}
          <button
            onClick={() => setView('landing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              view === 'landing' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            Home
          </button>
          
          <button
            onClick={() => changeView('family')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              view === 'family' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Family Co-Op
          </button>

          <button
            onClick={() => changeView('admin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              view === 'admin' 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" /> AI Model Performance
          </button>

          <button
            onClick={() => changeView('digitaltwin')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              view === 'digitaltwin' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-emerald-600" /> Digital Twin
          </button>

          {/* Connected Tabs (Visible after user completes assessment) */}
          {userId && (
            <>
              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />
              
              <button
                onClick={() => changeView('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  view === 'dashboard'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Cpu className="h-3.5 w-3.5" /> AI Dashboard
              </button>

              <button
                onClick={() => changeView('mealplan')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  view === 'mealplan'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" /> Meal Planner
              </button>

              <button
                onClick={() => changeView('progress')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  view === 'progress'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" /> Track Progress
              </button>

              <button
                onClick={resetSession}
                title="Reset Active Profile & Assessment"
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-1 ml-1 border border-transparent hover:border-rose-200"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </>
          )}

          {/* User Authentication & Account Actions */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-bold text-slate-800">
                  <UserIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="max-w-[130px] truncate">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex items-center gap-1"
                  title="Sign Out of Session"
                >
                  <LogOut className="h-3.5 w-3.5" /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Main View Area */}
      <main className="flex-grow pb-16 bg-slate-50/70">
        {view === 'landing' && (
          <LandingPage 
            onStart={() => changeView('assessment')} 
            setView={changeView} 
            onOpenAuth={openAuthModal}
            currentUser={user}
          />
        )}
        
        {view === 'assessment' && (
          user ? (
            <UserAssessment 
              onSubmit={handleAssessmentSubmit} 
              loading={assessmentLoading} 
              currentUser={user}
            />
          ) : (
            <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-lg">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Account Required</h3>
              <p className="text-slate-600 text-sm mb-6">Please create an account or sign in to start your personalized nutrition assessment.</p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => openAuthModal('login')}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => openAuthModal('register')}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </div>
          )
        )}
        
        {view === 'dashboard' && (
          assessmentResults ? (
            <Dashboard 
              userId={userId!}
              bmi={assessmentResults.bmi}
              deficiencies={assessmentResults.deficiences}
              explanations={assessmentResults.explanations}
              preventionScore={assessmentResults.prevention_score}
              weightLoss={assessmentResults.weight_loss}
              onNavigate={changeView}
              onDownloadReport={downloadPdfReport}
            />
          ) : (
            <div className="max-w-3xl mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Assessment Found</h3>
              <p className="text-slate-600 text-sm mb-6">Please complete the multi-nutrient deficiency risk assessment to view your personalized AI dashboard.</p>
              <button 
                onClick={() => changeView('assessment')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all"
              >
                Start Risk Assessment
              </button>
            </div>
          )
        )}

        {view === 'mealplan' && (
          userId ? (
            <MealPlanPage userId={userId} />
          ) : (
            <div className="max-w-3xl mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Assessment Required</h3>
              <p className="text-slate-600 text-sm mb-6">Please complete the assessment to view your tailored meal plan.</p>
              <button 
                onClick={() => changeView('assessment')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all"
              >
                Start Risk Assessment
              </button>
            </div>
          )
        )}

        {view === 'family' && (
          <FamilyDashboard />
        )}

        {view === 'digitaltwin' && (
          userId ? (
            <DigitalTwin userId={userId} />
          ) : (
            <div className="max-w-3xl mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Assessment Required</h3>
              <p className="text-slate-600 text-sm mb-6">Please complete the assessment to view your Digital Twin simulations.</p>
              <button 
                onClick={() => changeView('assessment')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all"
              >
                Start Risk Assessment
              </button>
            </div>
          )
        )}

        {view === 'progress' && (
          userId ? (
            <ProgressPage userId={userId} />
          ) : (
            <div className="max-w-3xl mx-auto my-16 p-8 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
              <h3 className="text-xl font-bold text-slate-800 mb-2">Assessment Required</h3>
              <p className="text-slate-600 text-sm mb-6">Please complete the assessment to track your progress over time.</p>
              <button 
                onClick={() => changeView('assessment')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all"
              >
                Start Risk Assessment
              </button>
            </div>
          )
        )}

        {view === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Healthcare Disclaimer Footer */}
      <footer className="bg-white py-6 px-12 border-t border-slate-200/80 text-center text-slate-600 space-y-1">
        <p className="text-xs text-slate-600 font-medium">
          &copy; {new Date().getFullYear()} NutriGen AI &bull; Educational Decision Support &amp; Regional Dietary Intelligence System.
        </p>
        <p className="text-[10px] text-slate-400 max-w-4xl mx-auto italic">
          Disclaimer: This system draws inferences using model parameters aligned to NHANES and clinical guidelines. It does not provide medical services, dietary therapies, or diagnose illnesses. All measurements, advice, and charts must be validated clinically under professional medical guidance.
        </p>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />
    </div>
  );
}
