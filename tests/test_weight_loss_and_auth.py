import pytest
from backend.database.db import SessionLocal
from backend.database.models import User, Prediction, FoodItem
from backend.services.auth import (
    hash_password, verify_password, validate_registration_input,
    create_access_token, decode_access_token
)
from backend.services.weight_loss import (
    calculate_bmr, calculate_tdee, compute_weight_loss_plan
)
from backend.schemas.schemas import (
    UserRegisterRequest, UserLoginRequest, UserAssessmentRequest, FoodSwapRequest
)
from backend.api.endpoints import (
    register_user, login_user, create_assessment, get_meal_plan, swap_meal_food,
    get_user_profile, download_pdf_report
)

def test_auth_hashing_and_token():
    # 1. Password hashing
    password = "SafePassword123!"
    h1 = hash_password(password)
    assert "$" in h1
    assert verify_password(password, h1) is True
    assert verify_password("WrongPass123!", h1) is False
    
    # 2. Token creation and decoding
    token = create_access_token(user_id=99, email="test@example.com")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["uid"] == 99
    assert payload["email"] == "test@example.com"
    
    # 3. Input validation
    ok, _ = validate_registration_input("John Doe", "john@example.com", "Password123", "Password123")
    assert ok is True
    
    bad_email, msg = validate_registration_input("John", "bad-email", "Password123", "Password123")
    assert bad_email is False
    
    bad_pass, _ = validate_registration_input("John", "john@example.com", "short", "short")
    assert bad_pass is False

def test_user_registration_and_login_flow():
    db = SessionLocal()
    unique_email = f"user_test_{pytest.__name__}_flow@nutrigen.ai"
    
    # Clean up if exists
    db.query(User).filter(User.email == unique_email).delete()
    db.commit()
    
    # Register
    reg_req = UserRegisterRequest(
        name="Clinical User",
        email=unique_email,
        password="SecurePass999!",
        confirm_password="SecurePass999!"
    )
    reg_res = register_user(reg_req, db)
    assert reg_res["status"] == "success"
    user_id = reg_res["user"]["id"]
    assert user_id > 0
    
    # Duplicate registration check
    with pytest.raises(Exception):
        register_user(reg_req, db)
        
    # Valid Login
    login_req = UserLoginRequest(email=unique_email, password="SecurePass999!")
    login_res = login_user(login_req, db)
    assert login_res["status"] == "success"
    assert login_res["user"]["id"] == user_id
    assert login_res["user"]["email"] == unique_email
    assert login_res["token"] is not None
    
    # Invalid password login
    with pytest.raises(Exception):
        bad_login = UserLoginRequest(email=unique_email, password="WrongPassword!")
        login_user(bad_login, db)
        
    db.close()

def test_calorie_and_bmr_calculations():
    # Male: weight 80 kg, height 175 cm, age 30
    # BMR = (10 * 80) + (6.25 * 175) - (5 * 30) + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 -> 1748.8
    bmr_m = calculate_bmr(80.0, 175.0, 30, "Male")
    assert 1740.0 <= bmr_m <= 1760.0
    
    # TDEE for Sedentary (1.2)
    tdee_m = calculate_tdee(bmr_m, "Sedentary")
    assert 2080.0 <= tdee_m <= 2120.0
    
    # Weight loss plan: Male wanting to lose from 80kg to 72kg at 0.5 kg/week
    plan_m = compute_weight_loss_plan(
        current_weight_kg=80.0,
        target_weight_kg=72.0,
        height_cm=175.0,
        age_years=30,
        gender="Male",
        activity_level="Sedentary",
        rate_kg_per_week=0.5
    )
    assert plan_m["weight_to_lose"] == 8.0
    assert plan_m["calorie_target"] >= 1500.0  # Safe floor for males
    assert plan_m["calorie_deficit"] > 0
    assert plan_m["estimated_weeks"] > 0
    
    # Female: weight 65 kg, height 160 cm, age 28
    plan_f = compute_weight_loss_plan(
        current_weight_kg=65.0,
        target_weight_kg=58.0,
        height_cm=160.0,
        age_years=28,
        gender="Female",
        activity_level="Moderate",
        rate_kg_per_week=0.5
    )
    assert plan_f["weight_to_lose"] == 7.0
    assert plan_f["calorie_target"] >= 1200.0  # Safe floor for females
    assert "Mifflin-St Jeor" in plan_f["clinical_notice"]

def test_combined_assessment_with_weight_loss():
    db = SessionLocal()
    unique_email = "wl_eval_user@nutrigen.ai"
    user = db.query(User).filter(User.email == unique_email).first()
    if not user:
        user = User(name="Weight Loss Patient", email=unique_email, password_hash=hash_password("Pass12345!"))
        db.add(user)
        db.commit()
        db.refresh(user)
        
    req = UserAssessmentRequest(
        user_id=user.id,
        name="Weight Loss Patient",
        age=32,
        gender="Female",
        height=162.0,
        weight=68.0,
        region="Tamil Nadu",
        diet_type="Vegetarian",
        daily_food_budget=160.0,
        activity_level="Sedentary",
        sun_exposure="Low",
        sleep_hours=7.5,
        medical_conditions=["Low Iron Diet"],
        symptoms=["fatigue", "pale_skin"],
        allergies=[],
        liked_foods=["Ragi (Finger Millet)", "Spinach (Keerai / Palak)"],
        disliked_foods=[],
        wants_weight_loss=True,
        target_weight=60.0,
        weight_loss_rate=0.5
    )
    
    assessment_res = create_assessment(req, db)
    
    # Check 6 deficiencies predicted
    assert len(assessment_res.deficiences) == 6
    nutrients = [d.nutrient for d in assessment_res.deficiences]
    assert "Iron" in nutrients
    assert "Vitamin D" in nutrients
    assert "Vitamin B12" in nutrients
    assert "Calcium" in nutrients
    assert "Magnesium" in nutrients
    assert "Zinc" in nutrients
    
    # Check weight loss details
    assert assessment_res.weight_loss is not None
    assert assessment_res.weight_loss.wants_weight_loss is True
    assert assessment_res.weight_loss.current_weight == 68.0
    assert assessment_res.weight_loss.target_weight == 60.0
    assert assessment_res.weight_loss.calorie_target >= 1200.0
    assert assessment_res.weight_loss.calorie_deficit > 0
    
    # Verify persistence in User table
    refreshed_user = db.query(User).filter(User.id == user.id).first()
    assert refreshed_user.wants_weight_loss is True
    assert refreshed_user.calorie_target == assessment_res.weight_loss.calorie_target
    assert refreshed_user.bmr == assessment_res.weight_loss.bmr
    assert refreshed_user.tdee == assessment_res.weight_loss.tdee
    
    db.close()

def test_weight_loss_aware_7day_meal_plan_and_swaps():
    db = SessionLocal()
    # Find user with weight loss enabled
    user = db.query(User).filter(User.wants_weight_loss == True).first()
    assert user is not None, "Need user with wants_weight_loss=True"
    
    # Generate 7-day meal plan
    plan = get_meal_plan(user.id, regenerate=True, db=db)
    assert len(plan) == 7, "Must contain all 7 days Monday-Sunday"
    
    days = [d["day"] for d in plan]
    assert days == ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    # Verify each day has the required 5 meals and calorie/deficiency data
    for day_plan in plan:
        meals = day_plan["meals"]
        assert "Breakfast" in meals
        assert "Mid-Morning Snack" in meals
        assert "Lunch" in meals
        assert "Evening Snack" in meals
        assert "Dinner" in meals
        
        # Calories and allowances
        assert "calorie_target" in day_plan
        assert "total_calories" in day_plan
        assert "remaining_calories" in day_plan
        assert day_plan["wants_weight_loss"] is True
        assert len(day_plan["deficiency_recommendations"]) > 0
        
        # Verify foods have calorie and nutrient contribution
        for meal_name, meal_info in meals.items():
            assert "calories" in meal_info["nutrients"]
            assert "protein" in meal_info["nutrients"]
            assert "iron" in meal_info["nutrients"]
            assert "calcium" in meal_info["nutrients"]
            assert len(meal_info["foods"]) > 0
            
    # Test swapping a food item in the plan
    first_food = db.query(FoodItem).first()
    swap_req = FoodSwapRequest(
        day="Monday",
        meal_slot="Lunch",
        old_food_name="Test Food",
        new_food_id=first_food.id
    )
    swap_res = swap_meal_food(swap_req, db)
    assert swap_res["id"] == first_food.id
    assert "calories" in swap_res
    assert "protein" in swap_res
    assert "iron" in swap_res
    
    db.close()

def test_user_data_isolation():
    db = SessionLocal()
    # Create two distinct users
    u1_email = "iso_user_1@nutrigen.ai"
    u2_email = "iso_user_2@nutrigen.ai"
    
    u1 = db.query(User).filter(User.email == u1_email).first()
    if not u1:
        u1 = User(name="User One", email=u1_email, password_hash=hash_password("Pass12345!"), weight=75.0, wants_weight_loss=True, calorie_target=1700.0)
        db.add(u1)
        db.commit()
        db.refresh(u1)
        
    u2 = db.query(User).filter(User.email == u2_email).first()
    if not u2:
        u2 = User(name="User Two", email=u2_email, password_hash=hash_password("Pass67890!"), weight=55.0, wants_weight_loss=False)
        db.add(u2)
        db.commit()
        db.refresh(u2)
        
    p1 = get_user_profile(u1.id, db)
    p2 = get_user_profile(u2.id, db)
    
    assert p1["id"] != p2["id"]
    assert p1["email"] == u1_email
    assert p2["email"] == u2_email
    assert p1["wants_weight_loss"] is True
    assert p2["wants_weight_loss"] is False
    assert p1["calorie_target"] == 1700.0
    assert p2["calorie_target"] is None
    
    db.close()

