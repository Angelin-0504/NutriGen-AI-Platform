import json
import pytest
from backend.database.db import SessionLocal
from backend.database.models import FoodItem, FoodInteraction
from backend.schemas.schemas import UserAssessmentRequest
from backend.api.endpoints import run_prediction, calculate_risk_category
from recommendation.optimizer import get_dietary_rda, optimize_daily_diet
from digital_twin.simulation import run_twin_simulation

def test_seeded_data():
    db = SessionLocal()
    foods_count = db.query(FoodItem).count()
    inter_count = db.query(FoodInteraction).count()
    db.close()
    
    assert foods_count >= 20, "Should seed at least 20 food items"
    assert inter_count >= 5, "Should seed at least 5 interaction items"
    print(f"PASS: Seeding verification. Foods: {foods_count}, Interactions: {inter_count}")

def test_prediction_stub():
    # Construct assessment payload
    req = UserAssessmentRequest(
        name="Test Runner", age=30, gender="Female", height=160.0, weight=55.0,
        region="Tamil Nadu", diet_type="Vegetarian", daily_food_budget=150.0,
        activity_level="Sedentary", sun_exposure="Low", sleep_hours=7.5,
        medical_conditions=["Low Iron Diet"], symptoms=["fatigue", "pale_skin"],
        allergies=["peanut"], liked_foods=["Ragi (Finger Millet)"], disliked_foods=[]
    )
    
    res = run_prediction(req)
    assert "predictions" in res, "Prediction output must contain probabilities map"
    assert "iron_deficiency" in res["predictions"], "Should calculate iron deficiency probability"
    print("PASS: Model prediction inference.")

def test_diet_optimizer():
    db = SessionLocal()
    rda = get_dietary_rda(30, "Female", {"iron_deficiency": 0.85})
    constraints = {
        "diet_type": "Vegetarian",
        "region": "Tamil Nadu",
        "allergies": [],
        "disliked_foods": [],
        "liked_foods": [],
        "daily_budget": 150.0
    }
    
    opt_res = optimize_daily_diet(db, rda, constraints)
    db.close()
    
    assert "items" in opt_res, "Should return dynamic items list"
    assert len(opt_res["items"]) >= 3, "LP optimizer should choose matching items"
    assert opt_res["total_cost"] <= 150.0, "Should satisfy budget constraint"
    print(f"PASS: PuLP MILP optimizer. Day cost: INR {opt_res['total_cost']}")

def test_twin_simulation_formulas():
    initial_risks = {
        "iron_deficiency": 0.90,
        "vitamin_d_deficiency": 0.80,
        "vitamin_b12_deficiency": 0.40,
        "calcium_deficiency": 0.30,
        "magnesium_deficiency": 0.20,
        "zinc_deficiency": 0.10
    }
    sim = run_twin_simulation(initial_risks, adherence_score=90.0, duration_weeks=12)
    chart_data = sim["chart_data"]
    
    assert len(chart_data) == 4, "Should simulate weeks: 0, 4, 8, 12"
    assert chart_data[0]["recommended_iron"] == 90.0, "Week 0 should align with baseline input"
    assert chart_data[3]["recommended_iron"] < 90.0, "High adherence diet should reduce risk over 12 weeks"
    print(f"PASS: Digital Twin Math. Iron Baseline: {chart_data[0]['recommended_iron']} -> 12w: {chart_data[3]['recommended_iron']}")

from recommendation.family_optimizer import optimize_family_menu
from backend.services.pdf_generator import NutriGenPDFGenerator

def test_nutrient_interactions_db():
    db = SessionLocal()
    interactions = db.query(FoodInteraction).all()
    db.close()
    
    assert len(interactions) >= 5, "Should have seeded food interactions in DB"
    for inter in interactions:
        assert inter.nutrient is not None
        assert inter.description is not None
    print(f"PASS: Bioavailability interactions verified. Total items: {len(interactions)}")

def test_family_coop_optimizer():
    db = SessionLocal()
    family_members = [
        {
            "name": "Father",
            "age": 42,
            "gender": "Male",
            "diet_type": "Vegetarian",
            "region": "National",
            "allergies": [],
            "disliked_foods": [],
            "liked_foods": ["Paneer"],
            "risk_profile": {"iron_deficiency": 0.20, "vitamin_d_deficiency": 0.70}
        },
        {
            "name": "Mother",
            "age": 38,
            "gender": "Female",
            "diet_type": "Vegetarian",
            "region": "National",
            "allergies": [],
            "disliked_foods": [],
            "liked_foods": ["Ragi"],
            "risk_profile": {"iron_deficiency": 0.85, "calcium_deficiency": 0.60}
        }
    ]
    opt = optimize_family_menu(db, family_members, group_budget=400.0)
    db.close()
    
    assert "base_menu" in opt, "Family co-op should return base menu"
    assert "costs" in opt, "Family co-op should return costs breakdown"
    print(f"PASS: Family Co-Op optimizer verified. Family cost: INR {opt['costs'].get('family_optimized_cost', 0)}")

def test_pdf_report_stream():
    generator = NutriGenPDFGenerator()
    user_data = {
        "name": "Unit Test User", "age": 30, "gender": "Female", "height": 165.0, "weight": 60.0,
        "region": "Tamil Nadu", "diet_type": "Vegetarian", "daily_food_budget": 150.0
    }
    defic_list = [
        {"nutrient": "Iron", "probability": 0.85, "risk_category": "Very High", "guidance": "Increase dietary iron."}
    ]
    meal_plan = [
        {
            "day": "Monday",
            "meals": {
                "Breakfast": {"foods": ["Ragi Dosa", "Curd"], "qty_g": 200, "cost": 30.0, "nutrients": {"calories": 300, "protein": 10, "iron": 5, "calcium": 200, "vitamin_d": 1, "vitamin_b12": 0.5, "magnesium": 50, "zinc": 2}}
            },
            "totals": {"calories": 1800, "protein": 60, "iron": 18, "calcium": 900, "vitamin_d": 15, "vitamin_b12": 2.5, "magnesium": 350, "zinc": 10},
            "rda_targets": {"calories": 2000, "protein": 55, "iron": 15, "calcium": 1000, "vitamin_d": 15, "vitamin_b12": 2.4, "magnesium": 350, "zinc": 10},
            "cost": 120.0
        }
    ]
    pdf_buf = generator.generate_report(user_data, defic_list, meal_plan)
    pdf_bytes = pdf_buf.getvalue()
    
    assert len(pdf_bytes) > 1000, "Generated PDF must not be empty"
    assert pdf_bytes.startswith(b"%PDF"), "PDF stream signature validation"
    print(f"PASS: ReportLab PDF generator verified. Buffer size: {len(pdf_bytes)} bytes")

from backend.services.doctor_report_parser import parse_doctor_report

def test_doctor_report_parser():
    sample_text = "Patient Blood Test Report\nHemoglobin: 11.2 g/dL\nVitamin D3: 18.5 ng/mL\nSerum Calcium: 9.1 mg/dL\nSerum B12: 190 pg/mL\n"
    res = parse_doctor_report(sample_text.encode('utf-8'), "test_report.pdf")
    assert res["success"] is True
    assert res["detected_count"] >= 3
    assert "hemoglobin" in res["extracted_biomarkers"]
    assert res["extracted_biomarkers"]["hemoglobin"]["value"] == 11.2
    
    unreadable = parse_doctor_report(b"Random corrupt binary", "corrupt.png")
    assert unreadable["success"] is False
    assert "Could not" in unreadable["message"] or "corrupted" in unreadable["message"]
    print("PASS: Doctor report parser test.")

from backend.api.endpoints import get_dataset_info

def test_dataset_endpoints():
    info = get_dataset_info()
    assert info["total_records"] == 6000
    assert info["total_features"] == 27
    assert "Iron" in info["target_nutrients"]
    assert len(info["sample_records"]) > 0
    print(f"PASS: Dataset info verified. Records: {info['total_records']}, Features: {info['total_features']}")

if __name__ == "__main__":
    test_seeded_data()
    test_prediction_stub()
    test_diet_optimizer()
    test_twin_simulation_formulas()
    test_nutrient_interactions_db()
    test_family_coop_optimizer()
    test_pdf_report_stream()
    test_doctor_report_parser()
    test_dataset_endpoints()
