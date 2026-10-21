from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime

# --- Assessment & User Schemas ---
class UserAssessmentRequest(BaseModel):
    name: str = Field(..., example="Demo User")
    age: int = Field(..., ge=1, le=120)
    gender: str = Field(..., pattern="^(Male|Female)$")
    height: float = Field(..., ge=30.0, le=280.0) # in cm
    weight: float = Field(..., ge=5.0, le=350.0) # in kg
    region: str = Field(..., example="Tamil Nadu") # Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Maharashtra, North India, National
    diet_type: str = Field(..., pattern="^(Vegetarian|Vegan|Non-Vegetarian)$")
    daily_food_budget: float = Field(..., ge=10.0, le=5000.0)
    activity_level: str = Field(..., pattern="^(Sedentary|Light|Moderate|Active|Low|High)$")
    sun_exposure: str = Field(..., pattern="^(Low|Medium|High)$")
    sleep_hours: float = Field(8.0, ge=2, le=18)
    medical_conditions: List[str] = []
    symptoms: List[str] = [] # symptoms list
    allergies: List[str] = [] # allergies list
    liked_foods: List[str] = []
    disliked_foods: List[str] = []

class UserResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    bmi: float
    region: str
    diet_type: str
    daily_food_budget: float
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Prediction & Explanation Schemas ---
class NutrientRisk(BaseModel):
    nutrient: str
    probability: float
    risk_category: str
    confidence: str
    guidance: str

class AssessmentResponse(BaseModel):
    user_id: int
    bmi: float
    deficiences: List[NutrientRisk]
    explanations: Dict[str, Dict] # SHAP explanations
    prevention_score: float

# --- Family Schemas ---
class FamilyMemberCreate(BaseModel):
    name: str
    age: int
    gender: str
    diet_type: str
    sun_exposure: str
    activity_level: str
    symptoms: List[str] = []
    allergies: List[str] = []
    liked_foods: List[str] = []
    disliked_foods: List[str] = []

class FamilyGroupCreate(BaseModel):
    name: str
    members: List[FamilyMemberCreate]

# --- Meal Plan Swaps ---
class FoodSwapRequest(BaseModel):
    day: str
    meal_slot: str
    old_food_name: str
    new_food_id: int

# --- Progress Tracking ---
class ProgressUpdateRequest(BaseModel):
    user_id: int
    weight: float
    symptoms: List[str]
    adherence_score: float # 0 to 100

class MealCheckinItem(BaseModel):
    status: str # 'eaten_as_planned', 'eaten_with_modifications', 'replaced', 'skipped', 'unreported'
    planned_food: Optional[str] = None
    actual_food: Optional[str] = None
    portion_pct: Optional[float] = 100.0
    reason: Optional[str] = None
    notes: Optional[str] = None

class DailyProgressCheckinRequest(BaseModel):
    user_id: int
    record_date: str # YYYY-MM-DD
    weight: Optional[float] = None
    meal_checkins: Dict[str, Any] = {} # slot -> checkin item
    symptoms: Optional[List[str]] = None
    lab_measurements: Optional[Dict[str, Any]] = None # {"hemoglobin": {"value": 11.2, "unit": "g/dL", "date": "..."}}
    notes: Optional[str] = ""

class ProgressResponse(BaseModel):
    previous_risk: Dict[str, float]
    current_risk: Dict[str, float]
    reduction_percentage: Dict[str, float]
    status: str
    improvement_score: float

class SaveMealPlanRequest(BaseModel):
    user_id: int
    weekly_plan: List[Dict[str, Any]]

# --- Digital Twin Simulation ---
class TwinSimulationRequest(BaseModel):
    user_id: int
    adherence_score: float
    duration_weeks: int = 12
    dietary_choice: str = "standard_recommended"

