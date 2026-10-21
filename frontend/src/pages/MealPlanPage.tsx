import { useState, useEffect } from 'react';
import { 
  RefreshCw, HeartPulse, ShoppingBag, Copy, Check, Printer, X, 
  Sparkles, RotateCcw, AlertTriangle, Info, Search
} from 'lucide-react';

interface MealPlanPageProps {
  userId: number;
}

export default function MealPlanPage({ userId }: MealPlanPageProps) {
  const [loading, setLoading] = useState(true);
  const [weeklyPlan, setWeeklyPlan] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(`nutrigen_meal_plan_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [availableFoods, setAvailableFoods] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [swappingItem, setSwappingItem] = useState<{ day: string; slot: string; foodName: string } | null>(null);
  const [swapSearch, setSwapSearch] = useState('');
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Fetch plan from backend
  const fetchMealPlan = async (regenerate: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meal-plan?user_id=${userId}&regenerate=${regenerate}`, { method: 'POST' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setWeeklyPlan(data);
        localStorage.setItem(`nutrigen_meal_plan_${userId}`, JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error fetching meal plan", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch foods database and user profile for swap compatibility
  const fetchAuxData = async () => {
    try {
      const [foodsRes, userRes] = await Promise.all([
        fetch('/api/foods'),
        fetch(`/api/user/${userId}`)
      ]);
      if (foodsRes.ok) {
        const foods = await foodsRes.json();
        setAvailableFoods(foods);
      }
      if (userRes.ok) {
        const u = await userRes.json();
        setUserProfile(u);
      }
    } catch (e) {
      console.error("Error fetching aux data", e);
    }
  };

  useEffect(() => {
    fetchMealPlan(false);
    fetchAuxData();
  }, [userId]);

  // Save the modified plan to backend and localStorage
  const persistPlan = async (updatedPlan: any[]) => {
    setSavingPlan(true);
    try {
      localStorage.setItem(`nutrigen_meal_plan_${userId}`, JSON.stringify(updatedPlan));
      await fetch('/api/meal-plan/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          weekly_plan: updatedPlan
        })
      });
      setSaveSuccessNotice('Meal plan updated & synchronized with PDF report!');
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (e) {
      console.error('Error saving plan', e);
    } finally {
      setSavingPlan(false);
    }
  };

  const generateGroceryList = () => {
    const categories: Record<string, { name: string; qty_g: number; cost: number }[]> = {};
    
    weeklyPlan.forEach(day => {
      Object.values(day.meals).forEach((slot: any) => {
        const foodList = slot.foods || [];
        foodList.forEach((foodName: string) => {
          const itemInfo = availableFoods.find(f => f.name.toLowerCase() === foodName.toLowerCase());
          const category = itemInfo ? itemInfo.category : 'General';
          const cost = itemInfo ? itemInfo.cost : 5.0;
          
          if (!categories[category]) categories[category] = [];
          
          const existing = categories[category].find(i => i.name === foodName);
          if (existing) {
            existing.qty_g += 100;
            existing.cost += cost;
          } else {
            categories[category].push({ name: foodName, qty_g: 100, cost: cost });
          }
        });
      });
    });
    
    return categories;
  };

  const copyGroceryListText = (categories: Record<string, { name: string; qty_g: number; cost: number }[]>) => {
    let text = "🛒 NUTRIGEN AI - 7-DAY SYNCHRONIZED GROCERY LIST\n";
    text += "=================================================\n\n";
    
    let grandTotal = 0;
    Object.entries(categories).forEach(([cat, items]) => {
      text += `[${cat.toUpperCase()}]\n`;
      items.forEach(item => {
        const qtyStr = item.qty_g >= 1000 ? `${(item.qty_g / 1000).toFixed(1)} kg` : `${item.qty_g} g`;
        text += `- ${item.name}: ${qtyStr} (Est. ₹${item.cost.toFixed(0)})\n`;
        grandTotal += item.cost;
      });
      text += "\n";
    });
    text += `TOTAL ESTIMATED BUDGET: ₹${grandTotal.toFixed(0)}\n`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter available swap candidates based on user's dietary restriction and allergies
  const getCompatibleSwapCandidates = () => {
    if (!swappingItem) return [];
    
    const userDiet = userProfile?.diet_type || 'Non-Vegetarian';
    const userAllergies = (userProfile?.allergies || []).map((a: string) => a.toLowerCase().trim());
    const userRegion = userProfile?.region;
    const isSpecificRegion = Boolean(userRegion && !['National', 'All', 'India', 'South India'].includes(userRegion));

    return availableFoods.filter(item => {
      // Don't show the exact same item
      if (item.name.toLowerCase() === swappingItem.foodName.toLowerCase()) return false;
      
      // Strict Regional Restriction: ensure swapped meals retain user's regional cuisine (e.g. Tamil Nadu)
      if (isSpecificRegion && item.region !== userRegion) {
        return false;
      }
      if (userRegion === 'South India' && !['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'National'].includes(item.region)) {
        return false;
      }

      // Filter by Dietary Preference
      if (userDiet === 'Vegetarian' && !item.is_vegetarian) return false;
      if (userDiet === 'Vegan' && !item.is_vegan) return false;
      
      // Filter by Allergies
      if (item.allergens) {
        let itemAllergens: string[] = [];
        try {
          itemAllergens = typeof item.allergens === 'string' ? JSON.parse(item.allergens) : item.allergens;
        } catch {
          itemAllergens = [];
        }
        const hasAllergen = itemAllergens.some((a: string) => userAllergies.includes(a.toLowerCase().trim()));
        if (hasAllergen) return false;
      }

      // Filter by search query if user types in search box
      if (swapSearch.trim()) {
        const query = swapSearch.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesRegion = item.region?.toLowerCase().includes(query);
        if (!matchesName && !matchesCategory && !matchesRegion) return false;
      }
      
      return true;
    });
  };

  // Execute Swap API
  const executeSwap = async (newFoodId: number) => {
    if (!swappingItem) return;
    const { day, slot, foodName } = swappingItem;
    
    try {
      const res = await fetch('/api/meal-plan/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          meal_slot: slot,
          old_food_name: foodName,
          new_food_id: newFoodId
        })
      });
      if (!res.ok) {
        throw new Error('Swap API request failed');
      }
      const updatedFood = await res.json();
      
      // Update local state and compute updated nutrients
      const newPlan = weeklyPlan.map(dPlan => {
        if (dPlan.day !== day) return dPlan;
        
        const meals = { ...dPlan.meals };
        const slotData = { ...meals[slot] };
        
        // Replace name in foods list
        const oldIndex = slotData.foods.indexOf(foodName);
        const newFoods = [...slotData.foods];
        if (oldIndex > -1) {
          newFoods[oldIndex] = updatedFood.name;
        } else {
          newFoods.push(updatedFood.name);
        }
        
        // Also update food_items array if present
        let newFoodItems = slotData.food_items ? [...slotData.food_items] : [];
        if (newFoodItems.length > 0) {
          const itemIdx = newFoodItems.findIndex((it: any) => it.name.toLowerCase() === foodName.toLowerCase());
          const newObj = {
            name: updatedFood.name,
            portion: updatedFood.qty_g,
            cost: updatedFood.cost,
            serving_size: updatedFood.serving_size || `${updatedFood.qty_g}g`
          };
          if (itemIdx > -1) {
            newFoodItems[itemIdx] = newObj;
          } else {
            newFoodItems.push(newObj);
          }
        }
        
        // Update slot cost
        const oldCost = slotData.cost || 0;
        slotData.foods = newFoods;
        slotData.food_items = newFoodItems;
        slotData.cost = updatedFood.cost;
        
        meals[slot] = slotData;

        // Recompute Day totals dynamically
        const newTotals = { ...dPlan.totals };
        const nutrients = ["calories", "protein", "iron", "calcium", "vitamin_d", "vitamin_b12", "magnesium", "zinc"];
        const oldFoodInfo = availableFoods.find(f => f.name.toLowerCase() === foodName.toLowerCase());
        
        nutrients.forEach(nut => {
          if (oldFoodInfo && oldFoodInfo[nut] !== undefined) {
            newTotals[nut] -= oldFoodInfo[nut];
          }
          if (updatedFood[nut] !== undefined) {
            newTotals[nut] += updatedFood[nut];
          }
          newTotals[nut] = Math.max(0, Number(newTotals[nut].toFixed(nut === "iron" || nut === "zinc" || nut === "vitamin_d" || nut === "vitamin_b12" ? 2 : 1)));
        });
        
        const newDayCost = Math.max(0, Number((dPlan.cost - oldCost + updatedFood.cost).toFixed(2)));

        return {
          ...dPlan,
          meals,
          totals: newTotals,
          cost: newDayCost
        };
      });

      setWeeklyPlan(newPlan);
      setSwappingItem(null);
      setSwapSearch('');

      // Persist to backend database so report generation and future reloads are 100% synchronized!
      await persistPlan(newPlan);
    } catch (e) {
      console.error(e);
      alert('Failed to swap meal. Please try again.');
    }
  };

  if (loading && weeklyPlan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin" />
        <span className="text-slate-600 text-sm font-bold">
          Generating 7-Day Diversified Meal Plan (Monday – Sunday)...
        </span>
        <p className="text-xs text-slate-600 font-medium">Balancing nutrient RDA targets, rotating recipes, and enforcing allergen constraints.</p>
      </div>
    );
  }

  if (weeklyPlan.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center shadow-md space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">No Meal Plan Found</h3>
        <p className="text-sm text-slate-600">Could not compile meal plan. Please verify budget and diet settings or generate a new plan.</p>
        <button
          onClick={() => fetchMealPlan(true)}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all"
        >
          Generate 7-Day Meal Plan
        </button>
      </div>
    );
  }

  const activeDayPlan = weeklyPlan[activeDayIdx] || weeklyPlan[0];
  const activeDayMeals = activeDayPlan.meals || {};
  const activeDayTotals = activeDayPlan.totals || {};
  const rdaTargets = activeDayPlan.rda_targets || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider mb-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Monday through Sunday Rotational Meal Optimization
          </div>
          <h2 className="text-2xl font-black text-slate-900">7-Day Diversified Meal Planner</h2>
          <p className="text-xs text-slate-500">
            Consecutive-day meal variety enforcement ensures varied menus from Monday to Sunday.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowGroceryList(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 shadow-sm transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-600" /> Weekly Grocery List
          </button>

          <button
            onClick={() => fetchMealPlan(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all disabled:opacity-50"
            title="Generate a completely fresh rotational meal plan for all 7 days"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Regenerate 7 Days
          </button>

          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
            {savingPlan ? (
              <span className="text-[11px] text-emerald-800 font-bold flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" /> Syncing...
              </span>
            ) : (
              <>
                <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">Day Cost:</span>
                <span className="text-base font-black text-emerald-900">₹{activeDayPlan.cost}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          {saveSuccessNotice}
        </div>
      )}

      {/* Limitation Notice if constraint limits menu options */}
      {activeDayPlan.limitation_note && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block">Dietary Variety Notice:</span>
            <p className="text-amber-800 mt-0.5">{activeDayPlan.limitation_note}</p>
          </div>
        </div>
      )}

      {/* 7 Days (Monday through Sunday) Tab Selector */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-200/60 shadow-xs">
        {weeklyPlan.map((dPlan, idx) => {
          const isSelected = activeDayIdx === idx;
          return (
            <button
              key={dPlan.day}
              onClick={() => {
                setActiveDayIdx(idx);
                setSwappingItem(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
              }`}
            >
              <span>{dPlan.day}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                ₹{dPlan.cost}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Day Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Meal Slots (Breakfast, Lunch, Dinner, Snack) */}
        <div className="lg:col-span-2 space-y-5">
          {Object.entries(activeDayMeals).map(([slotName, slotData]: any) => {
            const foodList = slotData.foods || [];
            const foodItemsList = slotData.food_items || [];

            return (
              <div key={slotName} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{slotName}</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">Est. ₹{slotData.cost}</span>
                </div>

                <div className="space-y-2.5">
                  {foodList.map((foodName: string, itemIdx: number) => {
                    const matchingObj = foodItemsList.find((it: any) => it.name.toLowerCase() === foodName.toLowerCase());
                    const servingText = matchingObj?.serving_size || "100g standard serving";
                    const itemCost = matchingObj?.cost;

                    return (
                      <div 
                        key={`${foodName}-${itemIdx}`} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors gap-3"
                      >
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 block">{foodName}</span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                            <span>Serving: {servingText}</span>
                            {itemCost && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-slate-700">₹{itemCost}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Universal Swap Button for Every Meal */}
                        <button
                          type="button"
                          onClick={() => {
                            setSwappingItem({ day: activeDayPlan.day, slot: slotName, foodName });
                            setSwapSearch('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 hover:border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold transition-all shadow-xs self-start sm:self-center"
                        >
                          <RefreshCw className="h-3 w-3 text-emerald-600" /> Swap Meal
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Daily RDA Nutrition Totals */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm h-fit space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Daily RDA Adequacy
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">{activeDayPlan.day} Totals vs Target</span>
            </div>
          </div>

          <div className="space-y-4">
            {Object.entries(activeDayTotals).map(([nut, total]: any) => {
              const target = rdaTargets[nut] || 1;
              const pct = Math.min(100, Math.round((total / target) * 100));
              
              const nutLabel = nut.charAt(0).toUpperCase() + nut.slice(1);
              
              let unit = "mg";
              if (nut === "calories") unit = "kcal";
              else if (nut === "protein") unit = "g";
              else if (nut === "vitamin_d" || nut === "vitamin_b12") unit = "mcg";

              return (
                <div key={nut} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-bold">{nutLabel.replace("_", " ")}</span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {total} / {target} {unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 90 ? 'bg-emerald-500' : pct >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                        }`} 
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-extrabold shrink-0 w-8 text-right ${
                      pct >= 90 ? 'text-emerald-700' : pct >= 65 ? 'text-amber-700' : 'text-rose-700'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Swapped meals sync to PDF:</span>
              <span className="font-extrabold text-emerald-700">✓ Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Swap Modal Popup with Dietary & Allergen Safety Filtering */}
      {swappingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-emerald-600" /> Swap Meal Alternative
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a replacement for <span className="font-bold text-slate-800">"{swappingItem.foodName}"</span> ({swappingItem.day} – {swappingItem.slot})
                </p>
              </div>
              <button 
                onClick={() => setSwappingItem(null)} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* User Dietary & Regional Filter Badges */}
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="text-slate-700 font-bold">Active constraints:</span>
              {userProfile?.region && (
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                  Region: {userProfile.region}
                </span>
              )}
              {userProfile?.diet_type && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  {userProfile.diet_type}
                </span>
              )}
              {(userProfile?.allergies || []).length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-bold">
                  Allergen Safe: {userProfile.allergies.join(', ')} excluded
                </span>
              )}
            </div>

            {/* Search Filter Inside Modal */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={swapSearch}
                onChange={e => setSwapSearch(e.target.value)}
                placeholder="Search food alternatives by name or category..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-slate-50 focus:bg-white focus:border-emerald-500 outline-none text-slate-900 placeholder-slate-400"
              />
            </div>

            {/* Filtered Candidates List */}
            <div className="space-y-2 overflow-y-auto pr-1 flex-grow max-h-72">
              {(() => {
                const candidates = getCompatibleSwapCandidates();
                if (candidates.length === 0) {
                  return (
                    <div className="p-6 text-center text-xs text-slate-700 font-medium border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                      No matching alternatives found that satisfy your region ({userProfile?.region || 'Any'}), diet ({userProfile?.diet_type}), and allergen restrictions.
                    </div>
                  );
                }

                return candidates.map(item => (
                  <button
                    key={item.id}
                    onClick={() => executeSwap(item.id)}
                    className="w-full flex justify-between items-center p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/80 hover:border-emerald-300 text-left transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs group-hover:text-emerald-700">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-700 font-bold capitalize bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {item.region}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-600 font-medium">
                        <span>{item.calories} kcal</span>
                        <span>•</span>
                        <span>{item.protein}g protein</span>
                        <span>•</span>
                        <span>{item.iron}mg iron</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-emerald-700 block">₹{item.cost}</span>
                      <span className="text-[10px] text-slate-600 font-medium">per {item.serving_size || '100g'}</span>
                    </div>
                  </button>
                ));
              })()}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSwappingItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Grocery Shopping List Modal */}
      {showGroceryList && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Weekly Grocery Shopping List</h3>
                  <p className="text-xs text-slate-500">Aggregated ingredients for your 7-day optimized menu</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowGroceryList(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-grow my-2">
              {(() => {
                const categories = generateGroceryList();
                let grandTotal = 0;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(categories).map(([category, items]) => {
                        const catTotal = items.reduce((acc, i) => acc + i.cost, 0);
                        grandTotal += catTotal;
                        return (
                          <div key={category} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                            <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">{category}</span>
                              <span className="text-[10px] text-emerald-700 font-bold">₹{catTotal.toFixed(0)}</span>
                            </div>
                            
                            <ul className="space-y-1 pt-1">
                              {items.map((item, idx) => {
                                const qtyStr = item.qty_g >= 1000 ? `${(item.qty_g / 1000).toFixed(1)} kg` : `${item.qty_g} g`;
                                return (
                                  <li key={idx} className="flex justify-between items-center text-xs text-slate-700">
                                    <span className="font-medium truncate pr-2">{item.name}</span>
                                    <span className="text-slate-500 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                                      {qtyStr}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Total Estimated Weekly Cost</span>
                      <span className="text-lg font-black text-emerald-800">INR {grandTotal.toFixed(0)}</span>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => copyGroceryListText(generateGroceryList())}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied to Clipboard!" : "Copy Shopping List"}
              </button>

              <button
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
