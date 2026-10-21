# NutriGen AI: Clinical Nutrition Intelligence & Meal Planning System

NutriGen AI is an explainable AI-driven clinical nutrition and personalized dietary recommendation platform. It predicts multi-nutrient deficiency risks (Iron, Vitamin D, Vitamin B12, Calcium, Magnesium, and Zinc) from clinical indicators and dietary patterns, generating 7-day LP-optimized meal plans respecting strict regional culinary preferences (such as Tamil Nadu cuisine).

---

## 🚀 Key Features

- **Explainable Multi-Nutrient Risk Prediction**: Machine learning evaluation (XGBoost, Random Forest, MLP) predicting deficiency risks with SHAP (SHapley Additive exPlanations) feature attribution.
- **Strict Region-Specific Meal Planning**: Linear Programming (PuLP) optimization engine creating balanced 7-day meal plans with verified regional cuisines (e.g. authentic Tamil Nadu dishes), preventing cross-regional leakage.
- **Nutrition Digital Twin Simulator**: Multi-week mathematical simulation engine comparing baseline diets, partial compliance scenarios (20%–100%), and expected nutrient recovery trajectories.
- **Family Nutrition Co-Op**: Joint multi-member optimization consolidating shared ingredients to reduce cooking costs and kitchen effort.
- **Daily Progress Tracking & Dynamic Adaptation**: Real daily adherence logging adapting subsequent recommendations based on meal consumption and symptoms.
- **Medical Report Generator**: Exportable clinical PDF reports summarizing risk rankings, SHAP explanations, 7-day meal calendar, and simulation outcomes.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.14+, FastAPI, SQLAlchemy, SQLite, PuLP (Linear Programming), ReportLab (PDF Generation)
- **Machine Learning & Explainability**: Scikit-learn, XGBoost, SHAP, Pandas, NumPy
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons, Recharts

---

## 📦 Getting Started

### 1. Prerequisites
- Python 3.10+ installed
- Node.js (v18+) and npm installed
- Git installed

### 2. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # On Windows
# source .venv/bin/activate  # On Linux / macOS

# Install backend dependencies
pip install -r requirements.txt

# Seed the food database & regional recipes
python ml/data/build_food_database.py

# (Optional) Retrain prediction models locally
python ml/training/train_models.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run build
cd ..
```

### 4. Running the Application
To run both backend (FastAPI) and frontend concurrently on Windows:
```cmd
.\Run_NutriGen_AI.bat
```
Or start manually:
- **Backend**: `uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload`
- **Frontend**: `cd frontend && npm run dev`

Open your browser at `http://localhost:5173`.

---

## 🔒 Security & Privacy Notice
- Local databases (`nutrigen.db`), virtual environments (`.venv/`), and user credentials are automatically excluded via `.gitignore` to preserve privacy and prevent secret leaks.
- All predictions and digital twin trajectories are educational decision-support tools and not confirmed medical diagnoses. Always consult a certified healthcare professional for clinical laboratory testing.
