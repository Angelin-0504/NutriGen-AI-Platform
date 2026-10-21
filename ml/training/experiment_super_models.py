import os
import json
import pickle
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, KFold
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, VotingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, hamming_loss, jaccard_score
)
from xgboost import XGBClassifier

SEED = 42
np.random.seed(SEED)

def engineer_super_features(df_input):
    df = df_input.copy()
    
    # 1. Continuous transforms
    df["age_bmi_ratio"] = df["age"] / (df["bmi"] + 1e-5)
    df["budget_per_bmi"] = df["daily_food_budget"] / (df["bmi"] + 1e-5)
    df["bmi_sq"] = df["bmi"] ** 2
    df["age_sq"] = df["age"] ** 2
    
    # 2. Ordinal scores
    sun_map = {"Low": 0, "Medium": 1, "High": 2}
    df["sun_score"] = df["sun_exposure"].map(sun_map).fillna(1)
    
    act_map = {"Sedentary": 0, "Light": 1, "Moderate": 2, "Active": 3, "Low": 0, "High": 3}
    df["act_score"] = df["activity_level"].map(act_map).fillna(1)
    
    # 3. Symptom & Dietary Counts
    symptom_cols = [
        "fatigue", "pale_skin", "hair_loss", "weak_nails", "bone_pain",
        "muscle_weakness", "muscle_cramps", "brittle_hair", "frequent_infections",
        "numbness_tingling"
    ]
    df["symptom_count"] = df[symptom_cols].sum(axis=1)
    df["symptom_ratio"] = df["symptom_count"] / 10.0
    
    dietary_cols = [
        "low_iron_diet", "low_vitamin_d_diet", "low_vitamin_b12_diet",
        "low_calcium_diet", "low_magnesium_diet", "low_zinc_diet"
    ]
    df["dietary_risk_count"] = df[dietary_cols].sum(axis=1)
    
    lifestyle_cols = ["alcohol_abuse", "excessive_tea_coffee", "high_phytate_diet"]
    df["lifestyle_risk_index"] = df[lifestyle_cols].sum(axis=1)
    
    df["nutritional_vulnerability"] = df["dietary_risk_count"] * (df["lifestyle_risk_index"] + 1)
    
    # 4. Specific Clinical Target Composites
    df["iron_anemia_composite"] = df["low_iron_diet"] * 2 + df["pale_skin"] * 2 + df["fatigue"] + df["weak_nails"] + df["excessive_tea_coffee"]
    df["vitd_bone_composite"] = df["low_vitamin_d_diet"] * 2 + df["bone_pain"] * 2 + df["muscle_weakness"] + (df["sun_score"] == 0).astype(int) * 2
    df["b12_neuro_composite"] = df["low_vitamin_b12_diet"] * 2 + df["numbness_tingling"] * 3 + df["fatigue"] + (df["diet_type"] == "Vegan").astype(int) * 2
    df["calcium_composite"] = df["low_calcium_diet"] * 2 + df["muscle_cramps"] * 2 + df["bone_pain"]
    df["magnesium_composite"] = df["low_magnesium_diet"] * 2 + df["muscle_cramps"] * 2 + df["alcohol_abuse"] * 2 + df["fatigue"]
    df["zinc_composite"] = df["low_zinc_diet"] * 2 + df["frequent_infections"] * 2 + df["high_phytate_diet"] * 2 + df["hair_loss"]
    
    # 5. Inter-target Synergies
    df["iron_vitd_synergy"] = df["iron_anemia_composite"] * df["vitd_bone_composite"]
    df["neuro_spasm_synergy"] = df["b12_neuro_composite"] * df["magnesium_composite"]
    
    return df

def optimize_thresholds(model_dict, X_val, y_val, targets):
    best_thresholds = {}
    for target in targets:
        y_v = y_val[target].values
        model = model_dict[target]
        probs = model.predict_proba(X_val)[:, 1]
        
        best_t = 0.50
        best_f1 = -1.0
        
        for t in np.linspace(0.15, 0.85, 141):
            preds = (probs >= t).astype(int)
            score = f1_score(y_v, preds, zero_division=0)
            if score > best_f1:
                best_f1 = score
                best_t = t
        best_thresholds[target] = float(best_t)
    return best_thresholds

def predict_with_thresholds(model_dict, X_data, targets, thresholds):
    pred_df = pd.DataFrame(index=range(len(X_data)))
    prob_df = pd.DataFrame(index=range(len(X_data)))
    for target in targets:
        model = model_dict[target]
        probs = model.predict_proba(X_data)[:, 1]
        t = thresholds.get(target, 0.50)
        pred_df[target] = (probs >= t).astype(int)
        prob_df[target] = probs
    return pred_df, prob_df

def evaluate(y_true, pred_df, prob_df, targets):
    accs, precs, recs, f1s, aucs, pr_aucs = [], [], [], [], [], []
    for target in targets:
        yt = y_true[target].values
        yp = pred_df[target].values
        ypr = prob_df[target].values
        
        accs.append(accuracy_score(yt, yp))
        precs.append(precision_score(yt, yp, zero_division=0))
        recs.append(recall_score(yt, yp, zero_division=0))
        f1s.append(f1_score(yt, yp, zero_division=0))
        aucs.append(roc_auc_score(yt, ypr))
        pr_aucs.append(average_precision_score(yt, ypr))
        
    hl = hamming_loss(y_true, pred_df)
    js = jaccard_score(y_true, pred_df, average="samples", zero_division=0)
    
    return {
        "accuracy": np.mean(accs),
        "precision": np.mean(precs),
        "recall": np.mean(recs),
        "f1_score": f1_score(y_true, pred_df, average="macro", zero_division=0),
        "roc_auc": roc_auc_score(y_true, prob_df, average="macro"),
        "pr_auc": average_precision_score(y_true, prob_df, average="macro"),
        "hamming_loss": hl,
        "jaccard_score": js
    }

def main():
    df_raw = pd.read_csv("data/processed/nhanes_data.csv")
    targets = [
        "iron_deficiency", "vitamin_d_deficiency", "vitamin_b12_deficiency",
        "calcium_deficiency", "magnesium_deficiency", "zinc_deficiency"
    ]
    
    df = engineer_super_features(df_raw)
    
    numeric_features = ["age", "bmi", "daily_food_budget", "age_bmi_ratio", "budget_per_bmi", "bmi_sq", "age_sq", "sun_score", "act_score"]
    categorical_features = ["gender", "region", "diet_type", "sun_exposure", "activity_level"]
    binary_features = [
        "alcohol_abuse", "excessive_tea_coffee", "high_phytate_diet",
        "low_iron_diet", "low_vitamin_d_diet", "low_vitamin_b12_diet",
        "low_calcium_diet", "low_magnesium_diet", "low_zinc_diet",
        "fatigue", "pale_skin", "hair_loss", "weak_nails", "bone_pain",
        "muscle_weakness", "muscle_cramps", "brittle_hair", "frequent_infections",
        "numbness_tingling", "symptom_count", "symptom_ratio", "dietary_risk_count",
        "lifestyle_risk_index", "nutritional_vulnerability",
        "iron_anemia_composite", "vitd_bone_composite", "b12_neuro_composite",
        "calcium_composite", "magnesium_composite", "zinc_composite",
        "iron_vitd_synergy", "neuro_spasm_synergy"
    ]
    
    X = df[numeric_features + categorical_features + binary_features]
    y = df[targets]
    
    X_train_raw, X_temp_raw, y_train, y_temp = train_test_split(X, y, test_size=0.40, random_state=SEED)
    X_val_raw, X_test_raw, y_val, y_test = train_test_split(X_temp_raw, y_temp, test_size=0.50, random_state=SEED)
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), categorical_features),
        ],
        remainder="passthrough"
    )
    
    preprocessor.fit(X_train_raw)
    X_train = preprocessor.transform(X_train_raw)
    X_val = preprocessor.transform(X_val_raw)
    X_test = preprocessor.transform(X_test_raw)
    
    # Train models
    models = {"XGBoost": {}, "Random Forest": {}, "ExtraTrees": {}, "MLP": {}, "SuperEnsemble": {}}
    
    for target in targets:
        y_tr = y_train[target]
        
        # XGBoost
        xgb = XGBClassifier(
            n_estimators=450, max_depth=6, learning_rate=0.04, subsample=0.85,
            colsample_bytree=0.85, gamma=0.1, reg_alpha=0.2, reg_lambda=1.2,
            random_state=SEED, eval_metric="logloss"
        )
        xgb.fit(X_train, y_tr)
        models["XGBoost"][target] = xgb
        
        # Random Forest
        rf = RandomForestClassifier(
            n_estimators=500, max_depth=18, min_samples_split=2, min_samples_leaf=1,
            max_features="sqrt", class_weight="balanced_subsample", random_state=SEED
        )
        rf.fit(X_train, y_tr)
        models["Random Forest"][target] = rf
        
        # ExtraTrees
        et = ExtraTreesClassifier(
            n_estimators=500, max_depth=20, min_samples_split=2, min_samples_leaf=1,
            max_features="sqrt", class_weight="balanced", random_state=SEED
        )
        et.fit(X_train, y_tr)
        models["ExtraTrees"][target] = et
        
        # MLP
        mlp = MLPClassifier(
            hidden_layer_sizes=(256, 128, 64), activation="relu", solver="adam",
            alpha=0.0003, learning_rate_init=0.0015, max_iter=600,
            early_stopping=True, n_iter_no_change=20, random_state=SEED
        )
        mlp.fit(X_train, y_tr)
        models["MLP"][target] = mlp
        
        # Super Ensemble (Soft Voting of XGB + RF + ET + MLP)
        ens = VotingClassifier(
            estimators=[('xgb', xgb), ('rf', rf), ('et', et), ('mlp', mlp)],
            voting='soft',
            weights=[1.3, 1.2, 1.0, 1.5]
        )
        ens.fit(X_train, y_tr)
        models["SuperEnsemble"][target] = ens

    # Optimize Thresholds on Validation Set
    thresholds = {}
    for m in models:
        thresholds[m] = optimize_thresholds(models[m], X_val, y_val, targets)

    print("\n" + "="*95, flush=True)
    print("      SUPER EXPERIMENTAL EVALUATION RESULTS ON UNTOUCHED TEST SET (REAL TRAINING)", flush=True)
    print("="*95, flush=True)
    print(f"{'Model Architecture':<18} | {'Accuracy':<9} | {'Precision':<9} | {'Recall':<9} | {'F1-Score':<9} | {'ROC-AUC':<9} | {'PR-AUC':<9} | {'HammingL':<9} | {'Jaccard':<9}", flush=True)
    print("-" * 95, flush=True)
    
    for m in models:
        print(f"Evaluating model: {m}...", flush=True)
        pred_df, prob_df = predict_with_thresholds(models[m], X_test, targets, thresholds[m])
        res = evaluate(y_test, pred_df, prob_df, targets)
        print(f"{m:<18} | {res['accuracy']*100:7.2f}%  | {res['precision']*100:7.2f}%  | {res['recall']*100:7.2f}%  | {res['f1_score']*100:7.2f}%  | {res['roc_auc']*100:7.2f}%  | {res['pr_auc']*100:7.2f}%  | {res['hamming_loss']:7.4f}   | {res['jaccard_score']*100:7.2f}%", flush=True)
    print("="*95, flush=True)

if __name__ == "__main__":
    main()
