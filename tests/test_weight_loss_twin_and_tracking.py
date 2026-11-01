import pytest
import json
from backend.database.db import SessionLocal, Base, engine
from backend.database.models import User, ProgressRecord, WeeklyWeightRecord, FoodItem, Prediction
from backend.schemas.schemas import DailyProgressCheckinRequest, WeeklyWeightCheckinRequest, WeightLossTwinSimulationRequest
from backend.api.endpoints import (
    save_daily_progress_checkin, get_user_progress_history,
    save_weekly_weight_progress, get_weekly_weight_history,
    get_weight_loss_twin_simulation_endpoint
)
from recommendation.optimizer import generate_7day_meal_plan
from digital_twin.simulation import run_weight_loss_twin_simulation, run_twin_simulation

@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()

def test_distinct_recommendations_mode1_vs_mode2(db):
    """Verify that Mode 1 and Mode 2 generate different meal recommendations using separate logic."""
    user_mode1 = {
        "age": 29, "gender": "Female", "region": "National", "diet_type": "Vegetarian",
        "wants_weight_loss": False, "daily_budget": 150.0
    }
    user_mode2 = {
        "age": 29, "gender": "Female", "region": "National", "diet_type": "Vegetarian",
        "wants_weight_loss": True, "calorie_target": 1450.0, "daily_budget": 150.0
    }
    risks = {
        "iron_deficiency": 0.65, "vitamin_d_deficiency": 0.45,
        "vitamin_b12_deficiency": 0.50, "calcium_deficiency": 0.40,
        "magnesium_deficiency": 0.35, "zinc_deficiency": 0.30
    }
    
    plan1 = generate_7day_meal_plan(db, user_mode1, risks)
    plan2 = generate_7day_meal_plan(db, user_mode2, risks)
    
    # 1. Calorie targets must differ (Mode 1 maintenance ~2000, Mode 2 deficit ~1450)
    assert plan1[0]["calorie_target"] >= 1900.0
    assert plan2[0]["calorie_target"] <= 1550.0
    
    # 2. Chosen foods must not be identical
    foods1 = set(f["name"] for m in plan1[0]["meals"].values() for f in m["food_items"])
    foods2 = set(f["name"] for m in plan2[0]["meals"].values() for f in m["food_items"])
    assert foods1 != foods2, "Mode 1 and Mode 2 must choose different food items"
    
    # 3. Mode metadata must be present
    assert plan1[0]["goal_mode"] == "deficiency_nutrition"
    assert plan2[0]["goal_mode"] == "weight_loss_deficiency"

def test_actual_calorie_prediction_and_meal_statuses(db):
    """Verify meal check-in statuses: planned, modified, replaced, skipped, and pending."""
    # Create test user
    user = User(
        name="Test Calorie User",
        age=32,
        gender="Female",
        height=165.0,
        weight=78.0,
        wants_weight_loss=True,
        calorie_target=1500.0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    checkin_payload = DailyProgressCheckinRequest(
        user_id=user.id,
        record_date="2026-10-31",
        weight=77.8,
        meal_checkins={
            "Breakfast": {
                "status": "eaten_as_planned",
                "planned_food": "Idli with Sambar & Chutney",
                "planned_calories": 250.0
            },
            "Mid-Morning Snack": {
                "status": "eaten_with_modifications",
                "planned_food": "Spiced Buttermilk",
                "planned_calories": 100.0,
                "portion_pct": 50.0 # 50 kcal
            },
            "Lunch": {
                "status": "replaced",
                "planned_food": "Brown Rice Thali",
                "planned_calories": 450.0,
                "actual_food": "Cucumber and Sprout Salad", # ~110 kcal * 1.0 = 110 kcal
                "portion_pct": 100.0
            },
            "Evening Snack": {
                "status": "skipped",
                "planned_food": "Roasted Makhana",
                "planned_calories": 120.0
                # 0 kcal
            }
            # Dinner is omitted -> strictly Pending / Unreported
        }
    )
    
    res = save_daily_progress_checkin(checkin_payload, db=db)
    
    assert res["status"] == "success"
    assert res["completed_count"] == 1
    assert res["modified_count"] == 1
    assert res["replaced_count"] == 1
    assert res["skipped_count"] == 1
    assert res["pending_count"] == 1 # Dinner was omitted, must be Pending
    
    # Check calories:
    # Breakfast = 250
    # Snack = 50
    # Lunch = 110
    # Eve Snack = 0
    # Total actual = 410 kcal
    assert res["total_actual_calories"] == 410.0
    assert res["calorie_target"] == 1500.0
    assert res["remaining_calorie_allowance"] == 1500.0 - 410.0
    
    # Check history retrieval
    hist = get_user_progress_history(user.id, db=db)
    assert hist["records_count"] == 1
    assert hist["weekly_stats"]["total_pending"] == 1

def test_weekly_weight_progress_tracking(db):
    """Verify weekly weight progress, comparisons, and pending state."""
    user = User(
        name="Test Weekly Weight User",
        age=35,
        gender="Male",
        height=178.0,
        weight=85.0,
        target_weight=75.0,
        wants_weight_loss=True,
        calorie_target=1750.0
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Week 1: User logs weight loss to 84.2 kg
    w1_req = WeeklyWeightCheckinRequest(
        user_id=user.id,
        week_number=1,
        weight=84.2,
        notes="Felt good, adhered to dinner targets"
    )
    w1_res = save_weekly_weight_progress(w1_req, db=db)
    assert w1_res["status"] == "recorded"
    assert w1_res["initial_weight"] == 85.0
    assert w1_res["weight_change_from_initial"] == -0.8
    assert w1_res["weight_change_from_previous"] == -0.8
    assert user.weight == 84.2
    
    # Week 2: User hasn't weighed in yet -> Marked as Pending
    w2_req = WeeklyWeightCheckinRequest(
        user_id=user.id,
        week_number=2,
        weight=None # Pending
    )
    w2_res = save_weekly_weight_progress(w2_req, db=db)
    assert w2_res["status"] == "pending"
    
    # Week 2: Later weighs in at 83.5 kg
    w2_update = WeeklyWeightCheckinRequest(
        user_id=user.id,
        week_number=2,
        weight=83.5
    )
    w2_res2 = save_weekly_weight_progress(w2_update, db=db)
    assert w2_res2["status"] == "recorded"
    assert w2_res2["previous_weight"] == 84.2
    assert w2_res2["weight_change_from_previous"] == -0.7
    assert w2_res2["weight_change_from_initial"] == -1.5
    
    # Retrieve weekly history
    history = get_weekly_weight_history(user.id, db=db)
    assert len(history["records"]) >= 3 # Baseline (W0), W1, W2
    assert history["total_weight_change"] == -1.5

def test_weight_loss_digital_twin_scenarios(db):
    """Verify that Weight-Loss Digital Twin computes Scenarios A, B, and C."""
    res = run_weight_loss_twin_simulation(
        initial_weight=80.0,
        current_weight=79.0,
        target_weight=72.0,
        height=170.0,
        age=30,
        gender="Female",
        activity_level="Lightly Active",
        tdee=2100.0,
        calorie_target=1550.0,
        duration_weeks=12
    )
    
    assert res["initial_weight"] == 80.0
    assert res["current_weight"] == 79.0
    assert res["target_weight"] == 72.0
    assert res["calorie_deficit"] == 550.0
    assert len(res["chart_data"]) == 13 # Week 0 to Week 12
    
    w12_a = res["chart_data"][-1]["scenario_a"]
    w12_b = res["chart_data"][-1]["scenario_b"]
    w12_c = res["chart_data"][-1]["scenario_c"]
    
    # Scenario A (Following Plan) loses the most weight
    # Scenario B (Partial) loses moderate weight
    # Scenario C (Skipping / Not following) loses least or rebounds
    assert w12_a < w12_b < w12_c
    assert w12_a <= 75.0, "Scenario A should project significant steady weight loss"
    assert "Skipping meals does NOT guarantee fat loss" in res["disclaimer"]

def test_nutrient_deficiency_digital_twin_intact():
    """Verify that the existing Nutrient Deficiency Digital Twin is completely intact and unchanged."""
    res = run_twin_simulation(
        initial_risks={"iron_deficiency": 0.75, "vitamin_d_deficiency": 0.60},
        adherence_score=85.0,
        duration_weeks=12
    )
    assert "chart_data" in res
    assert "nutrient_wise" in res
    assert "iron_deficiency" in res["nutrient_wise"]
    assert len(res["scenarios"]) == 4 # 4 scenarios in existing twin

