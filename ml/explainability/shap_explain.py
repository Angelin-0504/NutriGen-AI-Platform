import pickle
import pandas as pd
import numpy as np
import json
import os

try:
    import shap
    SHAP_AVAILABLE = True
except (ImportError, Exception) as _shap_err:
    shap = None
    SHAP_AVAILABLE = False
    print(f"[NutriGenExplainer] Note: SHAP C-extensions/numba unavailable in this environment ({_shap_err}). Using native Tree Feature Attribution fallback.")

class NutriGenExplainer:
    def __init__(self, models_path="backend/models/best_models.pkl", preprocessor_path="backend/models/preprocessor.pkl", metadata_path="backend/models/metadata.json"):
        # Resolve paths
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        if not os.path.isabs(models_path):
            models_path = os.path.join(base_dir, models_path)
        if not os.path.isabs(preprocessor_path):
            preprocessor_path = os.path.join(base_dir, preprocessor_path)
        if not os.path.isabs(metadata_path):
            metadata_path = os.path.join(base_dir, metadata_path)
            
        with open(models_path, "rb") as f:
            self.models = pickle.load(f)
        with open(preprocessor_path, "rb") as f:
            self.preprocessor = pickle.load(f)
        with open(metadata_path, "r") as f:
            self.metadata = json.load(f)
            
        self.targets = self.metadata["targets"]
        
        # Prefer exact fitted preprocessor feature names (54 features)
        if hasattr(self.preprocessor, "get_feature_names_out"):
            try:
                self.feature_names = list(self.preprocessor.get_feature_names_out())
            except Exception:
                self.feature_names = self.metadata["features"]["transformed"]
        else:
            self.feature_names = self.metadata["features"]["transformed"]
        
        # Load XGBoost model if available as a dedicated tree explainer source
        xgb_path = os.path.join(os.path.dirname(models_path), "xgboost_model.pkl")
        self.tree_models = {}
        xgb_models = None
        if os.path.exists(xgb_path):
            try:
                with open(xgb_path, "rb") as f:
                    xgb_models = pickle.load(f)
            except Exception:
                xgb_models = None
        
        # Build explainers for each target
        self.explainers = {}
        for target in self.targets:
            tree_model = None
            if xgb_models and target in xgb_models:
                tree_model = xgb_models[target]
            else:
                model = self.models.get(target)
                if hasattr(model, "named_estimators_"):
                    if "xgb" in model.named_estimators_:
                        tree_model = model.named_estimators_["xgb"]
                    elif "rf" in model.named_estimators_:
                        tree_model = model.named_estimators_["rf"]
                    else:
                        tree_model = list(model.named_estimators_.values())[0]
                else:
                    tree_model = model
            
            self.tree_models[target] = tree_model
            
            if SHAP_AVAILABLE and shap is not None:
                try:
                    self.explainers[target] = shap.TreeExplainer(tree_model)
                except Exception as e:
                    print(f"[NutriGenExplainer] TreeExplainer skipped for {target}: {e}")

    def _ensure_features(self, df_input):
        df = df_input.copy()
        if "age_bmi_ratio" not in df.columns:
            df["age_bmi_ratio"] = df["age"] / (df["bmi"] + 1e-5)
        if "budget_per_bmi" not in df.columns:
            df["budget_per_bmi"] = df["daily_food_budget"] / (df["bmi"] + 1e-5)
        if "bmi_sq" not in df.columns:
            df["bmi_sq"] = df["bmi"] ** 2
        if "age_sq" not in df.columns:
            df["age_sq"] = df["age"] ** 2
            
        sun_map = {"Low": 0, "Medium": 1, "High": 2}
        if "sun_score" not in df.columns:
            df["sun_score"] = df["sun_exposure"].map(sun_map).fillna(1)
            
        act_map = {"Sedentary": 0, "Light": 1, "Moderate": 2, "Active": 3, "Low": 0, "High": 3}
        if "act_score" not in df.columns:
            df["act_score"] = df["activity_level"].map(act_map).fillna(1)
            
        symptom_cols = [
            "fatigue", "pale_skin", "hair_loss", "weak_nails", "bone_pain",
            "muscle_weakness", "muscle_cramps", "brittle_hair", "frequent_infections",
            "numbness_tingling"
        ]
        for c in symptom_cols:
            if c not in df.columns:
                df[c] = 0
        if "symptom_count" not in df.columns:
            df["symptom_count"] = df[symptom_cols].sum(axis=1)
        if "symptom_ratio" not in df.columns:
            df["symptom_ratio"] = df["symptom_count"] / 10.0
            
        dietary_cols = [
            "low_iron_diet", "low_vitamin_d_diet", "low_vitamin_b12_diet",
            "low_calcium_diet", "low_magnesium_diet", "low_zinc_diet"
        ]
        for c in dietary_cols:
            if c not in df.columns:
                df[c] = 0
        if "dietary_risk_count" not in df.columns:
            df["dietary_risk_count"] = df[dietary_cols].sum(axis=1)
            
        lifestyle_cols = ["alcohol_abuse", "excessive_tea_coffee", "high_phytate_diet"]
        for c in lifestyle_cols:
            if c not in df.columns:
                df[c] = 0
        if "lifestyle_risk_index" not in df.columns:
            df["lifestyle_risk_index"] = df[lifestyle_cols].sum(axis=1)
            
        if "nutritional_vulnerability" not in df.columns:
            df["nutritional_vulnerability"] = df["dietary_risk_count"] * (df["lifestyle_risk_index"] + 1)
            
        diet_val = df["diet_type"].iloc[0] if ("diet_type" in df.columns and len(df) > 0) else "Vegetarian"
        if "iron_anemia_composite" not in df.columns:
            df["iron_anemia_composite"] = df["low_iron_diet"] * 2 + df["pale_skin"] * 2 + df["fatigue"] + df["weak_nails"] + df["excessive_tea_coffee"]
        if "vitd_bone_composite" not in df.columns:
            df["vitd_bone_composite"] = df["low_vitamin_d_diet"] * 2 + df["bone_pain"] * 2 + df["muscle_weakness"] + (df["sun_score"] == 0).astype(int) * 2
        if "b12_neuro_composite" not in df.columns:
            df["b12_neuro_composite"] = df["low_vitamin_b12_diet"] * 2 + df["numbness_tingling"] * 3 + df["fatigue"] + int(diet_val == "Vegan") * 2
        if "calcium_composite" not in df.columns:
            df["calcium_composite"] = df["low_calcium_diet"] * 2 + df["muscle_cramps"] * 2 + df["bone_pain"]
        if "magnesium_composite" not in df.columns:
            df["magnesium_composite"] = df["low_magnesium_diet"] * 2 + df["muscle_cramps"] * 2 + df["alcohol_abuse"] * 2 + df["fatigue"]
        if "zinc_composite" not in df.columns:
            df["zinc_composite"] = df["low_zinc_diet"] * 2 + df["frequent_infections"] * 2 + df["high_phytate_diet"] * 2 + df["hair_loss"]
            
        if "iron_vitd_synergy" not in df.columns:
            df["iron_vitd_synergy"] = df["iron_anemia_composite"] * df["vitd_bone_composite"]
        if "neuro_spasm_synergy" not in df.columns:
            df["neuro_spasm_synergy"] = df["b12_neuro_composite"] * df["magnesium_composite"]
            
        return df

    def _check_user_provided(self, clean_name: str, user_raw: dict):
        """Differentiates features reported in user profile vs baseline/unprovided."""
        if clean_name in ["age", "bmi", "daily_food_budget"]:
            val = user_raw.get(clean_name)
            return True, f"Reported: {val}" if val is not None else "Provided in profile"
        if clean_name.startswith("gender"):
            return True, f"Reported: {user_raw.get('gender', 'Provided')}"
        if clean_name.startswith("region"):
            return True, f"Reported: {user_raw.get('region', 'Provided')}"
        if clean_name.startswith("diet_type"):
            return True, f"Reported: {user_raw.get('diet_type', 'Provided')}"
        if clean_name.startswith("sun_exposure") or clean_name == "sun_score":
            return True, f"Reported: {user_raw.get('sun_exposure', 'Provided')}"
        if clean_name.startswith("activity_level") or clean_name == "act_score":
            return True, f"Reported: {user_raw.get('activity_level', 'Provided')}"

        symptoms_list = [
            "fatigue", "pale_skin", "hair_loss", "weak_nails", "bone_pain",
            "muscle_weakness", "muscle_cramps", "brittle_hair", "frequent_infections",
            "numbness_tingling"
        ]
        if clean_name in symptoms_list:
            is_reported = bool(user_raw.get(clean_name, 0))
            if is_reported:
                return True, "Reported symptom in profile"
            else:
                return True, "Absence noted (not reported)"

        if clean_name.startswith("low_") and clean_name.endswith("_diet"):
            is_diet_risk = bool(user_raw.get(clean_name, 0))
            if is_diet_risk:
                return True, "Derived from reported diet"
            else:
                return True, "Adequate dietary intake reported"

        if clean_name in ["excessive_tea_coffee", "alcohol_abuse", "high_phytate_diet"]:
            is_active = bool(user_raw.get(clean_name, 0))
            if is_active:
                return True, "Reported lifestyle habit"
            else:
                return True, "Not reported in lifestyle"

        if any(c in clean_name for c in ["composite", "interaction", "synergy", "count", "ratio", "vulnerability"]):
            return True, "Derived from your profile data"

        return False, "Not provided in profile"

    def _generate_plain_reasons(self, target: str, top_features: list, user_raw: dict):
        """Generates concise, plain-English explanation sentences for the top factors."""
        reasons = []
        nut_clean = target.replace("_deficiency", "").replace("_", " ").title()

        symptom_labels = {
            "fatigue": "fatigue",
            "pale_skin": "pale skin",
            "hair_loss": "hair loss",
            "weak_nails": "weak or brittle nails",
            "bone_pain": "bone or joint aches",
            "muscle_weakness": "muscle weakness",
            "muscle_cramps": "frequent muscle cramps",
            "brittle_hair": "brittle hair",
            "frequent_infections": "frequent infections",
            "numbness_tingling": "numbness or tingling"
        }

        diet_map = {
            "iron_deficiency": ("low_iron_diet", "iron"),
            "vitamin_d_deficiency": ("low_vitamin_d_diet", "vitamin D"),
            "vitamin_b12_deficiency": ("low_vitamin_b12_diet", "vitamin B12"),
            "calcium_deficiency": ("low_calcium_diet", "calcium"),
            "magnesium_deficiency": ("low_magnesium_diet", "magnesium"),
            "zinc_deficiency": ("low_zinc_diet", "zinc")
        }

        for feat in top_features:
            fname = feat["feature"]
            val = feat["shap_value"]
            direction = feat["direction"]

            # 1. Reported Diet Risk
            if target in diet_map and diet_map[target][0] in fname:
                nut_name = diet_map[target][1]
                if direction == "increases_risk":
                    reasons.append(f"Low reported {nut_name} intake contributed to a higher predicted risk.")
                else:
                    reasons.append(f"Sufficient reported {nut_name} intake contributed to a lower predicted risk.")
                continue

            # 2. Symptoms
            matched_sym = None
            for sym_key in symptom_labels:
                if sym_key in fname:
                    matched_sym = sym_key
                    break
            if matched_sym:
                sym_name = symptom_labels[matched_sym]
                is_reported = bool(user_raw.get(matched_sym, 0))
                if is_reported and direction == "increases_risk":
                    reasons.append(f"Reported {sym_name} contributed to a higher predicted risk.")
                elif not is_reported and direction == "decreases_risk":
                    reasons.append(f"Absence of reported {sym_name} contributed to a lower predicted risk.")
                continue

            # 3. Sunlight
            if "sun" in fname:
                sun_val = user_raw.get("sun_exposure", "Medium")
                if direction == "increases_risk" or sun_val == "Low":
                    reasons.append("Low sunlight exposure contributed to a higher predicted risk.")
                elif direction == "decreases_risk":
                    reasons.append("Adequate sunlight exposure contributed to a lower predicted risk.")
                continue

            # 4. Tea / Coffee
            if "tea_coffee" in fname:
                if bool(user_raw.get("excessive_tea_coffee", 0)) and direction == "increases_risk":
                    reasons.append("Reported frequent tea or coffee intake contributed to a higher predicted risk.")
                continue

            # 5. Diet pattern
            if "diet_type" in fname:
                diet_val = user_raw.get("diet_type", "Vegetarian")
                if "Vegan" in fname and diet_val == "Vegan":
                    reasons.append("Plant-only (vegan) dietary pattern contributed to a higher predicted risk.")
                elif "Vegetarian" in fname and diet_val == "Vegetarian":
                    reasons.append("Vegetarian dietary pattern influenced the model prediction.")
                elif direction == "decreases_risk":
                    reasons.append(f"Reported {diet_val} diet contributed to a lower predicted risk.")
                continue

            # 6. Physical activity
            if "activity" in fname or "act_score" in fname:
                act_val = user_raw.get("activity_level", "Moderate")
                if direction == "increases_risk" or act_val in ["Low", "Sedentary"]:
                    reasons.append("Low physical activity routine contributed to a higher predicted risk.")
                elif direction == "decreases_risk":
                    reasons.append("Active daily lifestyle contributed to a lower predicted risk.")
                continue

            # 7. Alcohol
            if "alcohol" in fname:
                if bool(user_raw.get("alcohol_abuse", 0)) and direction == "increases_risk":
                    reasons.append("Reported alcohol usage contributed to a higher predicted risk.")
                continue

            # 8. Phytate
            if "phytate" in fname:
                if bool(user_raw.get("high_phytate_diet", 0)) and direction == "increases_risk":
                    reasons.append("Diet high in phytates (unsoaked grains/pulses) contributed to a higher predicted risk.")
                continue

            # 9. Composites
            if "composite" in fname or "synergy" in fname or "anemia" in fname:
                if direction == "increases_risk":
                    reasons.append(f"Combined clinical markers in your profile contributed to an elevated {nut_clean} risk.")
                else:
                    reasons.append(f"Overall indicator balance contributed to a lower {nut_clean} risk.")
                continue

            if len(reasons) >= 3:
                break

        # Fallback if no specific reasons matched
        if not reasons:
            reasons.append(f"Reported dietary profile and demographics influenced the model's {nut_clean} prediction.")
            reasons.append("No isolated severe symptom was identified as a dominant risk contributor.")

        # Ensure no duplicates while preserving order
        unique_reasons = []
        for r in reasons:
            if r not in unique_reasons:
                unique_reasons.append(r)

        return unique_reasons[:3]

    def explain_sample(self, X_raw_df, predictions=None, user_raw=None):
        df_prepared = self._ensure_features(X_raw_df)
        X_trans = self.preprocessor.transform(df_prepared)
        if hasattr(X_trans, "toarray"):
            X_trans = X_trans.toarray()
            
        if user_raw is None and len(X_raw_df) > 0:
            user_raw = X_raw_df.iloc[0].to_dict()
        elif user_raw is None:
            user_raw = {}
            
        explanations = {}
        for target in self.targets:
            val = None
            tree_model = self.tree_models.get(target)
            
            # Try SHAP explainer first if available
            if SHAP_AVAILABLE and target in self.explainers:
                try:
                    explainer = self.explainers[target]
                    shap_values = explainer.shap_values(X_trans)
                    if isinstance(shap_values, list):
                        val = shap_values[1] if len(shap_values) > 1 else shap_values[0]
                    else:
                        val = shap_values
                    if len(val.shape) == 2:
                        val = val[0]
                except Exception as e:
                    print(f"[NutriGenExplainer] TreeExplainer skipped for {target}: {e}")
                    val = None
            
            # Fallback to feature importance attribution
            if val is None:
                imp = getattr(tree_model, "feature_importances_", None)
                if imp is None and hasattr(tree_model, "named_estimators_"):
                    sub = tree_model.named_estimators_.get("xgb") or tree_model.named_estimators_.get("rf")
                    imp = getattr(sub, "feature_importances_", None)
                
                x_row = X_trans[0] if len(X_trans.shape) > 1 else X_trans
                if imp is not None and len(imp) == len(x_row):
                    val_list = []
                    for v_val, imp_w in zip(x_row, imp):
                        dir_factor = 1.0 if v_val > 0.05 else -0.3
                        val_list.append(float(abs(v_val) * imp_w * dir_factor))
                    val = np.array(val_list)
                else:
                    val = np.zeros(len(self.feature_names))

            # Determine predicted risk percentage & category
            pred_prob = None
            if predictions and target in predictions:
                pred_prob = float(predictions[target])
            elif target in self.models:
                try:
                    pred_prob = float(self.models[target].predict_proba(X_trans)[0][1])
                except Exception:
                    pred_prob = 0.5
            else:
                pred_prob = 0.5

            pred_pct = int(round(pred_prob * 100))
            if pred_pct >= 60:
                risk_status = "Elevated predicted risk"
            elif pred_pct >= 35:
                risk_status = "Moderate predicted risk"
            else:
                risk_status = "Low predicted risk"

            nutrient_clean = target.replace("_deficiency", "").replace("_", " ").title()
                
            feat_contribs = []
            for i, val_c in enumerate(val):
                name = self.feature_names[i] if i < len(self.feature_names) else f"feature_{i}"
                clean_name = name.replace("remainder__", "").replace("num__", "").replace("cat__", "")
                pretty_name = self.prettify_feature_name(clean_name)
                shap_f = float(val_c)
                direction = "increases_risk" if shap_f > 0.002 else ("decreases_risk" if shap_f < -0.002 else "neutral")
                user_provided, user_value_desc = self._check_user_provided(clean_name, user_raw)
                
                feat_contribs.append({
                    "feature": clean_name,
                    "display_name": pretty_name,
                    "shap_value": round(shap_f, 4),
                    "direction": direction,
                    "impact": "Increases predicted risk" if direction == "increases_risk" else "Decreases predicted risk",
                    "user_provided": user_provided,
                    "user_value_desc": user_value_desc
                })
                
            feat_contribs.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
            pos = [f for f in feat_contribs if f["direction"] == "increases_risk"]
            neg = [f for f in feat_contribs if f["direction"] == "decreases_risk"]

            reasons = self._generate_plain_reasons(target, feat_contribs[:6], user_raw)
            
            explanations[target] = {
                "nutrient": nutrient_clean,
                "predicted_risk_pct": pred_pct,
                "risk_category": risk_status,
                "confidence": "High confidence" if (pred_pct >= 60 or pred_pct <= 25) else "Moderate confidence",
                "top_features": feat_contribs[:5],
                "positive_contributors": pos[:5],
                "negative_contributors": neg[:5],
                "summary_reasons": reasons,
                "unprovided_info": "Laboratory blood biomarkers (e.g. serum ferritin, 25(OH)D, serum B12) were not collected in profile; predictions are estimated from reported lifestyle, dietary patterns, and symptoms.",
                "disclaimer": "Model-predicted risk based on feature attribution, not a confirmed clinical diagnosis."
            }
            
        return explanations

    def prettify_feature_name(self, name):
        mapping = {
            "age": "Age",
            "bmi": "Body Mass Index (BMI)",
            "daily_food_budget": "Daily Food Budget",
            "gender_Female": "Gender: Female",
            "gender_Male": "Gender: Male",
            "region_Tamil Nadu": "Region: Tamil Nadu",
            "region_Kerala": "Region: Kerala",
            "region_Karnataka": "Region: Karnataka",
            "region_Maharashtra": "Region: Maharashtra",
            "region_North India": "Region: North India",
            "diet_type_Vegetarian": "Vegetarian Diet Habits",
            "diet_type_Vegan": "Vegan Diet Habits",
            "diet_type_Non-Vegetarian": "Non-Vegetarian Diet Habits",
            "sun_exposure_Medium": "Medium Sunlight Exposure",
            "sun_exposure_Low": "Low Sunlight Exposure",
            "sun_exposure_High": "High Sunlight Exposure",
            "activity_level_Light": "Light Daily Activity",
            "activity_level_Moderate": "Moderate Daily Activity",
            "activity_level_Active": "Active Lifestyle Routine",
            "activity_level_Sedentary": "Sedentary Routine",
            # Symptoms
            "fatigue": "Reported Fatigue",
            "pale_skin": "Reported Pale Skin",
            "hair_loss": "Reported Hair Loss",
            "weak_nails": "Reported Weak / Brittle Nails",
            "bone_pain": "Reported Bone / Joint Aches",
            "muscle_weakness": "Reported Muscle Weakness",
            "muscle_cramps": "Reported Frequent Muscle Cramps",
            "brittle_hair": "Reported Brittle Hair",
            "frequent_infections": "Reported Frequent Infections",
            "numbness_tingling": "Reported Numbness / Tingling",
            # Lifestyles & Diet
            "alcohol_abuse": "High Alcohol Usage",
            "excessive_tea_coffee": "Excessive Coffee/Tea Intake",
            "high_phytate_diet": "High Dietary Phytates",
            "low_iron_diet": "Low Dietary Iron Intake",
            "low_vitamin_d_diet": "Low Dietary Vitamin D Intake",
            "low_vitamin_b12_diet": "Low Dietary Vitamin B12 Intake",
            "low_calcium_diet": "Low Dietary Calcium Intake",
            "low_magnesium_diet": "Low Dietary Magnesium Intake",
            "low_zinc_diet": "Low Dietary Zinc Intake",
            # Engineered composites
            "iron_anemia_composite": "Combined Anemia Indicators",
            "vitd_bone_composite": "Combined Vitamin D / Bone Indicators",
            "b12_neuro_composite": "Combined Vitamin B12 / Nerve Indicators",
            "calcium_composite": "Combined Calcium / Bone Indicators",
            "magnesium_composite": "Combined Magnesium / Muscle Indicators",
            "zinc_composite": "Combined Zinc / Immunity Indicators",
            "iron_vitd_synergy": "Iron & Vitamin D Synergy",
            "neuro_spasm_synergy": "Nerve & Muscle Synergy",
            "symptom_count": "Total Reported Symptoms",
            "symptom_ratio": "Symptom Burden Ratio",
            "dietary_risk_count": "Dietary Risk Factors Count",
            "lifestyle_risk_index": "Lifestyle Risk Index",
            "nutritional_vulnerability": "Overall Nutritional Vulnerability"
        }
        
        for key, display in mapping.items():
            if key in name:
                return display
                
        return name.replace("_", " ").title()
