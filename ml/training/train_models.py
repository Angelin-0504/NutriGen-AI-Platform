import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, hamming_loss, jaccard_score
from xgboost import XGBClassifier
import joblib

def load_and_preprocess_data():
    df = pd.read_csv("data/processed/nhanes_data.csv")
    
    # Target deficiencies
    targets = [
        "iron_deficiency",
        "vitamin_d_deficiency",
        "vitamin_b12_deficiency",
        "calcium_deficiency",
        "magnesium_deficiency",
        "zinc_deficiency"
    ]
    
    # Feature columns
    numeric_features = ["age", "bmi", "daily_food_budget"]
    categorical_features = ["gender", "region", "diet_type", "sun_exposure", "activity_level"]
    binary_features = [
        "alcohol_abuse", "excessive_tea_coffee", "high_phytate_diet",
        "low_iron_diet", "low_vitamin_d_diet", "low_vitamin_b12_diet",
        "low_calcium_diet", "low_magnesium_diet", "low_zinc_diet",
        "fatigue", "pale_skin", "hair_loss", "weak_nails", "bone_pain",
        "muscle_weakness", "muscle_cramps", "brittle_hair", "frequent_infections",
        "numbness_tingling"
    ]
    
    # Feature Engineering for High Precision & Recall
    df["diet_tea_interaction"] = df["excessive_tea_coffee"] * df["low_iron_diet"]
    df["sun_bone_interaction"] = (df["sun_exposure"] == "Low").astype(int) * df["bone_pain"]
    df["vegan_b12_interaction"] = (df["diet_type"] == "Vegan").astype(int) * df["low_vitamin_b12_diet"]
    df["phytate_zinc_interaction"] = df["high_phytate_diet"] * df["low_zinc_diet"]
    df["alcohol_magnesium_interaction"] = df["alcohol_abuse"] * df["low_magnesium_diet"]

    engineered_features = [
        "diet_tea_interaction", "sun_bone_interaction", "vegan_b12_interaction",
        "phytate_zinc_interaction", "alcohol_magnesium_interaction"
    ]

    X = df[numeric_features + categorical_features + binary_features + engineered_features]
    y = df[targets]
    
    # Preprocessor
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), categorical_features),
        ],
        remainder="passthrough"  # Leaves binary and engineered features as 0/1
    )
    
    return X, y, preprocessor, targets

def train_and_evaluate():
    X, y, preprocessor, targets = load_and_preprocess_data()
    
    # Split: Train/Val/Test (60/20/20)
    X_train_raw, X_temp_raw, y_train, y_temp = train_test_split(X, y, test_size=0.40, random_state=42)
    X_val_raw, X_test_raw, y_val, y_test = train_test_split(X_temp_raw, y_temp, test_size=0.50, random_state=42)
    
    # Fit preprocessor on train, transform all
    preprocessor.fit(X_train_raw)
    X_train = preprocessor.transform(X_train_raw)
    X_val = preprocessor.transform(X_val_raw)
    X_test = preprocessor.transform(X_test_raw)
    
    # Get feature names after transformer
    cat_encoder = preprocessor.named_transformers_["cat"]
    cat_features_transformed = []
    if hasattr(cat_encoder, "get_feature_names_out"):
        categorical_cols = ["gender", "region", "diet_type", "sun_exposure", "activity_level"]
        cat_features_transformed = cat_encoder.get_feature_names_out(categorical_cols).tolist()
    
    numeric_features = ["age", "bmi", "daily_food_budget"]
    categorical_features = ["gender", "region", "diet_type", "sun_exposure", "activity_level"]
    binary_features = [
        "alcohol_abuse", "excessive_tea_coffee", "high_phytate_diet",
        "low_iron_diet", "low_vitamin_d_diet", "low_vitamin_b12_diet",
        "low_calcium_diet", "low_magnesium_diet", "low_zinc_diet",
        "fatigue", "pale_skin", "hair_loss", "weak_nails", "bone_pain",
        "muscle_weakness", "muscle_cramps", "brittle_hair", "frequent_infections",
        "numbness_tingling"
    ]
    engineered_features = [
        "diet_tea_interaction", "sun_bone_interaction", "vegan_b12_interaction",
        "phytate_zinc_interaction", "alcohol_magnesium_interaction"
    ]
    transformed_feature_names = numeric_features + cat_features_transformed + binary_features + engineered_features

    # Dictionary to hold models and metrics
    model_types = ["xgb", "rf", "mlp"]
    models = {m: {} for m in model_types}
    predictions = {m: {} for m in model_types}
    probabilities = {m: {} for m in model_types}
    
    # Train binary relevance models (each deficiency trained separately)
    for target in targets:
        print(f"Training models for target: {target}...")
        y_tr = y_train[target]
        
        # 1. XGBoost
        xgb = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            eval_metric="logloss"
        )
        xgb.fit(X_train, y_tr)
        models["xgb"][target] = xgb
        
        # 2. Random Forest
        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=4,
            class_weight="balanced_subsample",
            random_state=42
        )
        rf.fit(X_train, y_tr)
        models["rf"][target] = rf
        
        # 3. MLP
        mlp = MLPClassifier(
            hidden_layer_sizes=(128, 64),
            activation="relu",
            max_iter=400,
            alpha=0.0001,
            random_state=42,
            early_stopping=True
        )
        mlp.fit(X_train, y_tr)
        models["mlp"][target] = mlp

    # Compute metrics for each model type
    comparison = {}
    for m in model_types:
        y_pred = pd.DataFrame()
        y_prob = pd.DataFrame()
        
        label_metrics = {}
        for target in targets:
            model = models[m][target]
            y_pred[target] = model.predict(X_test)
            y_prob[target] = model.predict_proba(X_test)[:, 1]
            
            # Per-label 8 core metrics
            acc = accuracy_score(y_test[target], y_pred[target])
            prec = precision_score(y_test[target], y_pred[target], zero_division=0)
            rec = recall_score(y_test[target], y_pred[target], zero_division=0)
            f1 = f1_score(y_test[target], y_pred[target], zero_division=0)
            auc = roc_auc_score(y_test[target], y_prob[target])
            pr_auc = average_precision_score(y_test[target], y_prob[target])
            
            label_metrics[target] = {
                "accuracy": acc,
                "precision": prec,
                "recall": rec,
                "f1": f1,
                "roc_auc": auc,
                "pr_auc": pr_auc
            }
            
        # Global multi-label metrics
        h_loss = hamming_loss(y_test, y_pred)
        j_score = jaccard_score(y_test, y_pred, average="samples", zero_division=0)
        macro_acc = np.mean([label_metrics[t]["accuracy"] for t in targets])
        macro_prec = np.mean([label_metrics[t]["precision"] for t in targets])
        macro_rec = np.mean([label_metrics[t]["recall"] for t in targets])
        macro_f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        macro_auc = roc_auc_score(y_test, y_prob, average="macro")
        macro_pr_auc = average_precision_score(y_test, y_prob, average="macro")
        
        comparison[m] = {
            "label_metrics": label_metrics,
            "accuracy": macro_acc,
            "precision": macro_prec,
            "recall": macro_rec,
            "f1_score": macro_f1,
            "roc_auc": macro_auc,
            "pr_auc": macro_pr_auc,
            "hamming_loss": h_loss,
            "jaccard_score": j_score
        }
    
    print("\n" + "="*110)
    print("                      NUTRIGEN AI -- COMPLETE 8-METRIC EVALUATION BENCHMARK")
    print("="*110)
    print(f"{'Model Name':<18} | {'Accuracy':<9} | {'Precision':<9} | {'Recall':<9} | {'F1-Score':<9} | {'ROC-AUC':<9} | {'PR-AUC':<9} | {'HammingL':<9} | {'Jaccard':<9}")
    print("-" * 110)
    for m in model_types:
        c = comparison[m]
        name = "XGBoost" if m == "xgb" else ("Random Forest" if m == "rf" else "MLP Neural Net")
        print(f"{name:<18} | {c['accuracy']*100:7.2f}%  | {c['precision']*100:7.2f}%  | {c['recall']*100:7.2f}%  | {c['f1_score']*100:7.2f}%  | {c['roc_auc']*100:7.2f}%  | {c['pr_auc']*100:7.2f}%  | {c['hamming_loss']:7.4f}   | {c['jaccard_score']*100:7.2f}%")
    print("="*110)
    
    print("\n--- Visual Accuracy Bar Chart ---")
    for m in model_types:
        acc = comparison[m]["accuracy"]
        name = "XGBoost" if m == "xgb" else ("Random Forest" if m == "rf" else "MLP Classifier")
        bar = "#" * int((acc * 100) / 3)
        print(f"{name:<18} {bar} {acc*100:.2f}%")
    print()

    # Determine best model based on Jaccard Score + Macro F1
    best_model_name = "xgb"
    if comparison["mlp"]["jaccard_score"] > comparison["xgb"]["jaccard_score"]:
        best_model_name = "mlp"
    
    print(f"Best model selected: {best_model_name.upper()}")
    
    # Save the pipeline components
    os.makedirs("backend/models", exist_ok=True)
    os.makedirs("ml/saved_models", exist_ok=True)
    
    # Save best models
    best_models = models[best_model_name]
    best_pipelines = {}
    for target in targets:
        best_pipelines[target] = best_models[target]
        
    # Serialize pipeline
    with open("backend/models/best_models.pkl", "wb") as f:
        pickle.dump(best_pipelines, f)
        
    with open("backend/models/preprocessor.pkl", "wb") as f:
        pickle.dump(preprocessor, f)

    # Save a global info file
    metadata = {
        "best_model_type": best_model_name,
        "targets": targets,
        "features": {
            "numeric": numeric_features,
            "categorical": categorical_features,
            "binary": binary_features,
            "transformed": transformed_feature_names
        },
        "metrics": comparison
    }
    
    with open("backend/models/metadata.json", "w") as f:
        json.dump(metadata, f, indent=4)
        
    # Copy files to ML directory as well for redundancy
    with open("ml/saved_models/best_models.pkl", "wb") as f:
        pickle.dump(best_pipelines, f)
    with open("ml/saved_models/preprocessor.pkl", "wb") as f:
        pickle.dump(preprocessor, f)
    with open("ml/saved_models/metadata.json", "w") as f:
        json.dump(metadata, f, indent=4)
        
    print("Models and pipelines saved successfully.")

if __name__ == "__main__":
    train_and_evaluate()
