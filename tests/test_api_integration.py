import pytest
from backend.database.db import SessionLocal
from backend.database.models import User, Prediction
from backend.schemas.schemas import (
    UserRegisterRequest, UserLoginRequest, UserAssessmentRequest, FoodSwapRequest
)
from backend.api.endpoints import (
    register_user, login_user, logout_user, create_assessment, get_meal_plan,
    swap_meal_food, get_user_profile
)
from backend.main import health_check

def test_api_health():
    res = health_check()
    assert res["status"] == "healthy"

def test_complete_user_auth_and_weight_loss_lifecycle():
    email = "integration_test_user@nutrigen.ai"
    password = "TestPassword99!"
    
    # 1. Clean up existing test user
    db = SessionLocal()
    db.query(User).filter(User.email == email).delete()
    db.commit()
    
    # 2. Register
    reg_req = UserRegisterRequest(
        name="Integration User",
        email=email,
        password=password,
        confirm_password=password
    )
    reg_data = register_user(reg_req, db)
    assert reg_data["status"] == "success"
    user_id = reg_data["user"]["id"]
    token = reg_data["token"]
    assert token is not None
    
    # 3. Duplicate registration prevented
    with pytest.raises(Exception):
        register_user(reg_req, db)
    
    # 4. Login with invalid password raises error
    bad_login = UserLoginRequest(email=email, password="WrongPassword!")
    with pytest.raises(Exception):
        login_user(bad_login, db)
    
    # 5. Login with valid credentials
    login_req = UserLoginRequest(email=email, password=password)
    login_data = login_user(login_req, db)
    assert login_data["status"] == "success"
    assert login_data["user"]["id"] == user_id
    assert login_data["user"]["has_profile"] is False
    
    # 6. Submit Assessment WITH Weight-Loss Enabled (Yes - I want to lose weight)
    assessment_payload = UserAssessmentRequest(
        user_id=user_id,
        name="Integration User",
        age=29,
        gender="Female",
        height=164.0,
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
        liked_foods=["Ragi (Finger Millet)"],
        disliked_foods=[],
        wants_weight_loss=True,
        target_weight=60.0,
        weight_loss_rate=0.5
    )
    
    assess_res = create_assessment(assessment_payload, db)
    
    # Verify 6 nutrient deficiencies predicted
    assert len(assess_res.deficiences) == 6
    # Verify weight loss details
    wl = assess_res.weight_loss
    assert wl is not None
    assert wl.wants_weight_loss is True
    assert wl.current_weight == 68.0
    assert wl.target_weight == 60.0
    assert wl.calorie_target >= 1200.0
    assert wl.calorie_deficit > 0
    assert "Mifflin-St Jeor" in wl.clinical_notice
    
    # 7. Check user profile endpoint reflects persisted assessment & weight loss
    prof = get_user_profile(user_id, db)
    assert prof["email"] == email
    assert prof["wants_weight_loss"] is True
    assert prof["calorie_target"] == wl.calorie_target
    assert prof["bmr"] == wl.bmr
    
    # 8. Generate 7-Day Meal Plan (Monday to Sunday)
    plan = get_meal_plan(user_id=user_id, regenerate=True, db=db)
    assert len(plan) == 7
    days = [d["day"] for d in plan]
    assert days == ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    for day_plan in plan:
        assert "Breakfast" in day_plan["meals"]
        assert "Mid-Morning Snack" in day_plan["meals"]
        assert "Lunch" in day_plan["meals"]
        assert "Evening Snack" in day_plan["meals"]
        assert "Dinner" in day_plan["meals"]
        assert "calorie_target" in day_plan
        assert "total_calories" in day_plan
        assert "remaining_calories" in day_plan
        assert day_plan["wants_weight_loss"] is True
        assert len(day_plan["deficiency_recommendations"]) > 0
        
    # 9. Verify subsequent login retrieves saved profile and meal plan
    rel_login = login_user(login_req, db)
    assert rel_login["user"]["has_profile"] is True
    assert rel_login["user"]["wants_weight_loss"] is True
    assert rel_login["user"]["latest_prediction"] is not None
    assert rel_login["user"]["saved_meal_plan"] is not None
    
    # 10. Test Logout
    logout_res = logout_user()
    assert logout_res["status"] == "success"
    
    db.close()
