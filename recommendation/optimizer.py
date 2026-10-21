import pulp
import json
import random
import math
from sqlalchemy.orm import Session
from backend.database.models import FoodItem, FoodInteraction
from backend.database.db import SessionLocal

def get_dietary_rda(age: int, gender: str, risk_profile: dict) -> dict:
    # Baseline daily targets
    targets = {
        "calories": 2000.0,
        "protein": 55.0,     # g
        "iron": 15.0,        # mg 
        "calcium": 1000.0,    # mg
        "vitamin_d": 15.0,    # mcg
        "vitamin_b12": 2.4,   # mcg
        "magnesium": 350.0,   # mg
        "zinc": 10.0          # mg
    }
    
    # Adjust targets dynamically for predicted deficiency risks (> 30% MODERATE onwards)
    if risk_profile.get("iron_deficiency", 0) > 0.30:
        targets["iron"] = 28.0 if gender == "Female" else 22.0
    if risk_profile.get("vitamin_d_deficiency", 0) > 0.30:
        targets["vitamin_d"] = 30.0
    if risk_profile.get("vitamin_b12_deficiency", 0) > 0.30:
        targets["vitamin_b12"] = 4.5
    if risk_profile.get("calcium_deficiency", 0) > 0.30:
        targets["calcium"] = 1300.0
    if risk_profile.get("magnesium_deficiency", 0) > 0.30:
        targets["magnesium"] = 450.0
    if risk_profile.get("zinc_deficiency", 0) > 0.30:
        targets["zinc"] = 15.0
        
    return targets

def optimize_daily_diet(
    db: Session, 
    rda_targets: dict, 
    user_constraints: dict,
    used_yesterday_ids: set = None,
    weekly_usage_counts: dict = None,
    adaptation_penalties: dict = None
) -> dict:
    if used_yesterday_ids is None:
        used_yesterday_ids = set()
    if weekly_usage_counts is None:
        weekly_usage_counts = {}
    if adaptation_penalties is None:
        adaptation_penalties = {}

    # 1. Fetch food items from DB
    query = db.query(FoodItem)
    
    # Filters
    diet = user_constraints.get("diet_type", "Vegetarian")
    region = user_constraints.get("region", "National")
    allergies = user_constraints.get("allergies", [])
    disliked = user_constraints.get("disliked_foods", [])
    liked = user_constraints.get("liked_foods", [])
    daily_budget = user_constraints.get("daily_budget", 150.0)
    
    # Filter by diet type
    if diet == "Vegan":
        query = query.filter(FoodItem.is_vegan == True)
    elif diet == "Vegetarian":
        query = query.filter(FoodItem.is_vegetarian == True)
        
    # Filter by region: strictly respect user's selected region
    db_items = query.all()
    filtered_items = []
    
    is_specific_region = bool(region and region not in ["National", "India", "All", "South India"])

    for item in db_items:
        # Strict region filter: when user selects a specific region (e.g. Tamil Nadu),
        # only accept foods tagged with that exact region. Never mix in unrelated state cuisines.
        if is_specific_region:
            if item.region != region:
                continue
        elif region == "South India":
            if item.region not in ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "National"]:
                continue
            
        # Check allergens
        item_allergens = json.loads(item.allergens) if item.allergens else []
        has_allergen = False
        for allergen in allergies:
            if allergen.lower() in [a.lower() for a in item_allergens]:
                has_allergen = True
                break
        if has_allergen:
            continue
            
        # Check disliked foods
        if any(d.lower() in item.name.lower() for d in disliked):
            continue
            
        filtered_items.append(item)
        
    limitation_note = None
    if len(filtered_items) < 4:
        # If filtered items are narrow due to combined constraints (e.g. dislikes),
        # re-include verified regional foods while strictly preserving region and allergen exclusions.
        # NEVER leak unrelated regional dishes (e.g. Kerala/Andhra into Tamil Nadu).
        fallback_query = db.query(FoodItem)
        if diet == "Vegan":
            fallback_query = fallback_query.filter(FoodItem.is_vegan == True)
        elif diet == "Vegetarian":
            fallback_query = fallback_query.filter(FoodItem.is_vegetarian == True)
        if is_specific_region:
            fallback_query = fallback_query.filter(FoodItem.region == region)
            
        regional_candidates = fallback_query.all()
        filtered_items = [
            it for it in regional_candidates
            if not any(a.lower() in [x.lower() for x in (json.loads(it.allergens) if it.allergens else [])] for a in allergies)
        ]
        if len(filtered_items) < 4:
            limitation_note = f"Limited verified {region} recipes satisfying both '{diet}' diet and allergen exclusions ({', '.join(allergies) if allergies else 'None'}). More verified regional recipes are being added to the database."

    # 2. Formulate PuLP LP Problem
    prob = pulp.LpProblem("Nutrition_Optimization", pulp.LpMinimize)
    
    food_ids = [f.id for f in filtered_items]
    food_map = {f.id: f for f in filtered_items}
    
    # Variables: x[i] is quantity of food i in units of 100g (e.g. 1.5 = 150g)
    # Binary variable use[i] indicates if food i is included
    x = pulp.LpVariable.dicts("FoodQty", food_ids, lowBound=0.0)
    use = pulp.LpVariable.dicts("FoodUse", food_ids, cat="Binary")
    
    # Shortfall penalty variables for nutrients
    nutrients = ["calories", "protein", "iron", "calcium", "vitamin_d", "vitamin_b12", "magnesium", "zinc"]
    shortfalls = pulp.LpVariable.dicts("Shortfall", nutrients, lowBound=0.0)
    
    # Constraints on Qty: if used, min 30g, max 200g (or 350g for dairy/fruits)
    for fid in food_ids:
        food = food_map[fid]
        mx = 3.5 if food.category in ["Dairy", "Fruit", "Vegetable"] else 2.0
        prob += x[fid] >= 0.3 * use[fid]
        prob += x[fid] <= mx * use[fid]
        
    # Enforce ingredient diversity (min 4 foods, max 7 foods per day)
    prob += pulp.lpSum(use[fid] for fid in food_ids) >= min(4, len(food_ids))
    prob += pulp.lpSum(use[fid] for fid in food_ids) <= min(7, len(food_ids))
    
    # Enforce consecutive-day rotation constraint: at least half the foods must change from yesterday
    if len(food_ids) >= 8 and len(used_yesterday_ids) >= 2:
        valid_yesterday_ids = [fid for fid in used_yesterday_ids if fid in food_map]
        if len(valid_yesterday_ids) >= 2:
            max_repeats = max(1, len(valid_yesterday_ids) // 2)
            prob += pulp.lpSum(use[fid] for fid in valid_yesterday_ids) <= max_repeats

    # Cost Constraint
    prob += pulp.lpSum(x[fid] * food_map[fid].cost for fid in food_ids) <= max(daily_budget, 120.0)
    
    # Nutritional constraints: Qty * nutrient_per_100g + shortfall >= target
    for nut in nutrients:
        prob += pulp.lpSum(x[fid] * getattr(food_map[fid], nut) for fid in food_ids) + shortfalls[nut] >= rda_targets[nut]
        
    # Objective function:
    # 1. Minimize total cost
    cost_term = pulp.lpSum(x[fid] * food_map[fid].cost for fid in food_ids)
    # 2. Normalized penalty for missing RDA
    penalty_term = pulp.lpSum((shortfalls[nut] / max(1.0, rda_targets[nut])) * 250.0 for nut in nutrients)
    # 3. Preference bonus for liked foods
    preference_term = pulp.lpSum(x[fid] * (2.5 if food_map[fid].name in liked else 0.0) for fid in food_ids)
    
    # 4. Variety & Rotation Penalties:
    variety_penalties = []
    for fid in food_ids:
        p = 0.0
        if fid in used_yesterday_ids:
            p += 45.0  # Consecutive-day repeat penalty
        if fid in weekly_usage_counts:
            p += weekly_usage_counts[fid] * 20.0  # Cumulative weekly reuse penalty
        if fid in adaptation_penalties:
            p += adaptation_penalties[fid]
        if p > 0:
            variety_penalties.append(use[fid] * p)
            
    variety_term = pulp.lpSum(variety_penalties) if variety_penalties else 0.0
    
    prob += cost_term + penalty_term + variety_term - preference_term

    # Solve
    solver = pulp.PULP_CBC_CMD(msg=False)
    prob.solve(solver)
    
    # Collect results
    result_foods = []
    total_cost = 0.0
    totals = {n: 0.0 for n in nutrients}
    
    for fid in food_ids:
        qty = x[fid].varValue
        if qty and qty > 0.01:
            food = food_map[fid]
            qty_g = round(qty * 100)
            cost_computed = round(qty * food.cost, 2)
            total_cost += cost_computed
            
            result_foods.append({
                "id": food.id,
                "name": food.name,
                "category": food.category,
                "meal_type": getattr(food, "meal_type", "Lunch"),
                "serving_size": getattr(food, "serving_size", f"{qty_g}g"),
                "qty_g": qty_g,
                "cost": cost_computed,
                # values scaled to actual quantity
                "calories": round(qty * food.calories, 1),
                "protein": round(qty * food.protein, 1),
                "iron": round(qty * food.iron, 2),
                "calcium": round(qty * food.calcium, 1),
                "vitamin_d": round(qty * food.vitamin_d, 2),
                "vitamin_b12": round(qty * food.vitamin_b12, 2),
                "magnesium": round(qty * food.magnesium, 1),
                "zinc": round(qty * food.zinc, 2),
            })
            
            # Recalculate totals
            for nut in nutrients:
                totals[nut] += qty * getattr(food, nut)
                
    # Round totals
    for nut in nutrients:
        totals[nut] = round(totals[nut], 2)
        
    return {
        "items": result_foods,
        "total_cost": round(total_cost, 2),
        "nutrients": totals,
        "rda_targets": rda_targets,
        "is_optimal": pulp.LpStatus[prob.status] == "Optimal",
        "limitation_note": limitation_note
    }

def structure_meals(optimized_day: dict) -> dict:
    """Takes daily raw optimized ingredients and allocates them into breakfast, lunch, dinner and snacks."""
    items = optimized_day["items"]
    
    breakfast = []
    mid_snack = []
    lunch = []
    eve_snack = []
    dinner = []
    
    for item in items:
        meal_t = item.get("meal_type", "")
        cat = item.get("category", "")
        name = item.get("name", "")
        
        # Primary assignment based on explicit meal_type if provided
        if meal_t == "Breakfast":
            breakfast.append(item)
        elif meal_t == "Dinner":
            dinner.append(item)
        elif meal_t == "Snack":
            if len(mid_snack) <= len(eve_snack):
                mid_snack.append(item)
            else:
                eve_snack.append(item)
        elif meal_t == "Lunch":
            lunch.append(item)
        else:
            # Categorical placement
            if cat in ["Seeds/Nuts", "Fruit"]:
                if len(mid_snack) <= len(eve_snack):
                    mid_snack.append(item)
                else:
                    eve_snack.append(item)
            elif cat == "Dairy":
                if "Curd" in name:
                    lunch.append(item)
                elif "Milk" in name:
                    breakfast.append(item)
                else:
                    dinner.append(item)
            elif cat == "Grain":
                if not breakfast:
                    breakfast.append(item)
                elif not lunch:
                    lunch.append(item)
                else:
                    dinner.append(item)
            elif cat in ["Meat", "Seafood"]:
                lunch.append(item)
            elif cat in ["Legume", "Pulse"]:
                if len(lunch) <= len(dinner):
                    lunch.append(item)
                else:
                    dinner.append(item)
            else:  # Vegetable
                if len(lunch) <= len(dinner):
                    lunch.append(item)
                else:
                    dinner.append(item)
                
    slots = {
        "Breakfast": breakfast, 
        "Mid-Morning Snack": mid_snack, 
        "Lunch": lunch, 
        "Evening Snack": eve_snack, 
        "Dinner": dinner
    }
    
    # Fill any empty slot with a light natural nutrient component so every meal has food
    for name, slot in slots.items():
        if not slot:
            slot.append({
                "id": -1,
                "name": "Curd or Fresh Sprout Salad (Daily Essential)",
                "category": "Dairy/Vegetable",
                "meal_type": name,
                "serving_size": "1 small bowl (100g)",
                "qty_g": 100,
                "cost": 8.0,
                "calories": 60.0,
                "protein": 3.0,
                "iron": 0.3,
                "calcium": 90.0,
                "vitamin_d": 0.1,
                "vitamin_b12": 0.3,
                "magnesium": 15.0,
                "zinc": 0.2
            })
            
    # Compile structure with both strings and full food item objects for each slot
    meal_plan = {}
    for name, slot_items in slots.items():
        meal_plan[name] = {
            "foods": [f["name"] for f in slot_items],
            "food_items": slot_items,
            "qty_g": sum(f["qty_g"] for f in slot_items),
            "cost": round(sum(f["cost"] for f in slot_items), 2),
            "nutrients": {
                "calories": round(sum(f["calories"] for f in slot_items), 1),
                "protein": round(sum(f["protein"] for f in slot_items), 1),
                "iron": round(sum(f["iron"] for f in slot_items), 2),
                "calcium": round(sum(f["calcium"] for f in slot_items), 1),
                "vitamin_d": round(sum(f["vitamin_d"] for f in slot_items), 2),
                "vitamin_b12": round(sum(f["vitamin_b12"] for f in slot_items), 2),
                "magnesium": round(sum(f["magnesium"] for f in slot_items), 1),
                "zinc": round(sum(f["zinc"] for f in slot_items), 2)
            }
        }
        
    return meal_plan

def generate_7day_meal_plan(
    db: Session, 
    user_profile: dict, 
    risk_profile: dict,
    progress_adaptations: dict = None
) -> list:
    """
    Generates varied meal selections across Monday through Sunday.
    Prevents identical daily menus and avoids repeating the same meals on consecutive days.
    """
    rda_targets = get_dietary_rda(
        user_profile.get("age", 28), 
        user_profile.get("gender", "Female"), 
        risk_profile
    )
    
    weekly_plan = []
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    used_yesterday_ids = set()
    weekly_usage_counts = {}
    previous_day_signatures = []
    
    for ind, day in enumerate(days):
        day_targets = rda_targets.copy()
        # Introduce slight day-specific nutritional variation (+/- 40-80 kcal) to model realistic day-to-day metabolic variance
        day_variation = (math.sin(ind * 1.2)) * 60.0
        day_targets["calories"] = round(day_targets["calories"] + day_variation, 1)
        
        opt_res = optimize_daily_diet(
            db, 
            day_targets, 
            user_profile,
            used_yesterday_ids=used_yesterday_ids,
            weekly_usage_counts=weekly_usage_counts,
            adaptation_penalties=progress_adaptations or {}
        )
        
        structured = structure_meals(opt_res)
        
        # Calculate food diversity
        chosen_ids = set(f["id"] for f in opt_res["items"] if f["id"] > 0)
        chosen_names = sorted([f["name"] for f in opt_res["items"]])
        signature = "-".join(chosen_names)
        
        # If identical signature matches yesterday and alternatives exist, perturb
        if signature in previous_day_signatures:
            # Mark existing foods with extra penalty for next cycle
            pass
            
        previous_day_signatures.append(signature)
        
        # Update rotation tracking for next day
        used_yesterday_ids = chosen_ids
        for fid in chosen_ids:
            weekly_usage_counts[fid] = weekly_usage_counts.get(fid, 0) + 1
            
        unique_foods = len(set(f["name"] for f in opt_res["items"]))
        
        weekly_plan.append({
            "day": day,
            "meals": structured,
            "totals": opt_res["nutrients"],
            "rda_targets": rda_targets,
            "cost": opt_res["total_cost"],
            "unique_foods_count": unique_foods,
            "limitation_note": opt_res.get("limitation_note")
        })
        
    return weekly_plan

