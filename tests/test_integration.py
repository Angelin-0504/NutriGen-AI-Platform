import json
import urllib.request
import urllib.error
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def make_request(path: str, method: str = "GET", data: dict = None, headers: dict = None) -> tuple:
    url = f"{BASE_URL}{path}"
    req_data = None
    
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
        
    req = urllib.request.Request(url, data=req_data, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            resp_data = response.read()
            content_type = response.headers.get("Content-Type", "")
            return response.status, resp_data, content_type
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code} on {method} {path}: {e.read().decode('utf-8', errors='ignore')}")
        raise e
    except Exception as e:
        print(f"Network error on {method} {path}: {e}")
        raise e

def run_integration_tests():
    print("Initiating end-to-end integration tests...")
    
    # 1. Health check
    status, body, _ = make_request("/api/health")
    assert status == 200, "Health check failed"
    health = json.loads(body.decode("utf-8"))
    assert health["status"] == "healthy", "Service status unhealthy"
    print("[PASS] API Health Check passed.")

    # 2. Seeding & Foods DB check
    status, body, _ = make_request("/api/foods")
    assert status == 200
    foods = json.loads(body.decode("utf-8"))
    assert len(foods) > 0, "No food items found in DB"
    print(f"[PASS] Database seeding verified. Found {len(foods)} food items.")

    # 3. Assessment post (Demographics + Symptoms -> prediction + explanations)
    assessment_payload = {
        "name": "Integration Tester",
        "age": 34,
        "gender": "Male",
        "height": 172.0,
        "weight": 78.5,
        "region": "Maharashtra",
        "diet_type": "Vegetarian",
        "daily_food_budget": 180.0,
        "activity_level": "Moderate",
        "sun_exposure": "Medium",
        "sleep_hours": 7.0,
        "medical_conditions": ["Low Iron Diet"],
        "symptoms": ["fatigue", "weak_nails"],
        "allergies": [],
        "liked_foods": [],
        "disliked_foods": []
    }
    status, body, _ = make_request("/api/assessment", method="POST", data=assessment_payload)
    assert status == 200
    assessment = json.loads(body.decode("utf-8"))
    user_id = assessment["user_id"]
    assert user_id > 0, "Failed to create user session"
    assert "deficiences" in assessment, "No deficiency predictions returned"
    assert "explanations" in assessment, "No SHAP explanations returned"
    print(f"[PASS] User assessment created successfully. Session User ID: {user_id}")

    # 4. Meal plan creation check
    status, body, _ = make_request(f"/api/meal-plan?user_id={user_id}", method="POST")
    assert status == 200
    meal_plan = json.loads(body.decode("utf-8"))
    assert len(meal_plan) == 7, "Should generate a 7-day meal plan"
    print("[PASS] Meal optimizer resolved optimal weekly diet.")

    # 5. Food Swap recalculation check
    swap_payload = {
        "day": "Monday",
        "meal_slot": "Breakfast",
        "old_food_name": meal_plan[0]["meals"]["Breakfast"]["foods"][0],
        "new_food_id": foods[0]["id"]
    }
    status, body, _ = make_request("/api/meal-plan/swap", method="POST", data=swap_payload)
    assert status == 200
    swap_res = json.loads(body.decode("utf-8"))
    assert swap_res["name"] == foods[0]["name"], "Swap returned incorrect food item"
    print(f"[PASS] Dynamic swap recalculations resolved correctly for target: {swap_res['name']}.")

    # 6. Twin Simulation check
    twin_payload = {
        "user_id": user_id,
        "adherence_score": 85.0,
        "duration_weeks": 12
    }
    status, body, _ = make_request("/api/digital-twin/simulate", method="POST", data=twin_payload)
    assert status == 200
    twin_res = json.loads(body.decode("utf-8"))
    assert "chart_data" in twin_res, "Digital twin missing projections output"
    print("[PASS] Digital Twin trajectory simulation compiled successfully.")

    # 7. Progress Tracking update
    progress_payload = {
        "user_id": user_id,
        "weight": 77.0, # 1.5kg loss
        "symptoms": ["fatigue"], # weak nails resolved
        "adherence_score": 90.0
    }
    status, body, _ = make_request("/api/progress", method="POST", data=progress_payload)
    assert status == 200
    progress = json.loads(body.decode("utf-8"))
    assert progress["status"] in ["Improving", "Stable", "Needs Adjustment"], "Invalid progress status return"
    print(f"[PASS] User progress log tracked. Resolution index: {progress['improvement_score']}%")

    # 8. Report generator (ReportLab PDF)
    status, body, content_type = make_request(f"/api/report/{user_id}")
    assert status == 200, "PDF download endpoint failed"
    assert "application/pdf" in content_type, "PDF download endpoint returned incorrect Content-Type"
    assert body.startswith(b"%PDF"), "PDF file signature validation failed"
    print(f"[PASS] PDF report generator validated. File size: {len(body)} bytes.")

    # 9. Admin metrics updates
    status, body, _ = make_request("/api/admin/metrics")
    assert status == 200
    admin = json.loads(body.decode("utf-8"))
    assert admin["total_users"] > 0, "Admin counters did not capture active assessments"
    print(f"[PASS] Admin panel diagnostics validated. Signed clients: {admin['total_users']}.")

    print("\n==============================================")
    print("E2E INTEGRATION SUCCESSFUL: ALL ENDPOINTS GREEN")
    print("==============================================")

if __name__ == "__main__":
    # Small delay to ensure port binding completes
    time.sleep(1)
    try:
        run_integration_tests()
        sys.exit(0)
    except Exception as e:
        print(f"INTEGRATION TEST CRITICAL FAILURE: {e}")
        sys.exit(1)
