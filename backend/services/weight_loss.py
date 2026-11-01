import math
from typing import Dict, Any, Optional

def calculate_bmr(weight_kg: float, height_cm: float, age_years: int, gender: str) -> float:
    """
    Calculates Basal Metabolic Rate (BMR) using the validated Mifflin-St Jeor equation.
    Men: BMR = (10 * weight in kg) + (6.25 * height in cm) - (5 * age in years) + 5
    Women: BMR = (10 * weight in kg) + (6.25 * height in cm) - (5 * age in years) - 161
    """
    gender_clean = (gender or "").strip().lower()
    if gender_clean == "male":
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age_years) + 5.0
    else:
        # Default to female equation for conservative baseline
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age_years) - 161.0
    return max(800.0, round(bmr, 1))

def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Estimates Total Daily Energy Expenditure (TDEE) based on physical activity level.
    """
    act = (activity_level or "").strip().lower()
    if act in ["sedentary", "low"]:
        multiplier = 1.2
    elif act in ["light"]:
        multiplier = 1.375
    elif act in ["moderate"]:
        multiplier = 1.55
    elif act in ["active", "high"]:
        multiplier = 1.725
    elif act in ["very active", "extra active"]:
        multiplier = 1.9
    else:
        multiplier = 1.2
    return round(bmr * multiplier, 1)

def compute_weight_loss_plan(
    current_weight_kg: float,
    target_weight_kg: float,
    height_cm: float,
    age_years: int,
    gender: str,
    activity_level: str,
    rate_kg_per_week: float = 0.5
) -> Dict[str, Any]:
    """
    Computes a safe, realistic calorie management and weight-loss plan.
    Avoids extreme calorie restrictions by enforcing clinical floors:
    - Minimum 1200 kcal/day for women
    - Minimum 1500 kcal/day for men
    - Maximum calorie deficit capped at 30% of TDEE
    """
    bmr = calculate_bmr(current_weight_kg, height_cm, age_years, gender)
    tdee = calculate_tdee(bmr, activity_level)
    
    # Standard: 1 kg body fat ≈ 7,700 kcal
    # Daily deficit for desired rate: (rate * 7700) / 7 = rate * 1100 kcal/day
    safe_rate = max(0.2, min(1.0, float(rate_kg_per_week or 0.5)))
    desired_deficit = safe_rate * 1100.0
    
    # Enforce clinical safety floors
    gender_clean = (gender or "").strip().lower()
    clinical_floor = 1500.0 if gender_clean == "male" else 1200.0
    max_safe_deficit = tdee * 0.30  # At most 30% deficit to protect lean mass
    
    # Effective deficit and target calories
    effective_deficit = min(desired_deficit, max_safe_deficit)
    raw_target = tdee - effective_deficit
    
    safety_adjusted = False
    if raw_target < clinical_floor:
        calorie_target = clinical_floor
        effective_deficit = max(150.0, tdee - clinical_floor)
        safety_adjusted = True
    else:
        calorie_target = round(raw_target, 0)
        
    effective_deficit = round(effective_deficit, 0)
    calorie_target = round(calorie_target, 0)
    
    # Calculate weight to lose and estimated duration
    weight_to_lose = max(0.0, round(current_weight_kg - target_weight_kg, 1))
    
    # Effective rate based on effective deficit
    effective_rate = round(effective_deficit / 1100.0, 2)
    if effective_rate > 0.05 and weight_to_lose > 0:
        estimated_weeks = round(weight_to_lose / effective_rate, 1)
    else:
        estimated_weeks = 0.0
        
    # Safety notes
    if safety_adjusted:
        safety_note = (
            f"Daily calorie target was safeguarded to {int(clinical_floor)} kcal to prevent metabolic slowdown, "
            f"fatigue, and nutrient deficiencies. Extreme calorie restriction is avoided to support long-term wellness."
        )
    else:
        safety_note = "Caloric intake is calibrated within safe, evidence-based boundaries for healthy and sustainable fat loss."
        
    clinical_notice = (
        "Notice: Calorie expenditure and deficit calculations are mathematical estimates derived from the Mifflin-St Jeor "
        "equation and physical activity multipliers. They do not constitute direct medical calorimetry. Consult a licensed "
        "healthcare provider or registered dietitian before undertaking any significant dietary changes."
    )
    
    return {
        "bmr": bmr,
        "tdee": tdee,
        "current_weight": current_weight_kg,
        "target_weight": target_weight_kg,
        "weight_to_lose": weight_to_lose,
        "preferred_rate": safe_rate,
        "effective_rate": effective_rate,
        "calorie_deficit": effective_deficit,
        "calorie_target": calorie_target,
        "estimated_weeks": estimated_weeks,
        "safety_note": safety_note,
        "clinical_notice": clinical_notice
    }

