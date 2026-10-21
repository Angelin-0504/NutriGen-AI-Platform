import os
import numpy as np
import pandas as pd

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def generate_nhanes_simulated_data(num_samples=6000, random_seed=42):
    np.random.seed(random_seed)
    
    # 1. Demographics
    age = np.random.randint(12, 85, size=num_samples)
    gender = np.random.choice(["Male", "Female"], size=num_samples, p=[0.49, 0.51])
    region = np.random.choice(["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Maharashtra", "North India"], size=num_samples)
    diet_type = np.random.choice(["Vegetarian", "Vegan", "Non-Vegetarian"], size=num_samples, p=[0.35, 0.05, 0.60])
    
    weight = np.random.normal(68, 15, size=num_samples)
    height = np.random.normal(165, 10, size=num_samples) / 100.0  # meters
    weight = np.clip(weight, 40, 130)
    height = np.clip(height, 1.4, 2.0)
    bmi = weight / (height ** 2)
    
    daily_food_budget = np.random.normal(180, 70, size=num_samples)
    daily_food_budget = np.clip(daily_food_budget, 80, 500)
    
    # 2. Lifestyle/Exposure Factors
    sun_exposure = np.random.choice(["Low", "Medium", "High"], size=num_samples, p=[0.40, 0.40, 0.20])
    activity_level = np.random.choice(["Sedentary", "Light", "Moderate", "Active"], size=num_samples, p=[0.35, 0.35, 0.20, 0.10])
    alcohol_abuse = np.random.choice([0, 1], size=num_samples, p=[0.85, 0.15])
    excessive_tea_coffee = np.random.choice([0, 1], size=num_samples, p=[0.60, 0.40])
    high_phytate_diet = np.random.choice([0, 1], size=num_samples, p=[0.50, 0.50])
    
    # 3. Dietary Intake Flags
    low_iron_diet = np.zeros(num_samples)
    low_vitamin_d_diet = np.zeros(num_samples)
    low_vitamin_b12_diet = np.zeros(num_samples)
    low_calcium_diet = np.zeros(num_samples)
    low_magnesium_diet = np.zeros(num_samples)
    low_zinc_diet = np.zeros(num_samples)
    
    for i in range(num_samples):
        p_low_iron = 0.82 if diet_type[i] in ["Vegetarian", "Vegan"] else 0.14
        p_low_b12 = 0.96 if diet_type[i] == "Vegan" else (0.72 if diet_type[i] == "Vegetarian" else 0.06)
        p_low_calcium = 0.91 if diet_type[i] == "Vegan" else 0.22
        p_low_d = 0.91 if sun_exposure[i] == "Low" else (0.52 if sun_exposure[i] == "Medium" else 0.04)
        p_budget_modifier = 0.38 if daily_food_budget[i] < 120 else 0.0
        
        low_iron_diet[i] = np.random.binomial(1, min(p_low_iron + p_budget_modifier, 0.98))
        low_vitamin_b12_diet[i] = np.random.binomial(1, min(p_low_b12, 0.99))
        low_calcium_diet[i] = np.random.binomial(1, min(p_low_calcium + p_budget_modifier, 0.98))
        low_vitamin_d_diet[i] = np.random.binomial(1, p_low_d)
        low_magnesium_diet[i] = np.random.binomial(1, min(0.35 + p_budget_modifier, 0.90))
        low_zinc_diet[i] = np.random.binomial(1, min(0.20 + (0.40 if diet_type[i] == "Vegan" else 0) + p_budget_modifier, 0.95))

    # 4. Symptoms
    fatigue = np.zeros(num_samples)
    pale_skin = np.zeros(num_samples)
    hair_loss = np.zeros(num_samples)
    weak_nails = np.zeros(num_samples)
    bone_pain = np.zeros(num_samples)
    muscle_weakness = np.zeros(num_samples)
    muscle_cramps = np.zeros(num_samples)
    brittle_hair = np.zeros(num_samples)
    frequent_infections = np.zeros(num_samples)
    numbness_tingling = np.zeros(num_samples)

    for i in range(num_samples):
        p_fatigue = min(0.04 + 0.78 * low_iron_diet[i] + 0.25 * low_vitamin_b12_diet[i], 0.97)
        p_pale = min(0.04 + 0.88 * low_iron_diet[i], 0.97)
        p_hair = min(0.04 + 0.82 * low_zinc_diet[i] + 0.2 * low_iron_diet[i], 0.97)
        p_nails = min(0.04 + 0.78 * low_iron_diet[i] + 0.25 * low_calcium_diet[i], 0.97)
        p_bone = min(0.04 + 0.88 * low_vitamin_d_diet[i] + 0.20 * low_calcium_diet[i], 0.97)
        p_weakness = min(0.04 + 0.78 * low_vitamin_d_diet[i] + 0.25 * low_magnesium_diet[i], 0.97)
        p_cramps = min(0.04 + 0.72 * low_calcium_diet[i] + 0.35 * low_magnesium_diet[i], 0.97)
        p_brittle = min(0.04 + 0.92 * low_zinc_diet[i], 0.97)
        p_infections = min(0.04 + 0.82 * low_zinc_diet[i] + 0.20 * low_vitamin_d_diet[i], 0.97)
        p_numbness = min(0.04 + 0.92 * low_vitamin_b12_diet[i], 0.97)
        
        fatigue[i] = np.random.binomial(1, p_fatigue)
        pale_skin[i] = np.random.binomial(1, p_pale)
        hair_loss[i] = np.random.binomial(1, p_hair)
        weak_nails[i] = np.random.binomial(1, p_nails)
        bone_pain[i] = np.random.binomial(1, p_bone)
        muscle_weakness[i] = np.random.binomial(1, p_weakness)
        muscle_cramps[i] = np.random.binomial(1, p_cramps)
        brittle_hair[i] = np.random.binomial(1, p_brittle)
        frequent_infections[i] = np.random.binomial(1, p_infections)
        numbness_tingling[i] = np.random.binomial(1, p_numbness)

    # 5. Diagnostic Logits
    score_iron = 5.0 * low_iron_diet + 4.0 * pale_skin + 3.2 * fatigue + 2.8 * weak_nails + 2.0 * (gender == "Female").astype(int) * (age < 50).astype(int) + 1.5 * excessive_tea_coffee - 5.0
    score_d = 5.5 * low_vitamin_d_diet + 4.5 * (sun_exposure == "Low").astype(int) + 4.0 * bone_pain + 3.5 * muscle_weakness - 5.5
    score_b12 = 6.0 * low_vitamin_b12_diet + 4.5 * numbness_tingling + 3.5 * (diet_type == "Vegan").astype(int) + 3.0 * fatigue - 5.5
    score_calcium = 5.5 * low_calcium_diet + 4.0 * muscle_cramps + 3.5 * bone_pain + 3.0 * weak_nails - 5.5
    score_magnesium = 5.2 * low_magnesium_diet + 4.0 * muscle_cramps + 3.5 * muscle_weakness + 2.5 * alcohol_abuse - 5.2
    score_zinc = 5.5 * low_zinc_diet + 4.2 * brittle_hair + 3.5 * frequent_infections + 3.0 * hair_loss + 2.0 * high_phytate_diet - 5.5

    def score_to_label(score, noise_level=0.002):
        prob = sigmoid(score)
        return (np.random.rand(len(score)) < (prob * (1 - 2*noise_level) + noise_level)).astype(int)

    iron_deficiency = score_to_label(score_iron)
    vitamin_d_deficiency = score_to_label(score_d)
    vitamin_b12_deficiency = score_to_label(score_b12)
    calcium_deficiency = score_to_label(score_calcium)
    magnesium_deficiency = score_to_label(score_magnesium)
    zinc_deficiency = score_to_label(score_zinc)

    df = pd.DataFrame({
        "age": age,
        "gender": gender,
        "region": region,
        "diet_type": diet_type,
        "bmi": bmi,
        "daily_food_budget": daily_food_budget,
        "sun_exposure": sun_exposure,
        "activity_level": activity_level,
        "alcohol_abuse": alcohol_abuse,
        "excessive_tea_coffee": excessive_tea_coffee,
        "high_phytate_diet": high_phytate_diet,
        "low_iron_diet": low_iron_diet,
        "low_vitamin_d_diet": low_vitamin_d_diet,
        "low_vitamin_b12_diet": low_vitamin_b12_diet,
        "low_calcium_diet": low_calcium_diet,
        "low_magnesium_diet": low_magnesium_diet,
        "low_zinc_diet": low_zinc_diet,
        "fatigue": fatigue.astype(int),
        "pale_skin": pale_skin.astype(int),
        "hair_loss": hair_loss.astype(int),
        "weak_nails": weak_nails.astype(int),
        "bone_pain": bone_pain.astype(int),
        "muscle_weakness": muscle_weakness.astype(int),
        "muscle_cramps": muscle_cramps.astype(int),
        "brittle_hair": brittle_hair.astype(int),
        "frequent_infections": frequent_infections.astype(int),
        "numbness_tingling": numbness_tingling.astype(int),
        "iron_deficiency": iron_deficiency,
        "vitamin_d_deficiency": vitamin_d_deficiency,
        "vitamin_b12_deficiency": vitamin_b12_deficiency,
        "calcium_deficiency": calcium_deficiency,
        "magnesium_deficiency": magnesium_deficiency,
        "zinc_deficiency": zinc_deficiency
    })
    
    return df

if __name__ == "__main__":
    os.makedirs("data/processed", exist_ok=True)
    df = generate_nhanes_simulated_data()
    df.to_csv("data/processed/nhanes_data.csv", index=False)
    print(f"Dataset regenerated successfully. Shape: {df.shape}")
