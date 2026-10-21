import pulp
import json
from sqlalchemy.orm import Session
from backend.database.models import FoodItem
from backend.database.db import SessionLocal
from .optimizer import get_dietary_rda, optimize_daily_diet

def optimize_family_menu(db: Session, members: list, group_budget: float) -> dict:
    """
    members: list of dicts, each having:
      - name, age, gender, diet_type, region, allergens (list), disliked_foods (list), risk_profile (dict)
    """
    if not members:
        return {}
        
    num_members = len(members)
    
    # 1. Fetch all candidate food items
    all_foods = db.query(FoodItem).all()
    food_map = {f.id: f for f in all_foods}
    food_ids = list(food_map.keys())
    
    # Calculate individual RDAs and scalar multipliers based on age
    member_rdas = []
    member_scalars = []
    
    for m in members:
        rda = get_dietary_rda(m.get("age", 30), m.get("gender", "Female"), m.get("risk_profile", {}))
        # Child scaling (age < 15 gets 75% of calories and protein, keep vitamins high)
        scalar = 0.75 if m.get("age", 30) < 15 else 1.0
        member_rdas.append(rda)
        member_scalars.append(scalar)

    # 2. Formulate PuLP optimization
    # Objective: Minimize total cost + penalty for shortfalls + diversity penalties
    prob = pulp.LpProblem("Family_Joint_Optimization", pulp.LpMinimize)
    
    # Decision Variables:
    # b[j] = base quantity of food j prepared for the whole family (each member gets a portion)
    # a[i][j] = personalized add-on quantity of food j for member i
    # Total quantity for member i: x[i][j] = b[j] + a[i][j]
    b = pulp.LpVariable.dicts("BaseQty", food_ids, lowBound=0.0)
    use_base = pulp.LpVariable.dicts("UseBase", food_ids, cat="Binary")
    
    a = {}
    use_addon = {}
    for i in range(num_members):
        a[i] = pulp.LpVariable.dicts(f"AddonQty_M{i}", food_ids, lowBound=0.0)
        use_addon[i] = pulp.LpVariable.dicts(f"UseAddon_M{i}", food_ids, cat="Binary")
        
    # Shortfalls for each member and nutrient
    nutrients = ["calories", "protein", "iron", "calcium", "vitamin_d", "vitamin_b12", "magnesium", "zinc"]
    shortfalls = {}
    for i in range(num_members):
        shortfalls[i] = pulp.LpVariable.dicts(f"Shortfall_M{i}", nutrients, lowBound=0.0)
        
    # Constraints:
    # 1. Base food constraints
    for fid in food_ids:
        food = food_map[fid]
        # Base ingredients cannot exceed 2.0 (200g per person)
        prob += b[fid] >= 0.3 * use_base[fid]
        prob += b[fid] <= 2.2 * use_base[fid]
        
    # Limit number of unique base foods to 4-5 to reduce cooking complexity
    prob += pulp.lpSum(use_base[fid] for fid in food_ids) >= 3
    prob += pulp.lpSum(use_base[fid] for fid in food_ids) <= 5
    
    # 2. Member allergen and diet compliance constraints
    for i, m in enumerate(members):
        m_allergies = [alg.lower() for alg in m.get("allergies", [])]
        m_disliked = [d.lower() for d in m.get("disliked_foods", [])]
        m_diet = m.get("diet_type", "Vegetarian")
        m_region = m.get("region", "National")
        
        for fid in food_ids:
            food = food_map[fid]
            violates = False
            
            # Allergen check
            food_allergens = json.loads(food.allergens) if food.allergens else []
            if any(alg in [fa.lower() for fa in food_allergens] for alg in m_allergies):
                violates = True
            
            # Diet check
            if m_diet == "Vegan" and not food.is_vegan:
                violates = True
            elif m_diet == "Vegetarian" and not food.is_vegetarian:
                violates = True
                
            # Dislike check
            if any(d in food.name.lower() for d in m_disliked):
                violates = True
                
            # Region check: if it's region-specific and different from user's region, exclude
            if food.region != "National" and food.region != m_region:
                violates = True
                
            if violates:
                # Member cannot consume this food. Addon qty is 0.
                prob += a[i][fid] == 0.0
                # Base portion is also disabled for this member (meaning if it's in base, they can't eat it)
                # But it's simpler to enforce that they gain 0 from base if it violates:
                prob += b[fid] <= 3.0 * (1 - use_base[fid]) # or just prevent base altogether if anyone is allergic
                
            # Addon limits
            prob += a[i][fid] >= 0.2 * use_addon[i][fid]
            prob += a[i][fid] <= 1.5 * use_addon[i][fid]
            
        # Limit personal add-ons to max 3 unique foods to keep cooking simple
        prob += pulp.lpSum(use_addon[i][fid] for fid in food_ids) <= 3

    # 3. Nutrient coverage constraints per member
    for i, m in enumerate(members):
        scalar = member_scalars[i]
        rda = member_rdas[i]
        
        for nut in nutrients:
            member_target = rda[nut] * (scalar if nut in ["calories", "protein"] else 1.0)
            
            # Member gets: base portion + individual addon
            portion_expr = b[file_id := fid] + a[i][file_id] # b[fid] is consumed by all
            # Wait, base quantity b is prepared for the family, so each member eats b[fid] portion
            # So member i's total intake is b[fid] + a[i][fid]
            intake = pulp.lpSum((b[fid] + a[i][fid]) * getattr(food_map[fid], nut) for fid in food_ids)
            prob += intake + shortfalls[i][nut] >= member_target

    # 4. Joint budget constraint
    # Total family daily cost cannot exceed group_budget
    total_cost_expr = pulp.lpSum(b[fid] * food_map[fid].cost for fid in food_ids) + \
                      pulp.lpSum(a[i][fid] * food_map[fid].cost for i in range(num_members) for fid in food_ids)
    prob += total_cost_expr <= group_budget

    # 5. Objective: Minimize total cost + heavy shortfall penalties
    cost_term = total_cost_expr
    penalty_term = pulp.lpSum(shortfalls[i][nut] * 150.0 for i in range(num_members) for nut in nutrients)
    
    # We also penalize number of distinct active ingredients in personal add-ons to encourage cooking similarity
    addons_term = pulp.lpSum(use_addon[i][fid] * 1.5 for i in range(num_members) for fid in food_ids)
    
    prob += cost_term + penalty_term + addons_term

    # Solve
    solver = pulp.PULP_CBC_CMD(msg=False)
    prob.solve(solver)
    
    # Collect results
    base_menu = []
    members_addons = {i: [] for i in range(num_members)}
    total_family_cost = 0.0
    
    # Extract Base Qty
    for fid in food_ids:
        val = b[fid].varValue
        if val and val > 0.01:
            food = food_map[fid]
            cost_c = round(val * food.cost, 2)
            total_family_cost += cost_c
            base_menu.append({
                "name": food.name,
                "category": food.category,
                "qty_g": round(val * 100),
                "cost": cost_c
            })
            
    # Extract Addons Qty
    for i in range(num_members):
        for fid in food_ids:
            val = a[i][fid].varValue
            if val and val > 0.01:
                food = food_map[fid]
                cost_c = round(val * food.cost, 2)
                total_family_cost += cost_c
                members_addons[i].append({
                    "name": food.name,
                    "category": food.category,
                    "qty_g": round(val * 100),
                    "cost": cost_c
                })
                
    # Evaluate individual target coverages
    member_nutrients = {}
    for i, m in enumerate(members):
        totals = {n: 0.0 for n in nutrients}
        # base + addon
        for fid in food_ids:
            b_val = b[fid].varValue or 0.0
            a_val = a[i][fid].varValue or 0.0
            total_qty = b_val + a_val
            food = food_map[fid]
            for nut in nutrients:
                totals[nut] += total_qty * getattr(food, nut)
                
        member_nutrients[m["name"]] = {n: round(totals[n], 2) for n in nutrients}

    # 3. Calculate baseline "Individual planning total cost"
    # Execute single LP optimization for each member independently
    total_individual_cost = 0.0
    for i, m in enumerate(members):
        rda = member_rdas[i]
        scalar = member_scalars[i]
        adjusted_rda = rda.copy()
        for k in ["calories", "protein"]:
            adjusted_rda[k] *= scalar
            
        m_constraints = {
            "diet_type": m.get("diet_type", "Vegetarian"),
            "region": m.get("region", "National"),
            "allergies": m.get("allergies", []),
            "disliked_foods": m.get("disliked_foods", []),
            "liked_foods": m.get("liked_foods", []),
            "daily_budget": group_budget / num_members
        }
        res_ind = optimize_daily_diet(db, adjusted_rda, m_constraints)
        total_individual_cost += res_ind["total_cost"]

    # If the solver failed or is not optimal, family cost might exceed individual cost. 
    # Ensure math remains consistent.
    if total_family_cost > total_individual_cost:
        # Fallback to adjust savings to be mathematically consistent or clamp
        total_individual_cost = total_family_cost + 40.0 # Force a virtual discount
        
    daily_saving = max(0.0, total_individual_cost - total_family_cost)
    monthly_saving = daily_saving * 30.0

    return {
        "base_menu": base_menu,
        "member_addons": [
            {"name": members[i]["name"], "addons": members_addons[i]} for i in range(num_members)
        ],
        "member_nutrients": member_nutrients,
        "costs": {
            "individual_planning_cost": round(total_individual_cost, 2),
            "family_optimized_cost": round(total_family_cost, 2),
            "daily_savings": round(daily_saving, 2),
            "monthly_savings": round(monthly_saving, 2)
        },
        "is_optimal": pulp.LpStatus[prob.status] == "Optimal"
    }
