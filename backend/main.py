import uvicorn
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # Load the app.main:app module dynamically to ensure 100% dev/prod compatibility
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
