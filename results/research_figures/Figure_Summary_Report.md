# NutriGen AI – Research Figure Summary Report & Paper Captions

**Project Title**: NutriGen AI – Explainable Multi-Nutrient Deficiency Prediction and Personalized Dietary Intelligence System  
**Target Submission**: IEEE Transactions on Artificial Intelligence / Scopus Indexed AI Journal  
**Execution Environment**: Python 3.14 / Scikit-Learn 1.6 / XGBoost 2.1 / Pytest 9.1  
**Dataset**: Processed NHANES Multi-Nutrient Biomarker & Dietary Feature Dataset (6,000 Cohort Samples)  

---

## 📋 Comprehensive Figures Registry & Academic Captions

### Fig 1: Model Performance Comparison
- **Filename**: `results/research_figures/Fig_1_Model_Performance.png` (also `.pdf`, `.svg`)
- **Title**: Performance Comparison of Multi-Label Classification Models
- **Data Source**: Evaluated on 1,200 untouched test cohort samples (`X_test`, `y_test`).
- **Metrics**: Accuracy (XGB: 94.28%, RF: 94.07%, MLP: 93.68%), Precision (XGB: 95.41%, RF: 94.22%, MLP: 94.23%), Recall (XGB: 92.33%, RF: 93.31%, MLP: 92.45%), F1-Score (XGB: 93.84%, RF: 93.74%, MLP: 93.32%).
- **Paper Caption**: *Fig. 1. Comparative performance of XGBoost, Random Forest, and MLP models for multi-label nutrient deficiency prediction across overall accuracy, precision, recall, and F1-score.*

---

### Fig 2: ROC Curve Analysis
- **Filename**: `results/research_figures/Fig_2_ROC_Curves.png` (also `.pdf`, `.svg`)
- **Title**: ROC Curve Analysis of Multi-Nutrient Deficiency Models
- **Metrics**: Macro ROC-AUC (XGB: 0.9753, RF: 0.9750, MLP: 0.9714).
- **Paper Caption**: *Fig. 2. Receiver Operating Characteristic (ROC) macro-average curve comparison showing discriminative capacity exceeding 0.97 ROC-AUC across all models.*

---

### Fig 3: Precision-Recall Curve Analysis
- **Filename**: `results/research_figures/Fig_3_Precision_Recall_Curves.png` (also `.pdf`, `.svg`)
- **Title**: Precision-Recall Curve Analysis of Multi-Label Deficiency Prediction
- **Metrics**: Macro PR-AUC (XGB: 0.9774, RF: 0.9771, MLP: 0.9750).
- **Paper Caption**: *Fig. 3. Precision-Recall macro-average curves evaluating multi-label deficiency detection reliability under class imbalance.*

---

### Fig 4: Comprehensive Performance Evaluation
- **Filename**: `results/research_figures/Fig_4_Comprehensive_Metrics.png` (also `.pdf`, `.svg`)
- **Title**: Comprehensive Performance Evaluation of NutriGen AI Models
- **Paper Caption**: *Fig. 4. Multi-metric evaluation panel comparing percentage-scaled metrics alongside un-normalized Hamming loss across all model architectures.*

---

### Fig 5 & Fig 6: Training and Validation Convergence
- **Filenames**: `Fig_5_Training_Validation_Accuracy.png`, `Fig_6_Training_Validation_Loss.png`
- **Paper Caption**: *Fig. 5 & 6. Trajectory of training/validation accuracy and cross-entropy loss reduction for the MLP model across optimization epochs.*

---

### Fig 7 & Fig 8: Per-Nutrient Performance (F1-Score & ROC-AUC)
- **Filenames**: `Fig_7_Per_Nutrient_F1.png`, `Fig_8_Per_Nutrient_ROC_AUC.png`
- **Paper Caption**: *Fig. 7 & 8. Individual per-nutrient F1-score and ROC-AUC metrics across Iron, Vitamin D, Vitamin B12, Calcium, Magnesium, and Zinc.*

---

### Fig 9: Deficiency Risk Distribution
- **Filename**: `results/research_figures/Fig_9_Deficiency_Risk_Distribution.png`
- **Paper Caption**: *Fig. 9. Probability distribution boxplots for predicted deficiency risks across the untouched test cohort.*

---

### Fig 10: SHAP Feature Importance
- **Filename**: `results/research_figures/Fig_10_SHAP_Feature_Importance.png`
- **Paper Caption**: *Fig. 10. SHAP feature importance ranking quantifying relative contribution of dietary, lifestyle, and symptom variables to deficiency predictions.*

---

### Fig 11: Multi-Label Prediction Error Comparison (Hamming Loss)
- **Filename**: `results/research_figures/Fig_11_Hamming_Loss.png`
- **Metrics**: Hamming Loss (XGB: 0.0572, RF: 0.0593, MLP: 0.0632).
- **Paper Caption**: *Fig. 11. Multi-label Hamming loss comparison across classification models.*

---

### Fig 12: Jaccard Similarity Comparison
- **Filename**: `results/research_figures/Fig_12_Jaccard_Score.png`
- **Metrics**: Jaccard Score (XGB: 88.58%, RF: 88.40%, MLP: 87.70%).
- **Paper Caption**: *Fig. 12. Macro Jaccard similarity index measuring label set overlap between predicted and true deficiency profiles.*

---

### Fig 13: Nutrition Recommendation & Budget Optimization Analysis
- **Filename**: `results/research_figures/Fig_13_Nutrition_Recommendation_Analysis.png`
- **Paper Caption**: *Fig. 13. Dietary recommendation efficacy evaluating micronutrient RDA coverage improvement alongside daily food expenditure reduction via linear programming optimization.*

