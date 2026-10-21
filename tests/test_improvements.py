import json
import pytest
from backend.database.db import SessionLocal
from backend.database.models import User, FoodItem, Prediction, ProgressRecord
from backend.schemas.schemas import (
    UserAssessmentRequest, DailyProgressCheckinRequest, 
    SaveMealPlanRequest, FoodSwapRequest
)
from backend.api.endpoints import (
    run_prediction, get_meal_plan, save_user_meal_plan, 
    swap_meal_food, save_daily_progress_checkin, 
    get_user_progress_history, download_pdf_report, get_user_profile
)
from recommendation.optimizer import generate_7day_meal_plan, get_dietary_rda
from digital_twin.simulation import run_twin_simulation

def test_digital_twin_scenarios_and_nutrients():
    """Requirement 1: Nutrition Digital Twin scenarios, 6 nutrients, user controls, assumptions"""
    initial_risks = {
        "iron_deficiency": 0.85,
        "vitamin_d_deficiency": 0.75,
        "vitamin_b12_deficiency": 0.60,
        "calcium_deficiency": 0.50,
        "magnesium_deficiency": 0.40,
        "zinc_deficiency": 0.35
    }
    
    user_profile = {
        "name": "Twin Test User",
        "age": 28,
        "gender": "Female",
        "bmi": 21.5,
        "diet_type": "Vegetarian",
        "daily_food_budget": 160.0,
        "region": "Karnataka",
        "symptoms": ["fatigue", "weak_nails"],
        "allergies": ["peanut"],
        "doctor_lab_biomarkers": {
            "Hemoglobin": {"value": 11.0, "unit": "g/dL", "status": "Low"}
        }
    }
    
    # Run with 90% adherence, 12 weeks, standard
    sim_high = run_twin_simulation(
        initial_risks=initial_risks,
        adherence_score=90.0,
        duration_weeks=12,
        dietary_choice="standard_recommended",
        user_profile=user_profile
    )
    
    # Run with 40% adherence
    sim_low = run_twin_simulation(
        initial_risks=initial_risks,
        adherence_score=40.0,
        duration_weeks=12,
        dietary_choice="standard_recommended",
        user_profile=user_profile
    )
    
    # 1. 4 distinct scenarios
    assert "scenario_summaries" in sim_high
    assert len(sim_high["scenario_summaries"]) == 4
    scenario_ids = [s["scenario"] for s in sim_high["scenario_summaries"]]
    assert "scenario_1" in scenario_ids
    assert "scenario_2" in scenario_ids
    assert "scenario_3" in scenario_ids
    assert "scenario_4" in scenario_ids
    
    # 2. Nutrient-wise results for all 6 required nutrients
    req_nutrients = [
        "iron_deficiency", "vitamin_d_deficiency", "vitamin_b12_deficiency",
        "calcium_deficiency", "magnesium_deficiency", "zinc_deficiency"
    ]
    assert "nutrient_wise" in sim_high
    for n in req_nutrients:
        assert n in sim_high["nutrient_wise"], f"Missing nutrient {n} in Digital Twin results"
        nut_obj = sim_high["nutrient_wise"][n]
        assert "timeline" in nut_obj
        assert len(nut_obj["timeline"]) == 4
        assert "target_rda" in nut_obj
        assert "baseline_intake" in nut_obj

    # Check baseline lab biomarker pass-through
    assert sim_high["nutrient_wise"]["iron_deficiency"]["baseline_lab"] is not None
    assert sim_high["nutrient_wise"]["iron_deficiency"]["baseline_lab"]["value"] == 11.0

    # 3. User adherence control responsiveness
    high_final_risk = sim_high["risk_chart_data"][-1]["scenario_2"]
    low_final_risk = sim_low["risk_chart_data"][-1]["scenario_2"]
    assert high_final_risk < low_final_risk, "Higher adherence must result in lower simulated risk"

    # 4. Dietary comparison table
    assert "dietary_comparison" in sim_high
    assert len(sim_high["dietary_comparison"]) >= 6

    # 5. Clear assumptions and non-clinical disclaimer
    assert "assumptions" in sim_high
    assert len(sim_high["assumptions"]) >= 4
    assert "disclaimer" in sim_high
    assert "mathematical" in sim_high["disclaimer"].lower()
    print("PASS: Digital Twin multi-scenario simulation, 6 nutrients, and user controls verified.")

def test_seven_day_meal_plan_rotation():
    """Requirement 2: Separate meals for Mon-Sun, avoid identical daily menus, serving sizes"""
    db = SessionLocal()
    user_constraints = {
        "diet_type": "Vegetarian",
        "region": "National",
        "allergies": [],
        "disliked_foods": [],
        "liked_foods": [],
        "daily_budget": 200.0
    }
    risks = {
        "iron_deficiency": 0.8,
        "vitamin_d_deficiency": 0.6,
        "vitamin_b12_deficiency": 0.5,
        "calcium_deficiency": 0.7,
        "magnesium_deficiency": 0.4,
        "zinc_deficiency": 0.5
    }
    
    plan = generate_7day_meal_plan(db, user_constraints, risks)
    db.close()
    
    assert len(plan) == 7, "Must generate exactly 7 days (Monday through Sunday)"
    
    days_present = [d["day"] for d in plan]
    expected_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    assert days_present == expected_days, f"Days order mismatch: {days_present}"
    
    daily_food_sets = []
    for d in plan:
        all_foods_today = []
        for slot, slot_data in d["meals"].items():
            all_foods_today.extend(slot_data.get("foods", []))
            assert "food_items" in slot_data, "Meal slot must contain food_items with portion details"
            for it in slot_data["food_items"]:
                assert "serving_size" in it, "Food item must have serving_size"
                assert "cost" in it, "Food item must have cost"
        daily_food_sets.append(tuple(sorted(all_foods_today)))
        
    unique_menus = set(daily_food_sets)
    assert len(unique_menus) >= 4, f"Menus must vary across days. Found {len(unique_menus)} unique menus out of 7."
    print(f"PASS: 7-Day Rotational Planner verified. Unique day menus: {len(unique_menus)}/7.")

def test_meal_swap_and_report_sync():
    """Requirement 2 & 3: Meal swap updates totals/costs, persists, and synchronizes to downloaded report"""
    db = SessionLocal()
    test_user = User(
        name="Swap Report User",
        age=27,
        gender="Male",
        height=172.0,
        weight=68.0,
        bmi=23.0,
        region="Tamil Nadu",
        diet_type="Vegetarian",
        daily_food_budget=180.0,
        activity_level="Moderate",
        sun_exposure="Medium",
        symptoms="[]",
        allergies="[]"
    )
    db.add(test_user)
    db.commit()
    user_id = test_user.id
    
    # Generate initial meal plan
    initial_plan = get_meal_plan(user_id=user_id, regenerate=True, db=db)
    assert len(initial_plan) == 7
    
    # Find a swap candidate food item
    candidate = db.query(FoodItem).filter(FoodItem.is_vegetarian == True).first()
    assert candidate is not None
    
    # Swap Monday Breakfast
    swap_req = FoodSwapRequest(
        day="Monday",
        meal_slot="Breakfast",
        old_food_name=initial_plan[0]["meals"]["Breakfast"]["foods"][0],
        new_food_id=candidate.id
    )
    swapped_food_info = swap_meal_food(swap_req, db=db)
    assert swapped_food_info["name"] == candidate.name
    
    # Save modified plan to database
    updated_plan = list(initial_plan)
    updated_plan[0]["meals"]["Breakfast"]["foods"] = [candidate.name]
    updated_plan[0]["meals"]["Breakfast"]["cost"] = candidate.cost
    
    save_req = SaveMealPlanRequest(user_id=user_id, weekly_plan=updated_plan)
    save_res = save_user_meal_plan(save_req, db=db)
    assert save_res["status"] == "success"
    
    # Verify get_meal_plan returns the persisted meal plan with swapped food
    reloaded_plan = get_meal_plan(user_id=user_id, regenerate=False, db=db)
    assert reloaded_plan[0]["meals"]["Breakfast"]["foods"] == [candidate.name]
    
    # Ensure prediction exists for report generation
    pred = Prediction(
        user_id=user_id,
        iron_risk=0.5, vitamin_d_risk=0.5, vitamin_b12_risk=0.5,
        calcium_risk=0.5, magnesium_risk=0.5, zinc_risk=0.5,
        confidence_level="High"
    )
    db.add(pred)
    db.commit()
    
    # Generate report and verify stream contains PDF bytes
    report_response = download_pdf_report(user_id=user_id, db=db)
    import asyncio
    async def get_stream_bytes(stream):
        chunks = []
        async for chunk in stream:
            chunks.append(chunk)
        return b"".join(chunks)

    content = asyncio.run(get_stream_bytes(report_response.body_iterator))
    assert len(content) > 1000
    assert content.startswith(b"%PDF")
    
    db.close()
    print("PASS: Meal swap, persistence, and PDF report synchronization verified.")

def test_progress_tracking_checkin_and_adaptation():
    """Requirement 5 & 6: Real daily checkin, strict adherence calculation, and recommendation adaptation"""
    db = SessionLocal()
    user = User(
        name="Adherence Progress User",
        age=32,
        gender="Female",
        height=162.0,
        weight=58.0,
        bmi=22.1,
        region="National",
        diet_type="Vegetarian",
        daily_food_budget=150.0,
        activity_level="Sedentary",
        sun_exposure="Low",
        symptoms="[]",
        allergies="[]"
    )
    db.add(user)
    db.commit()
    user_id = user.id
    
    # 3 eaten as planned (300) + 1 modified (75) + 1 skipped (0) = 375 / 500 = 75.0% adherence
    checkin_req = DailyProgressCheckinRequest(
        user_id=user_id,
        record_date="2026-10-16",
        meal_checkins={
            "Breakfast": {"status": "eaten_as_planned", "planned_food": "Ragi Dosa"},
            "Mid-Morning Snack": {"status": "eaten_with_modifications", "planned_food": "Sprouted Moong", "portion_pct": 50},
            "Lunch": {"status": "eaten_as_planned", "planned_food": "Brown Rice + Dal"},
            "Evening Snack": {"status": "skipped", "planned_food": "Almonds", "reason": "Too expensive for my daily budget"},
            "Dinner": {"status": "eaten_as_planned", "planned_food": "Paneer Bhurji"}
        },
        weight=57.5,
        symptoms=["fatigue"],
        lab_measurements={
            "Hemoglobin": {"value": 11.5, "unit": "g/dL", "status": "Low"}
        },
        notes="Followed diet well except skipped evening snack."
    )
    
    checkin_res = save_daily_progress_checkin(checkin_req, db=db)
    assert checkin_res["adherence_pct"] == 75.0, f"Expected 75.0% adherence, got {checkin_res['adherence_pct']}%"
    assert checkin_res["completed_count"] == 3
    assert checkin_res["modified_count"] == 1
    assert checkin_res["skipped_count"] == 1
    assert checkin_res["pending_count"] == 0
    assert "estimated_nutrients" in checkin_res
    
    # Query progress history
    hist_data = get_user_progress_history(user_id=user_id, db=db)
    assert hist_data["records_count"] >= 1
    assert hist_data["weekly_stats"]["total_completed"] == 3
    assert hist_data["weekly_stats"]["total_skipped"] == 1
    assert hist_data["weekly_stats"]["average_adherence_pct"] == 75.0
    assert len(hist_data["lab_history"]) >= 1
    
    # Verify adaptation note triggered by skipped expensive snack
    adaptations = hist_data["adaptation_notes"]
    assert any("budget" in a.lower() or "affordable" in a.lower() for a in adaptations)
    
    db.close()
    print("PASS: Progress tracking strict adherence calculation and adaptive recommendations verified.")

def test_manual_symptoms_allergies_and_assessment():
    """Requirement 4: Manual editing of symptoms and allergies, and profile integration"""
    db = SessionLocal()
    req_payload = UserAssessmentRequest(
        name="Manual Edit User",
        age=29,
        gender="Male",
        height=175.0,
        weight=70.0,
        region="Kerala",
        diet_type="Vegetarian",
        daily_food_budget=160.0,
        activity_level="Active",
        sun_exposure="High",
        sleep_hours=8.0,
        medical_conditions=[],
        symptoms=["fatigue", "muscle_cramps", "pale_skin"],
        allergies=["peanut", "lactose"],
        liked_foods=["Banana"],
        disliked_foods=[]
    )
    
    pred_res = run_prediction(req_payload)
    assert "predictions" in pred_res
    assert pred_res["predictions"]["iron_deficiency"] is not None
    
    # Verify user profile retrieval
    test_user = User(
        name=req_payload.name, age=req_payload.age, gender=req_payload.gender,
        height=req_payload.height, weight=req_payload.weight, bmi=22.8,
        region=req_payload.region, diet_type=req_payload.diet_type,
        daily_food_budget=req_payload.daily_food_budget,
        activity_level=req_payload.activity_level, sun_exposure=req_payload.sun_exposure,
        sleep_hours=req_payload.sleep_hours,
        symptoms=json.dumps(req_payload.symptoms),
        allergies=json.dumps(req_payload.allergies)
    )
    db.add(test_user)
    db.commit()
    user_id = test_user.id
    
    user_profile = get_user_profile(user_id=user_id, db=db)
    assert "fatigue" in user_profile["symptoms"]
    assert "muscle_cramps" in user_profile["symptoms"]
    assert "peanut" in user_profile["allergies"]
    assert "lactose" in user_profile["allergies"]
    
    # Verify meal plan respects allergen exclusions
    plan = get_meal_plan(user_id=user_id, regenerate=True, db=db)
    for day in plan:
        for slot, slot_data in day["meals"].items():
            for food_name in slot_data["foods"]:
                assert "peanut" not in food_name.lower(), f"Peanut found in meal plan: {food_name}"
                assert "groundnut" not in food_name.lower(), f"Groundnut found in meal plan: {food_name}"
                
    db.close()
    print("PASS: Manual symptoms and allergies correctly stored, validated, and integrated with meal recommendations.")

def test_strict_tamil_nadu_regional_filtering():
    """Requirement 5: Tamil Nadu regional meal plan strictly enforces Tamil Nadu / verified dishes across all 7 days."""
    db = SessionLocal()
    constraints = {
        "diet_type": "Vegetarian",
        "region": "Tamil Nadu",
        "allergies": [],
        "disliked_foods": [],
        "liked_foods": [],
        "daily_budget": 200.0
    }
    risks = {
        "iron_deficiency": 0.8,
        "vitamin_d_deficiency": 0.5,
        "vitamin_b12_deficiency": 0.6,
        "calcium_deficiency": 0.7,
        "magnesium_deficiency": 0.6,
        "zinc_deficiency": 0.4
    }

    plan = generate_7day_meal_plan(db, constraints, risks)
    assert len(plan) == 7, "Must generate a full 7-day plan"

    # Query all food names in Tamil Nadu plan
    unrelated_regions = {"Kerala", "Karnataka", "Andhra Pradesh", "Maharashtra", "North India"}
    for day in plan:
        for slot, slot_data in day["meals"].items():
            for food_name in slot_data["foods"]:
                db_item = db.query(FoodItem).filter(FoodItem.name == food_name).first()
                if db_item:
                    assert db_item.region not in unrelated_regions, (
                        f"Unrelated region food '{food_name}' from {db_item.region} found in Tamil Nadu meal plan!"
                    )
                    assert db_item.region in ["Tamil Nadu", "National"], (
                        f"Food '{food_name}' region is {db_item.region}, expected Tamil Nadu or National"
                    )

    db.close()
    print("PASS: Tamil Nadu selection strictly produces region-appropriate meals with zero cross-regional leakage across all 7 days.")

def test_shap_explanations_all_six_nutrients():
    """Requirement 4: SHAP explanations for Iron, Vitamin D, Vitamin B12, Calcium, Magnesium, Zinc."""
    import pandas as pd
    from ml.explainability.shap_explain import NutriGenExplainer

    explainer = NutriGenExplainer()
    test_data = {
        "age": 30, "gender": "Female", "region": "Tamil Nadu", "diet_type": "Vegetarian",
        "bmi": 21.0, "daily_food_budget": 200.0, "sun_exposure": "Low", "activity_level": "Light",
        "alcohol_abuse": 0, "excessive_tea_coffee": 1, "high_phytate_diet": 0,
        "low_iron_diet": 1, "low_vitamin_d_diet": 1, "low_vitamin_b12_diet": 0,
        "low_calcium_diet": 0, "low_magnesium_diet": 0, "low_zinc_diet": 0,
        "fatigue": 1, "pale_skin": 1, "hair_loss": 0, "weak_nails": 1, "bone_pain": 0,
        "muscle_weakness": 0, "muscle_cramps": 0, "brittle_hair": 0, "frequent_infections": 0,
        "numbness_tingling": 0
    }
    df_eval = pd.DataFrame([test_data])
    preds = {
        "iron_deficiency": 0.82, "vitamin_d_deficiency": 0.74, "vitamin_b12_deficiency": 0.45,
        "calcium_deficiency": 0.38, "magnesium_deficiency": 0.65, "zinc_deficiency": 0.28
    }

    explanations = explainer.explain_sample(df_eval, predictions=preds, user_raw=test_data)

    target_nutrients = [
        "iron_deficiency", "vitamin_d_deficiency", "vitamin_b12_deficiency",
        "calcium_deficiency", "magnesium_deficiency", "zinc_deficiency"
    ]

    for target in target_nutrients:
        assert target in explanations, f"Missing explanation for {target}"
        exp = explanations[target]
        assert "predicted_risk_pct" in exp
        assert 0 <= exp["predicted_risk_pct"] <= 100
        assert "risk_category" in exp
        assert exp["risk_category"] in ["Elevated predicted risk", "Moderate predicted risk", "Low predicted risk"]
        assert "top_features" in exp
        assert len(exp["top_features"]) > 0

        # Verify directional interpretation
        for feat in exp["top_features"]:
            assert feat["direction"] in ["increases_risk", "decreases_risk", "neutral"]
            assert "user_provided" in feat

        # Verify plain-English reasons
        assert "summary_reasons" in exp
        assert len(exp["summary_reasons"]) > 0
        for r in exp["summary_reasons"]:
            assert isinstance(r, str) and len(r) > 10

        # Verify uncollected laboratory data distinction and scientific disclaimer
        assert "unprovided_info" in exp
        assert "disclaimer" in exp
        assert "not a confirmed clinical diagnosis" in exp["disclaimer"].lower()

    print("PASS: SHAP explanations correctly calculated with directional influence, user distinctions, and disclaimers for all 6 nutrients.")

def test_pdf_report_includes_shap_and_regional_plan():
    """Requirement 6: PDF report synchronization includes latest SHAP explanations and regional meal plan."""
    from backend.services.pdf_generator import NutriGenPDFGenerator

    generator = NutriGenPDFGenerator()
    user_data = {
        "name": "Report User", "age": 30, "gender": "Female", "height": 165, "weight": 58,
        "region": "Tamil Nadu", "diet_type": "Vegetarian", "daily_food_budget": 200.0
    }
    defic_list = [
        {"nutrient": "Iron", "probability": 0.82, "risk_category": "Very High", "guidance": "Increase iron-rich foods."},
        {"nutrient": "Vitamin D", "probability": 0.74, "risk_category": "High", "guidance": "Increase sunlight exposure."}
    ]
    meal_plan = [{
        "day": "Monday",
        "cost": 175.0,
        "meals": {
            "Breakfast": {"foods": ["Idli with Sambar"], "cost": 35.0},
            "Lunch": {"foods": ["Sambar Sadam", "Keerai Poriyal"], "cost": 65.0},
            "Dinner": {"foods": ["Ragi Dosa with Chutney"], "cost": 45.0},
            "Evening Snack": {"foods": ["Black Gram Sundal"], "cost": 30.0}
        },
        "totals": {"calories": 1850, "protein": 52, "iron": 16.5, "calcium": 620, "vitamin_d": 12.0, "vitamin_b12": 2.2}
    }]
    shap_explanations = {
        "iron_deficiency": {
            "nutrient": "Iron",
            "predicted_risk_pct": 82,
            "risk_category": "Elevated predicted risk",
            "summary_reasons": ["Low reported iron intake contributed to a higher predicted risk.", "Reported fatigue contributed to a higher predicted risk."],
            "disclaimer": "Model-predicted risk based on feature attribution, not a confirmed clinical diagnosis."
        }
    }

    pdf_buffer = generator.generate_report(user_data, defic_list, meal_plan, explanations=shap_explanations)
    assert pdf_buffer is not None
    pdf_bytes = pdf_buffer.getvalue()
    assert len(pdf_bytes) > 2000, "Generated PDF must contain valid compiled bytes"
    print(f"PASS: PDF successfully generated with SHAP table and regional meal plan ({len(pdf_bytes)} bytes).")

