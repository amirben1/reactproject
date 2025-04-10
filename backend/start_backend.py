import uvicorn
import os

# Set the Groq API key if not already set
if "GROQ_API_KEY" not in os.environ:
    os.environ["GROQ_API_KEY"] = "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"

# Run the FastAPI application
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
