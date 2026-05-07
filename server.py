import json
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).parent
OUTPUT_PATH = BASE_DIR / "output.json"
UI_DIST = BASE_DIR / "ui" / "dist"

app = FastAPI()


@app.get("/api/data")
async def get_data() -> JSONResponse:
    if not OUTPUT_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="output.json not found. Run python inspector.py first.",
        )
    return JSONResponse(json.loads(OUTPUT_PATH.read_text()))


app.mount("/", StaticFiles(directory=UI_DIST, html=True), name="ui")

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
