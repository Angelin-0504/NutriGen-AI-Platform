from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    height = Column(Float, nullable=True)
    weight = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    region = Column(String, nullable=True)
    diet_type = Column(String, nullable=True)  # Vegetarian, Vegan, Non-Vegetarian
    daily_food_budget = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True)
    sun_exposure = Column(String, nullable=True)
    sleep_hours = Column(Float, default=8.0)
    medical_conditions = Column(Text, default="[]")  # JSON list of conditions
    symptoms = Column(Text, default="[]")  # JSON list of symptoms
    allergies = Column(Text, default="[]")  # JSON list of allergies
    liked_foods = Column(Text, default="[]")  # JSON list of foods
    disliked_foods = Column(Text, default="[]")  # JSON list of foods
    
    # Weight Loss & Calorie Management Fields
    wants_weight_loss = Column(Boolean, default=False)
    target_weight = Column(Float, nullable=True)
    weight_loss_rate = Column(Float, nullable=True)  # kg per week
    bmr = Column(Float, nullable=True)  # Basal Metabolic Rate (kcal)
    tdee = Column(Float, nullable=True)  # Total Daily Energy Expenditure (kcal)
    calorie_target = Column(Float, nullable=True)  # Daily target (kcal)
    calorie_deficit = Column(Float, nullable=True)  # Daily deficit (kcal)
    
    saved_meal_plan = Column(Text, nullable=True)  # JSON 7-day meal plan with swaps
    saved_twin_simulation = Column(Text, nullable=True)  # JSON latest calculated twin simulation
    saved_weight_loss_simulation = Column(Text, nullable=True)  # JSON latest weight-loss twin simulation
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    progress_records = relationship("ProgressRecord", back_populates="user", cascade="all, delete-orphan")
    weekly_weight_records = relationship("WeeklyWeightRecord", back_populates="user", cascade="all, delete-orphan")

class FamilyGroup(Base):
    __tablename__ = "family_groups"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    members = relationship("FamilyMember", back_populates="group", cascade="all, delete-orphan")

class FamilyMember(Base):
    __tablename__ = "family_members"
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("family_groups.id"))
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    diet_type = Column(String)
    sun_exposure = Column(String)
    activity_level = Column(String)
    symptoms = Column(Text, default="[]")
    allergies = Column(Text, default="[]")
    liked_foods = Column(Text, default="[]")
    disliked_foods = Column(Text, default="[]")
    
    group = relationship("FamilyGroup", back_populates="members")

class FoodItem(Base):
    __tablename__ = "food_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String)  # Grain, Vegetable, Fruit, Legume, Dairy, Meat, Seafood, Seeds/Nuts, Meal, Snack
    meal_type = Column(String, default="Lunch")  # Breakfast, Lunch, Dinner, Snack, Any
    region = Column(String)  # Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Maharashtra, North India, National
    calories = Column(Float)  # per serving / 100g
    protein = Column(Float)  # g per 100g
    iron = Column(Float)  # mg per 100g
    calcium = Column(Float)  # mg per 100g
    vitamin_d = Column(Float)  # mcg per 100g
    vitamin_b12 = Column(Float)  # mcg per 100g
    magnesium = Column(Float)  # mg per 100g
    zinc = Column(Float)  # mg per 100g
    vitamin_c = Column(Float, default=0.0)  # mg per 100g
    serving_size = Column(String, default="100g")  # e.g. "1 bowl (150g)"
    cost = Column(Float)  # average cost per serving in INR
    is_vegetarian = Column(Boolean, default=True)
    is_vegan = Column(Boolean, default=True)
    allergens = Column(Text, default="[]")  # JSON list of allergens

class FoodInteraction(Base):
    __tablename__ = "food_interactions"
    id = Column(Integer, primary_key=True, index=True)
    nutrient = Column(String)  # Iron, Calcium, etc.
    enhancer_or_inhibitor = Column(String)  # enhancer, inhibitor
    interacting_food_or_nutrient = Column(String)
    description = Column(Text)
    reference = Column(String)

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    iron_risk = Column(Float)
    vitamin_d_risk = Column(Float)
    vitamin_b12_risk = Column(Float)
    calcium_risk = Column(Float)
    magnesium_risk = Column(Float)
    zinc_risk = Column(Float)
    confidence_level = Column(String)  # High, Medium, Low
    explanation_json = Column(Text)  # SHAP values
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="predictions")

class ProgressRecord(Base):
    __tablename__ = "progress_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    record_date = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    weight = Column(Float)
    bmi = Column(Float)
    symptoms = Column(Text, default="[]")
    meal_checkins = Column(Text, default="{}")  # JSON map of meal slots to status, actual food, portion, reason, notes
    adherence_pct = Column(Float, default=0.0)
    completed_count = Column(Integer, default=0)
    modified_count = Column(Integer, default=0)
    replaced_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    pending_count = Column(Integer, default=0)
    lab_measurements = Column(Text, default="{}")  # JSON dict of lab tests
    actual_nutrients = Column(Text, default="{}")  # JSON dict of estimated consumed nutrients
    notes = Column(Text, default="")
    iron_risk = Column(Float, default=0.0)
    vitamin_d_risk = Column(Float, default=0.0)
    vitamin_b12_risk = Column(Float, default=0.0)
    calcium_risk = Column(Float, default=0.0)
    magnesium_risk = Column(Float, default=0.0)
    zinc_risk = Column(Float, default=0.0)
    adherence_score = Column(Float, default=0.0)
    prevention_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="progress_records")

class WeeklyWeightRecord(Base):
    __tablename__ = "weekly_weight_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    week_number = Column(Integer, default=1)
    record_date = Column(String, default=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    weight = Column(Float, nullable=True)  # Null if pending / not yet entered
    status = Column(String, default="recorded")  # "recorded" or "pending"
    initial_weight = Column(Float, nullable=True)
    previous_weight = Column(Float, nullable=True)
    target_weight = Column(Float, nullable=True)
    weight_change_from_initial = Column(Float, nullable=True)
    weight_change_from_previous = Column(Float, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="weekly_weight_records")
