import os
import json
from sqlalchemy import create_engine
from backend.database.db import engine, Base
from backend.database.models import FoodItem, FoodInteraction
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_database():
    # 1. Drop existing tables to refresh schema and recreate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database tables recreated with latest schema.")
    
    db = SessionLocal()
    
    # Force re-seeding to ensure new columns and expanded dataset are populated
    db.query(FoodItem).delete()
    db.query(FoodInteraction).delete()
    db.commit()

    # Comprehensive regional & Indian Food Database (IFCT / NIN / ICMR values per 100g/serving)
    foods = [
        # --- TAMIL NADU (Verified Traditional & Regional Dishes) ---
        # Breakfast
        {
            "name": "Idli with Sambar & Chutney", "category": "Grain", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 210.0, "protein": 6.5, "iron": 2.2, "calcium": 60.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 55.0, "zinc": 1.2, "vitamin_c": 6.0, "serving_size": "2 idlis + sambar (180g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Ragi Dosa with Chutney", "category": "Grain", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 240.0, "protein": 6.8, "iron": 3.9, "calcium": 310.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 125.0, "zinc": 2.1, "vitamin_c": 2.5, "serving_size": "2 dosas (150g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Ven Pongal with Ghee & Pepper", "category": "Grain", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 280.0, "protein": 8.0, "iron": 2.6, "calcium": 48.0, "vitamin_d": 0.1, "vitamin_b12": 0.1, "magnesium": 70.0, "zinc": 1.5, "vitamin_c": 2.0, "serving_size": "1 bowl (180g)",
            "cost": 30.0, "is_vegetarian": True, "is_vegan": False, "allergens": "[\"lactose\"]"
        },
        {
            "name": "Kuzhi Paniyaram with Tomato Thokku", "category": "Grain", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 230.0, "protein": 5.8, "iron": 2.1, "calcium": 52.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 58.0, "zinc": 1.3, "vitamin_c": 5.0, "serving_size": "4 paniyarams (140g)",
            "cost": 22.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Kanchipuram Idli", "category": "Grain", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 190.0, "protein": 5.2, "iron": 1.8, "calcium": 42.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 45.0, "zinc": 0.9, "vitamin_c": 0.0, "serving_size": "2 idlis (140g)",
            "cost": 22.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Adai (Multi-Lentil Protein Pancake)", "category": "Pulse", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 290.0, "protein": 14.5, "iron": 4.8, "calcium": 90.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 115.0, "zinc": 2.6, "vitamin_c": 3.0, "serving_size": "2 adais (160g)",
            "cost": 30.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Samba Wheat Rava Upma with Veggies", "category": "Grain", "meal_type": "Breakfast", "region": "Tamil Nadu",
            "calories": 210.0, "protein": 6.2, "iron": 2.4, "calcium": 38.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 65.0, "zinc": 1.1, "vitamin_c": 8.0, "serving_size": "1 bowl (160g)",
            "cost": 20.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        # Lunch
        {
            "name": "Murungai Keerai Poriyal (Moringa Leaves)", "category": "Vegetable", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 95.0, "protein": 8.5, "iron": 5.2, "calcium": 250.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 140.0, "zinc": 0.8, "vitamin_c": 45.0, "serving_size": "1 bowl (120g)",
            "cost": 20.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Sambar Rice with Beans Poriyal", "category": "Grain", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 320.0, "protein": 10.5, "iron": 3.8, "calcium": 95.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 85.0, "zinc": 1.8, "vitamin_c": 12.0, "serving_size": "1 plate (250g)",
            "cost": 35.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Curd Rice (Thayir Sadam)", "category": "Dairy", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 210.0, "protein": 5.8, "iron": 0.4, "calcium": 180.0, "vitamin_d": 0.2, "vitamin_b12": 0.6, "magnesium": 22.0, "zinc": 0.7, "vitamin_c": 1.0, "serving_size": "1 plate (200g)",
            "cost": 20.0, "is_vegetarian": True, "is_vegan": False, "allergens": "[\"lactose\"]"
        },
        {
            "name": "Tomato Rasam with Ponni Rice & Dal", "category": "Pulse", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 280.0, "protein": 9.2, "iron": 3.1, "calcium": 75.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 78.0, "zinc": 1.6, "vitamin_c": 18.0, "serving_size": "1 plate (240g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Vazhaipoo Poriyal (Banana Blossom)", "category": "Vegetable", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 110.0, "protein": 4.5, "iron": 6.8, "calcium": 120.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 95.0, "zinc": 1.4, "vitamin_c": 10.0, "serving_size": "1 bowl (130g)",
            "cost": 22.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Paruppu Urundai Kuzhambu with Rice", "category": "Pulse", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 340.0, "protein": 13.2, "iron": 4.4, "calcium": 85.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 105.0, "zinc": 2.2, "vitamin_c": 8.0, "serving_size": "1 plate (250g)",
            "cost": 30.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Cabbage Chana Dal Kootu with Rice", "category": "Vegetable", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 290.0, "protein": 10.8, "iron": 3.4, "calcium": 110.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 92.0, "zinc": 1.9, "vitamin_c": 22.0, "serving_size": "1 plate (240g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Chettinad Kozhi Kuzhambu (Chicken Curry)", "category": "Meat", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 310.0, "protein": 25.0, "iron": 2.4, "calcium": 35.0, "vitamin_d": 0.4, "vitamin_b12": 0.8, "magnesium": 45.0, "zinc": 2.2, "vitamin_c": 6.0, "serving_size": "1 bowl (200g)",
            "cost": 65.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[]"
        },
        {
            "name": "Tamil Nadu Meen Kuzhambu (Fish Curry)", "category": "Seafood", "meal_type": "Lunch", "region": "Tamil Nadu",
            "calories": 270.0, "protein": 23.5, "iron": 2.1, "calcium": 180.0, "vitamin_d": 4.5, "vitamin_b12": 5.2, "magnesium": 52.0, "zinc": 1.8, "vitamin_c": 12.0, "serving_size": "1 bowl (200g)",
            "cost": 60.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[\"seafood\"]"
        },
        # Dinner
        {
            "name": "Kal Dosa with Tiffin Sambar", "category": "Grain", "meal_type": "Dinner", "region": "Tamil Nadu",
            "calories": 260.0, "protein": 7.2, "iron": 2.8, "calcium": 70.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 65.0, "zinc": 1.4, "vitamin_c": 6.0, "serving_size": "2 kal dosas (160g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Chapati with Chettinad Veg Kurma", "category": "Grain", "meal_type": "Dinner", "region": "Tamil Nadu",
            "calories": 310.0, "protein": 9.5, "iron": 3.6, "calcium": 65.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 85.0, "zinc": 1.9, "vitamin_c": 10.0, "serving_size": "2 chapatis + kurma (220g)",
            "cost": 30.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[\"gluten\"]"
        },
        {
            "name": "Ragi Kali with Keerai Masiyal", "category": "Grain", "meal_type": "Dinner", "region": "Tamil Nadu",
            "calories": 270.0, "protein": 7.8, "iron": 5.6, "calcium": 340.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 150.0, "zinc": 2.3, "vitamin_c": 20.0, "serving_size": "1 kali ball + keerai (240g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Sevai (Lemon & Curry Leaf Rice Noodles)", "category": "Grain", "meal_type": "Dinner", "region": "Tamil Nadu",
            "calories": 230.0, "protein": 4.8, "iron": 1.5, "calcium": 30.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 40.0, "zinc": 0.9, "vitamin_c": 15.0, "serving_size": "1 plate (180g)",
            "cost": 22.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Chettinad Mushroom Biryani", "category": "Vegetable", "meal_type": "Dinner", "region": "Tamil Nadu",
            "calories": 320.0, "protein": 8.5, "iron": 2.6, "calcium": 45.0, "vitamin_d": 4.8, "vitamin_b12": 0.0, "magnesium": 65.0, "zinc": 1.6, "vitamin_c": 8.0, "serving_size": "1 plate (250g)",
            "cost": 45.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Podi Dosa with Sambar", "category": "Grain", "meal_type": "Dinner", "region": "Tamil Nadu",
            "calories": 270.0, "protein": 7.5, "iron": 3.4, "calcium": 85.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 75.0, "zinc": 1.7, "vitamin_c": 4.0, "serving_size": "1 podi dosa (150g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        # Snacks
        {
            "name": "Black Gram Sundal (Urad Dal)", "category": "Pulse", "meal_type": "Snack", "region": "Tamil Nadu",
            "calories": 180.0, "protein": 11.2, "iron": 4.5, "calcium": 95.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 130.0, "zinc": 2.2, "vitamin_c": 5.0, "serving_size": "1 cup (100g)",
            "cost": 18.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Ellu Ladoo (Sesame Jaggery Balls)", "category": "Seeds/Nuts", "meal_type": "Snack", "region": "Tamil Nadu",
            "calories": 290.0, "protein": 6.5, "iron": 8.2, "calcium": 480.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 175.0, "zinc": 3.8, "vitamin_c": 0.0, "serving_size": "2 pieces (50g)",
            "cost": 15.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[\"nuts\"]"
        },
        {
            "name": "Kondakadalai Sundal (Spiced Kala Chana)", "category": "Pulse", "meal_type": "Snack", "region": "Tamil Nadu",
            "calories": 190.0, "protein": 10.5, "iron": 4.8, "calcium": 78.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 95.0, "zinc": 2.4, "vitamin_c": 6.0, "serving_size": "1 cup (110g)",
            "cost": 18.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Paruppu Vadai (Chana Dal Masala Vadai)", "category": "Pulse", "meal_type": "Snack", "region": "Tamil Nadu",
            "calories": 210.0, "protein": 8.5, "iron": 3.2, "calcium": 48.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 70.0, "zinc": 1.7, "vitamin_c": 3.0, "serving_size": "2 vadais (80g)",
            "cost": 16.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Masala Neer Mor (Spiced Buttermilk)", "category": "Dairy", "meal_type": "Snack", "region": "Tamil Nadu",
            "calories": 45.0, "protein": 2.2, "iron": 0.5, "calcium": 110.0, "vitamin_d": 0.1, "vitamin_b12": 0.4, "magnesium": 18.0, "zinc": 0.5, "vitamin_c": 4.0, "serving_size": "1 glass (220ml)",
            "cost": 10.0, "is_vegetarian": True, "is_vegan": False, "allergens": "[\"lactose\"]"
        },

        # --- KERALA ---
        {
            "name": "Mathi Curry (Kerala Sardine Curry)", "category": "Seafood", "meal_type": "Dinner", "region": "Kerala",
            "calories": 260.0, "protein": 22.4, "iron": 3.1, "calcium": 390.0, "vitamin_d": 6.2, "vitamin_b12": 9.5, "magnesium": 42.0, "zinc": 1.6, "vitamin_c": 8.0, "serving_size": "1 bowl (180g)",
            "cost": 60.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[\"seafood\"]"
        },
        {
            "name": "Ayala Fry (Mackerel)", "category": "Seafood", "meal_type": "Lunch", "region": "Kerala",
            "calories": 290.0, "protein": 21.0, "iron": 2.2, "calcium": 28.0, "vitamin_d": 9.8, "vitamin_b12": 11.2, "magnesium": 65.0, "zinc": 1.1, "vitamin_c": 2.0, "serving_size": "1 piece (150g)",
            "cost": 75.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[\"seafood\"]"
        },
        {
            "name": "Kappa & Meen Curry (Tapioca with Fish)", "category": "Regional Meal", "meal_type": "Lunch", "region": "Kerala",
            "calories": 380.0, "protein": 18.5, "iron": 2.8, "calcium": 120.0, "vitamin_d": 4.5, "vitamin_b12": 6.8, "magnesium": 58.0, "zinc": 1.3, "vitamin_c": 14.0, "serving_size": "1 plate (300g)",
            "cost": 70.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[\"seafood\"]"
        },
        {
            "name": "Nendran Pazham Steam", "category": "Fruit", "meal_type": "Breakfast", "region": "Kerala",
            "calories": 140.0, "protein": 1.6, "iron": 0.8, "calcium": 12.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 42.0, "zinc": 0.2, "vitamin_c": 18.0, "serving_size": "1 banana (120g)",
            "cost": 12.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Kadala Curry (Black Chickpea Curry)", "category": "Pulse", "meal_type": "Breakfast", "region": "Kerala",
            "calories": 220.0, "protein": 10.5, "iron": 4.8, "calcium": 78.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 88.0, "zinc": 2.4, "vitamin_c": 4.0, "serving_size": "1 bowl (180g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },

        # --- KARNATAKA ---
        {
            "name": "Jowar Rotti with Ennegayi", "category": "Grain", "meal_type": "Dinner", "region": "Karnataka",
            "calories": 310.0, "protein": 8.9, "iron": 4.2, "calcium": 45.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 145.0, "zinc": 2.0, "vitamin_c": 6.0, "serving_size": "2 rottis + curry (220g)",
            "cost": 30.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Huruli Saaru (Horse Gram Soup)", "category": "Pulse", "meal_type": "Lunch", "region": "Karnataka",
            "calories": 160.0, "protein": 9.8, "iron": 6.5, "calcium": 190.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 120.0, "zinc": 2.8, "vitamin_c": 8.0, "serving_size": "1 bowl (200ml)",
            "cost": 18.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Bisi Bele Bath with Boondi", "category": "Regional Meal", "meal_type": "Lunch", "region": "Karnataka",
            "calories": 340.0, "protein": 9.2, "iron": 2.9, "calcium": 64.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 78.0, "zinc": 1.6, "vitamin_c": 12.0, "serving_size": "1 plate (250g)",
            "cost": 35.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },

        # --- ANDHRA PRADESH ---
        {
            "name": "Gongura Pappu (Roselle Lentil Curry)", "category": "Vegetable", "meal_type": "Lunch", "region": "Andhra Pradesh",
            "calories": 190.0, "protein": 11.0, "iron": 5.8, "calcium": 210.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 110.0, "zinc": 1.9, "vitamin_c": 35.0, "serving_size": "1 bowl (180g)",
            "cost": 22.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Roasted Palli (Groundnut Chutney)", "category": "Seeds/Nuts", "meal_type": "Breakfast", "region": "Andhra Pradesh",
            "calories": 280.0, "protein": 12.4, "iron": 2.8, "calcium": 58.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 95.0, "zinc": 2.1, "vitamin_c": 2.0, "serving_size": "2 tbsp (60g)",
            "cost": 15.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[\"peanut\"]"
        },
        {
            "name": "Pesarattu (Green Gram Dosa)", "category": "Pulse", "meal_type": "Breakfast", "region": "Andhra Pradesh",
            "calories": 260.0, "protein": 13.5, "iron": 4.1, "calcium": 75.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 115.0, "zinc": 2.5, "vitamin_c": 6.0, "serving_size": "2 pesarattus (160g)",
            "cost": 28.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },

        # --- MAHARASHTRA ---
        {
            "name": "Rajgira Thalipeeth (Amaranth)", "category": "Grain", "meal_type": "Breakfast", "region": "Maharashtra",
            "calories": 270.0, "protein": 9.5, "iron": 6.8, "calcium": 180.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 190.0, "zinc": 2.4, "vitamin_c": 1.0, "serving_size": "2 thalipeeth (140g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Bajra Bhakri with Pithla", "category": "Grain", "meal_type": "Dinner", "region": "Maharashtra",
            "calories": 320.0, "protein": 11.5, "iron": 7.2, "calcium": 85.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 140.0, "zinc": 2.9, "vitamin_c": 4.0, "serving_size": "1 bhakri + pithla (220g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Matki Usal (Sprouted Moth Beans)", "category": "Pulse", "meal_type": "Lunch", "region": "Maharashtra",
            "calories": 210.0, "protein": 14.0, "iron": 5.9, "calcium": 92.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 125.0, "zinc": 3.1, "vitamin_c": 15.0, "serving_size": "1 bowl (180g)",
            "cost": 20.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },

        # --- NORTH INDIA ---
        {
            "name": "Sarson ka Saag & Makki Roti", "category": "Vegetable", "meal_type": "Dinner", "region": "North India",
            "calories": 290.0, "protein": 7.8, "iron": 4.6, "calcium": 210.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 95.0, "zinc": 1.8, "vitamin_c": 38.0, "serving_size": "1 bowl + 2 rotis (250g)",
            "cost": 40.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Palak Paneer with Atta Roti", "category": "Dairy", "meal_type": "Dinner", "region": "North India",
            "calories": 360.0, "protein": 16.5, "iron": 3.8, "calcium": 460.0, "vitamin_d": 0.4, "vitamin_b12": 0.9, "magnesium": 110.0, "zinc": 2.2, "vitamin_c": 22.0, "serving_size": "1 bowl + 2 rotis (280g)",
            "cost": 50.0, "is_vegetarian": True, "is_vegan": False, "allergens": "[\"lactose\", \"gluten\"]"
        },
        {
            "name": "Fortified Cow Milk with Almonds", "category": "Dairy", "meal_type": "Snack", "region": "North India",
            "calories": 180.0, "protein": 8.5, "iron": 0.8, "calcium": 280.0, "vitamin_d": 3.0, "vitamin_b12": 0.9, "magnesium": 65.0, "zinc": 1.2, "vitamin_c": 1.5, "serving_size": "1 glass (220ml)",
            "cost": 22.0, "is_vegetarian": True, "is_vegan": False, "allergens": "[\"lactose\", \"nuts\"]"
        },
        {
            "name": "Kabuli Chana Masala (Chickpeas)", "category": "Pulse", "meal_type": "Lunch", "region": "North India",
            "calories": 280.0, "protein": 13.8, "iron": 5.4, "calcium": 95.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 105.0, "zinc": 2.7, "vitamin_c": 8.0, "serving_size": "1 bowl (200g)",
            "cost": 25.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },

        # --- PAN-INDIAN / NATIONAL ESSENTIALS ---
        {
            "name": "Palak Dal (Spinach Lentil Soup)", "category": "Pulse", "meal_type": "Lunch", "region": "National",
            "calories": 190.0, "protein": 12.0, "iron": 4.8, "calcium": 120.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 105.0, "zinc": 2.1, "vitamin_c": 25.0, "serving_size": "1 bowl (200g)",
            "cost": 18.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Boiled Eggs with Black Pepper", "category": "Egg", "meal_type": "Breakfast", "region": "National",
            "calories": 150.0, "protein": 12.8, "iron": 1.9, "calcium": 58.0, "vitamin_d": 2.2, "vitamin_b12": 1.2, "magnesium": 14.0, "zinc": 1.4, "vitamin_c": 0.0, "serving_size": "2 eggs (100g)",
            "cost": 14.0, "is_vegetarian": True, "is_vegan": False, "allergens": "[\"egg\"]"
        },
        {
            "name": "Chicken Curry (Lean Breast)", "category": "Meat", "meal_type": "Dinner", "region": "National",
            "calories": 240.0, "protein": 26.5, "iron": 1.6, "calcium": 25.0, "vitamin_d": 0.2, "vitamin_b12": 0.5, "magnesium": 35.0, "zinc": 1.8, "vitamin_c": 4.0, "serving_size": "1 bowl (200g)",
            "cost": 65.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[]"
        },
        {
            "name": "Rohu Fish Curry", "category": "Seafood", "meal_type": "Lunch", "region": "National",
            "calories": 210.0, "protein": 22.0, "iron": 1.4, "calcium": 520.0, "vitamin_d": 1.8, "vitamin_b12": 2.1, "magnesium": 38.0, "zinc": 1.2, "vitamin_c": 3.0, "serving_size": "1 bowl (200g)",
            "cost": 55.0, "is_vegetarian": False, "is_vegan": False, "allergens": "[\"seafood\"]"
        },
        {
            "name": "Tofu Palak Bhurji", "category": "Pulse", "meal_type": "Dinner", "region": "National",
            "calories": 170.0, "protein": 11.5, "iron": 4.8, "calcium": 280.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 62.0, "zinc": 1.4, "vitamin_c": 18.0, "serving_size": "1 bowl (180g)",
            "cost": 30.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[\"soy\"]"
        },
        {
            "name": "Button Mushroom Masala", "category": "Vegetable", "meal_type": "Dinner", "region": "National",
            "calories": 120.0, "protein": 4.2, "iron": 1.1, "calcium": 18.0, "vitamin_d": 6.8, "vitamin_b12": 0.0, "magnesium": 22.0, "zinc": 0.9, "vitamin_c": 6.0, "serving_size": "1 bowl (150g)",
            "cost": 35.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Fresh Guava & Citrus Slice", "category": "Fruit", "meal_type": "Snack", "region": "National",
            "calories": 70.0, "protein": 2.5, "iron": 0.3, "calcium": 18.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 22.0, "zinc": 0.2, "vitamin_c": 228.0, "serving_size": "1 fruit (150g)",
            "cost": 10.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[]"
        },
        {
            "name": "Almonds & Walnut Mix", "category": "Seeds/Nuts", "meal_type": "Snack", "region": "National",
            "calories": 290.0, "protein": 9.5, "iron": 1.8, "calcium": 130.0, "vitamin_d": 0.0, "vitamin_b12": 0.0, "magnesium": 135.0, "zinc": 1.6, "vitamin_c": 0.0, "serving_size": "1 handful (40g)",
            "cost": 40.0, "is_vegetarian": True, "is_vegan": True, "allergens": "[\"nuts\"]"
        }
    ]
    
    for food in foods:
        f_item = FoodItem(
            name=food["name"], category=food["category"], meal_type=food["meal_type"], region=food["region"],
            calories=food["calories"], protein=food["protein"], iron=food["iron"],
            calcium=food["calcium"], vitamin_d=food["vitamin_d"], vitamin_b12=food["vitamin_b12"],
            magnesium=food["magnesium"], zinc=food["zinc"], vitamin_c=food["vitamin_c"],
            serving_size=food["serving_size"], cost=food["cost"],
            is_vegetarian=food["is_vegetarian"], is_vegan=food["is_vegan"], allergens=food["allergens"]
        )
        db.add(f_item)
        
    # 3. Seeding Nutrient Interactions
    interactions = [
        {
            "nutrient": "Iron", "enhancer_or_inhibitor": "enhancer", "interacting_food_or_nutrient": "Vitamin C (Ascorbic Acid)",
            "description": "Consuming Vitamin C-rich foods (e.g. lemon, citrus fruits, tomatoes) along with non-heme iron sources converts ferric iron to the more absorbable ferrous state, lifting iron absorption by 2 to 3-fold.",
            "reference": "World Health Organization (WHO) Guidelines on Nutritional Anemia Prevention"
        },
        {
            "nutrient": "Iron", "enhancer_or_inhibitor": "inhibitor", "interacting_food_or_nutrient": "Tannins in Tea / Coffee",
            "description": "Polyphenols (tannins) present in tea and coffee securely chelate non-heme iron in the digestive tract, rendering it insoluble. Avoid drinking tea/coffee within 1 hour of meals.",
            "reference": "American Journal of Clinical Nutrition (AJCN) Iron Intake Interaction Studies"
        },
        {
            "nutrient": "Calcium", "enhancer_or_inhibitor": "enhancer", "interacting_food_or_nutrient": "Vitamin D",
            "description": "Vitamin D is biologically mandatory for calcium uptake in the intestines. It regulates the binding proteins responsible for active transport, dramatically boosting calcium absorption efficiency.",
            "reference": "National Institutes of Health (NIH) Osteoporosis and Calcium Dietary Guide"
        },
        {
            "nutrient": "Iron", "enhancer_or_inhibitor": "inhibitor", "interacting_food_or_nutrient": "Calcium",
            "description": "Very high calcium presence during an iron-rich meal conflicts for entry pathways and decreases both non-heme and heme iron absorption rates.",
            "reference": "Journal of Nutritional Biochemistry, Calcium-Iron Mineral Competition Review"
        },
        {
            "nutrient": "Zinc", "enhancer_or_inhibitor": "inhibitor", "interacting_food_or_nutrient": "Phytates in Unrefined Grains",
            "description": "Phytic acid, highly prevalent in unfermented grains and dry legumes, binds zinc (and iron) forming strong insoluble structures that the human body cannot disassemble.",
            "reference": "Food and Agriculture Organization (FAO) Mineral Bioavailability Studies"
        },
        {
            "nutrient": "Zinc", "enhancer_or_inhibitor": "enhancer", "interacting_food_or_nutrient": "Dietary Protein",
            "description": "Animal and high-solubility legume proteins decompose into specific amino acids (like histidine and cysteine) that form easily soluble complexes with zinc, facilitating absorption.",
            "reference": "FAO/WHO Human Vitamin and Mineral Requirement Consensus Report"
        }
    ]
    
    for inter in interactions:
        row = FoodInteraction(
            nutrient=inter["nutrient"], enhancer_or_inhibitor=inter["enhancer_or_inhibitor"],
            interacting_food_or_nutrient=inter["interacting_food_or_nutrient"],
            description=inter["description"], reference=inter["reference"]
        )
        db.add(row)

    db.commit()
    print(f"Seeded {len(foods)} expanded food items and {len(interactions)} interaction records into SQLite.")
    db.close()

if __name__ == "__main__":
    seed_database()
