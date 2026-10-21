import os
import sys
import types

# Windows Defender Application Control compatibility shim:
# Prevent unhandled crash if _libsvm_sparse DLL is blocked by OS policy
try:
    from sklearn.svm import _libsvm_sparse
except Exception:
    sys.modules['sklearn.svm._libsvm_sparse'] = types.ModuleType('sklearn.svm._libsvm_sparse')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from backend.api.endpoints import router as api_router
from backend.database.db import engine, Base, ensure_database_schema

# Create DB tables if not exist and ensure columns
Base.metadata.create_all(bind=engine)
ensure_database_schema()

app = FastAPI(
    title="NutriGen AI Backend",
    description="Explainable Multi-Nutrient Deficiency Prediction & Personalized Diet Intelligence API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints under /api
app.include_router(api_router)

# Root status health check
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "NutriGen AI"}

# Mount React static files if frontend build exists
dist_dir = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(dist_dir):
    print(f"Mounting compiled frontend from: {dist_dir}")
    app.mount("/", StaticFiles(directory=dist_dir, html=True), name="frontend")
    
    # Catch-all fallback routing for SPA client-side routers
    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        # Serve index.html for non-API routes so React router handles pages correctly
        if not request.url.path.startswith("/api"):
            return FileResponse(os.path.join(dist_dir, "index.html"))
        return JSONResponse(status_code=404, content={"detail": "Resource not found"})
else:
    print(f"Warning: compiled frontend directory not found at {dist_dir}. Serving API only.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
