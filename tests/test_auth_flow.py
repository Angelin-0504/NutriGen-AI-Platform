import pytest
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.database.db import SessionLocal
from backend.database.models import User, Prediction
from backend.schemas.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    UserAssessmentRequest
)
from backend.api.endpoints import (
    register_user,
    login_user,
    logout_user,
    get_user_profile,
    create_assessment
)
from backend.services.auth import (
    hash_password,
    verify_password,
    validate_registration_input,
    create_access_token,
    decode_access_token
)

def test_full_auth_lifecycle():
    """
    Tests the complete user registration, database persistence, subsequent login with
    both email and username, password verification, duplicate prevention, and logout.
    """
    db: Session = SessionLocal()
    
    test_email = "test_clinical_auth@nutrigen.ai"
    test_name = "Clinical Tester"
    test_password = "SecurePassword123"
    
    try:
        # Clean up any residual test account
        db.query(User).filter(User.email == test_email).delete()
        db.commit()
        
        # 1. Validation logic testing
        valid, msg = validate_registration_input(test_name, test_email, test_password, test_password)
        assert valid is True
        assert msg == ""
        
        # Mismatched passwords rejected
        valid_bad, msg_bad = validate_registration_input(test_name, test_email, test_password, "Different123")
        assert valid_bad is False
        assert "do not match" in msg_bad
        
        # Short password rejected
        valid_short, msg_short = validate_registration_input(test_name, test_email, "short1", "short1")
        assert valid_short is False
        assert "at least 8 characters" in msg_short
        
        # 2. Registration
        reg_req = UserRegisterRequest(
            name=test_name,
            email=test_email,
            password=test_password,
            confirm_password=test_password
        )
        reg_res = register_user(reg_req, db=db)
        assert reg_res["status"] == "success"
        user_id = reg_res["user"]["id"]
        token = reg_res["token"]
        assert user_id is not None
        assert token is not None
        
        # 3. Verify account saved in database
        saved_user = db.query(User).filter(User.id == user_id).first()
        assert saved_user is not None
        assert saved_user.email == test_email
        assert saved_user.name == test_name
        assert saved_user.password_hash is not None
        assert "$" in saved_user.password_hash
        assert verify_password(test_password, saved_user.password_hash) is True
        
        # 4. Duplicate registration with same email is strictly rejected
        with pytest.raises(HTTPException) as exc_dup:
            register_user(reg_req, db=db)
        assert exc_dup.value.status_code == 400
        assert "already exists" in exc_dup.value.detail
        
        # Duplicate with uppercase email also rejected
        reg_req_upper = UserRegisterRequest(
            name="Another Name",
            email=test_email.upper(),
            password=test_password,
            confirm_password=test_password
        )
        with pytest.raises(HTTPException) as exc_dup_upper:
            register_user(reg_req_upper, db=db)
        assert exc_dup_upper.value.status_code == 400
        
        # 5. Logout
        logout_res = logout_user()
        assert logout_res["status"] == "success"
        
        # 6. Login with exact same email and password works
        login_req_email = UserLoginRequest(
            email=test_email,
            password=test_password
        )
        login_res_email = login_user(login_req_email, db=db)
        assert login_res_email["status"] == "success"
        assert login_res_email["user"]["id"] == user_id
        assert login_res_email["user"]["name"] == test_name
        
        # 7. Login with uppercase email works
        login_req_upper = UserLoginRequest(
            email=test_email.upper(),
            password=test_password
        )
        login_res_upper = login_user(login_req_upper, db=db)
        assert login_res_upper["status"] == "success"
        assert login_res_upper["user"]["id"] == user_id
        
        # 8. Login using username / name works
        login_req_name = UserLoginRequest(
            email=test_name,
            password=test_password
        )
        login_res_name = login_user(login_req_name, db=db)
        assert login_res_name["status"] == "success"
        assert login_res_name["user"]["id"] == user_id
        
        # 9. Login with incorrect password fails
        login_req_bad_pwd = UserLoginRequest(
            email=test_email,
            password="IncorrectPassword999"
        )
        with pytest.raises(HTTPException) as exc_bad_pwd:
            login_user(login_req_bad_pwd, db=db)
        assert exc_bad_pwd.value.status_code == 401
        assert "Invalid username or password" in exc_bad_pwd.value.detail
        
        # 10. Login with nonexistent user fails
        login_req_nonexistent = UserLoginRequest(
            email="nonexistent_user_999@nutrigen.ai",
            password="SomePassword123"
        )
        with pytest.raises(HTTPException) as exc_nonexistent:
            login_user(login_req_nonexistent, db=db)
        assert exc_nonexistent.value.status_code == 401
        
        # 11. User completes assessment and records are saved under user ID
        assessment_req = UserAssessmentRequest(
            user_id=user_id,
            name=test_name,
            age=28,
            gender="Female",
            height=165.0,
            weight=62.0,
            region="Tamil Nadu",
            diet_type="Vegetarian",
            daily_food_budget=175.0,
            activity_level="Moderate",
            sun_exposure="Medium",
            sleep_hours=8.0,
            medical_conditions=[],
            symptoms=["fatigue"],
            allergies=["Lactose"],
            liked_foods=["Ragi (Finger Millet)"],
            disliked_foods=[],
            wants_weight_loss=True,
            target_weight=57.0,
            weight_loss_rate=0.5
        )
        assessment_res = create_assessment(assessment_req, db=db)
        assert assessment_res.user_id == user_id
        assert assessment_res.weight_loss is not None
        assert assessment_res.weight_loss.wants_weight_loss is True
        
        # 12. Subsequent login retrieves saved personal information and assessment results
        subsequent_login = login_user(login_req_email, db=db)
        user_info = subsequent_login["user"]
        assert user_info["has_profile"] is True
        assert user_info["profile"]["age"] == 28
        assert user_info["profile"]["diet_type"] == "Vegetarian"
        assert user_info["profile"]["allergies"] == ["Lactose"]
        assert user_info["latest_prediction"] is not None
        assert user_info["wants_weight_loss"] is True
        assert user_info["target_weight"] == 57.0
        
    finally:
        # Clean up
        db.query(Prediction).filter(Prediction.user_id == user_id).delete()
        db.query(User).filter(User.id == user_id).delete()
        db.commit()
        db.close()

def test_session_tokens():
    token = create_access_token(user_id=123, email="sample@nutrigen.ai", expires_in_sec=3600)
    assert token is not None
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["uid"] == 123
    assert payload["email"] == "sample@nutrigen.ai"
    
    # Tampered token fails
    tampered_token = token[:-5] + "abcde"
    assert decode_access_token(tampered_token) is None
    
    # Empty token fails
    assert decode_access_token("") is None
