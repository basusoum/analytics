"""
Recommendation Agent — FastAPI server powered by Google Gemini (google-genai SDK)
Provides intelligent, context-aware inventory action recommendations for planners.

Run with:
    python -m uvicorn recommendation_agent:app --port 8000
"""

import os
import json
import traceback
import io
import pandas as pd
import math
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import urllib.parse
from sqlalchemy import create_engine
from google import genai
from google.genai import types

from validation import validate_data
from kpi import calculate_kpis
from inventory_projection_poc import run_mass_projection, sync_to_frontend

load_dotenv()

# ── Gemini client setup ────────────────────────────────────────────────────────
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
_api_key = os.getenv("GOOGLE_API_KEY")
client = None
if _api_key:
    client = genai.Client(api_key=_api_key)
    print(f"[recommendation_agent] Gemini client initialized. Model: {GEMINI_MODEL}")
else:
    print(f"[recommendation_agent] WARNING: GOOGLE_API_KEY not found. AI recommendations will use static fallback.")



# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(title="Inventory Recommendation Agent", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schema ─────────────────────────────────────────────────────────────
class DBConnectionPayload(BaseModel):
    db_type: str
    host: str
    port: str
    database: str
    username: str
    password: str
    query: str

class AlertRow(BaseModel):
    SKU: str
    Site: str
    Priority: str
    Alert: str
    Week_Index: Optional[int]        = None
    MSTN_pct: Optional[float]        = None
    ESTN_pct: Optional[float]        = None
    Shortage: Optional[float]        = 0
    Excess: Optional[float]          = 0
    Lead_Time: Optional[int]         = None
    Start_Inventory: Optional[float] = None
    Total_Supply: Optional[float]    = None
    Total_Demand: Optional[float]    = None
    End_Inventory: Optional[float]   = None
    Safety_Stock: Optional[float]    = None
    Max_Stock: Optional[float]       = None
    Business_Unit: Optional[str]     = None
    RCA_Summary: Optional[str]       = None
    SKU_Desc: Optional[str]          = None
    Site_Desc: Optional[str]         = None
    Days_of_Coverage: Optional[float]= None
    Priority_Score: Optional[int]    = None

class DownloadPayload(BaseModel):
    data: List[Dict[str, Any]]
    filename: Optional[str] = "export"


# ── Static fallback ────────────────────────────────────────────────────────────
def static_fallback(row: AlertRow):
    shortage = row.Shortage or 0
    excess   = row.Excess   or 0
    mstn     = row.MSTN_pct or 0
    estn     = row.ESTN_pct or 0
    lt       = row.Lead_Time or 0
    priority = row.Priority
    actions  = []

    if priority == "None":
        actions.append({"icon": "✓", "text": "No action required — inventory position is healthy.", "urgency": "low"})
        return actions

    if shortage > 0:
        if mstn <= 0:
            actions.append({"icon": "🚨", "text": "Immediate escalation — stockout imminent. Expedite emergency supply or redistribute from nearest site with surplus.", "urgency": "critical"})
            actions.append({"icon": "📞", "text": "Notify downstream stakeholders of potential delivery impact.", "urgency": "critical"})
        elif mstn < 50:
            actions.append({"icon": "⚡", "text": "Expedite existing purchase orders to accelerate supply arrival.", "urgency": "high"})
            actions.append({"icon": "🔄", "text": "Evaluate inter-site stock redistribution from lower-demand locations.", "urgency": "high"})
        elif mstn < 90:
            actions.append({"icon": "📋", "text": "Review demand forecast accuracy — adjust if over-forecasted.", "urgency": "medium"})
            actions.append({"icon": "📦", "text": "Pre-position backup supply to prevent further deterioration.", "urgency": "medium"})
        else:
            actions.append({"icon": "👁", "text": "Monitor — minor shortage, likely to self-correct with next replenishment.", "urgency": "low"})
        if lt and lt <= 2:
            actions.append({"icon": "⏱", "text": f"Lead time is {lt} week(s) — limited window to act before next cycle.", "urgency": "high"})

    if excess > 0:
        if estn > 20:
            actions.append({"icon": "🛑", "text": "Hold or defer incoming orders to stop inventory buildup.", "urgency": "high"})
            actions.append({"icon": "💰", "text": "Evaluate promotional push or volume discount to accelerate sell-through.", "urgency": "high"})
        elif estn > 10:
            actions.append({"icon": "⏸", "text": "Defer next planned replenishment — current stock exceeds max threshold.", "urgency": "medium"})
            actions.append({"icon": "📊", "text": "Review demand forecast — may be under-forecasted, causing excess build.", "urgency": "medium"})
        else:
            actions.append({"icon": "👁", "text": "Monitor — slight excess may self-correct with upcoming demand.", "urgency": "low"})

    if priority in ("P1", "P2"):
        actions.append({"icon": "🔧", "text": "Review safety stock and reorder point parameters for this SKU–Site combination.", "urgency": "medium"})

    return actions


# ── Prompt builder ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert supply chain AI agent for medical device inventory risk management.
Analyze inventory alert data and return 3-5 highly specific, actionable recommendations for supply chain planners.

Key metrics:
- MSTN%: % of Safety Stock covered (0% = stockout, 100% = at SS, <75% = critical)
- ESTN%: % above Max Stock (>20% = high excess)
- Lead Time: weeks to receive supply (alerts within LT are hardest to fix)

Return ONLY a valid JSON array. Each item must have:
- "icon": relevant single emoji
- "text": specific 1-2 sentence planner action (quantified where possible)
- "urgency": one of "critical", "high", "medium", "low"

No markdown, no explanation — ONLY the JSON array."""


def build_prompt(row: AlertRow) -> str:
    return f"""{SYSTEM_PROMPT}

Alert data:
SKU: {row.SKU} ({row.SKU_Desc or 'N/A'}) | Site: {row.Site} ({row.Site_Desc or 'N/A'})
BU: {row.Business_Unit or 'N/A'} | Alert: {row.Alert} | Priority: {row.Priority} | Week: {row.Week_Index}
Score: {row.Priority_Score}/100

Flow: Opening={int(row.Start_Inventory or 0):,} Supply={int(row.Total_Supply or 0):,} Demand={int(row.Total_Demand or 0):,} Closing={int(row.End_Inventory or 0):,}
Days Coverage: {row.Days_of_Coverage or 0}

Thresholds: SS={int(row.Safety_Stock or 0):,} Max={int(row.Max_Stock or 0):,} LT={row.Lead_Time} wks
Risk: MSTN={row.MSTN_pct or 0}% ESTN={row.ESTN_pct or 0}% Shortage={int(row.Shortage or 0):,} Excess={int(row.Excess or 0):,}
RCA: {row.RCA_Summary or 'N/A'}"""


# ── Main endpoint ──────────────────────────────────────────────────────────────
import time as _time

@app.post("/api/recommendations")
async def get_recommendations(row: AlertRow):
    MAX_RETRIES = 3
    last_error  = None

    for attempt in range(MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model    = GEMINI_MODEL,
                contents = build_prompt(row),
                config   = types.GenerateContentConfig(
                    temperature      = 0.3,
                    max_output_tokens= 800,
                ),
            )

            content = response.text.strip()

            # Strip markdown fences if present
            if "```" in content:
                parts   = content.split("```")
                content = parts[1] if len(parts) > 1 else content
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()

            parsed = json.loads(content)
            if isinstance(parsed, dict):
                actions = parsed.get("actions") or parsed.get("recommendations") or list(parsed.values())[0]
            else:
                actions = parsed

            validated = [
                {"icon": a.get("icon", "📌"), "text": str(a["text"]), "urgency": a.get("urgency", "medium")}
                for a in actions if isinstance(a, dict) and "text" in a
            ]

            if not validated:
                raise ValueError("Empty actions from Gemini")

            return {"source": "ai", "actions": validated}

        except Exception as e:
            last_error = e
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait = 2 ** (attempt + 1)
                print(f"[recommendation_agent] 429 rate-limited, retry {attempt+1}/{MAX_RETRIES} in {wait}s...")
                _time.sleep(wait)
                continue
            else:
                print(f"[recommendation_agent] Gemini failed: {type(e).__name__}: {e}")
                traceback.print_exc()
                break

    print(f"[recommendation_agent] All retries exhausted — fallback. Last error: {last_error}")
    return {"source": "fallback", "actions": static_fallback(row)}


def sanitize_data(data):
    """
    Recursively replace NaN, Inf, and -Inf with None for JSON compliance.
    """
    if isinstance(data, dict):
        return {k: sanitize_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_data(v) for v in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return None
    return data


@app.post("/api/validate")
async def validate_file_endpoint(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        validation_results = validate_data(df)
        kpi_results = calculate_kpis(df)
        
        # 🔹 Run the full projection pipeline and sync to frontend
        print("[backend] Triggering projection pipeline for uploaded file...")
        run_mass_projection(df)
        sync_to_frontend()
        
        return sanitize_data({
            "status": "success",
            "validation": validation_results,
            "pipeline_success": True,
            **kpi_results
        })
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.post("/api/validate_db")
async def validate_db_endpoint(payload: DBConnectionPayload):
    try:
        user = urllib.parse.quote_plus(payload.username)
        pwd = urllib.parse.quote_plus(payload.password)
        db = urllib.parse.quote_plus(payload.database)
        
        if payload.db_type == 'oracle':
            uri = f"oracle+oracledb://{user}:{pwd}@{payload.host}:{payload.port}/?service_name={db}"
        elif payload.db_type == 'sqlserver':
            uri = f"mssql+pymssql://{user}:{pwd}@{payload.host}:{payload.port}/{db}"
        else:
            return {"status": "error", "message": f"Unsupported DB Type: {payload.db_type}"}
            
        engine = create_engine(uri)
        df = pd.read_sql(payload.query, engine)
        
        validation_results = validate_data(df)
        kpi_results = calculate_kpis(df)
        
        # 🔹 Run the full projection pipeline and sync to frontend
        print("[backend] Triggering projection pipeline for DB query...")
        run_mass_projection(df)
        sync_to_frontend()
        
        return sanitize_data({
            "status": "success",
            "validation": validation_results,
            "pipeline_success": True,
            **kpi_results
        })
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.post("/api/test_db_connection")
async def test_db_connection_endpoint(payload: DBConnectionPayload):
    try:
        user = urllib.parse.quote_plus(payload.username)
        pwd = urllib.parse.quote_plus(payload.password)
        db = urllib.parse.quote_plus(payload.database)
        
        if payload.db_type == 'oracle':
            uri = f"oracle+oracledb://{user}:{pwd}@{payload.host}:{payload.port}/?service_name={db}"
        elif payload.db_type == 'sqlserver':
            uri = f"mssql+pymssql://{user}:{pwd}@{payload.host}:{payload.port}/{db}"
        else:
            return {"status": "error", "message": f"Unsupported DB Type: {payload.db_type}"}
            
        engine = create_engine(uri)
        df = pd.read_sql(payload.query, engine)
        
        return {
            "status": "success",
            "message": "Connected successfully"
        }
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": "Connection failed - check credentials"}

@app.post("/api/download_csv")
async def download_csv(payload: DownloadPayload):
    if not payload.data:
        return {"status": "error", "message": "No data to export"}
    try:
        df = pd.DataFrame(payload.data)
        # Handle cases where columns are just lists or objects
        for col in df.columns:
            if df[col].apply(lambda x: isinstance(x, (list, dict))).any():
                df[col] = df[col].apply(lambda x: json.dumps(x) if isinstance(x, (list, dict)) else x)
        
        output = io.StringIO()
        df.to_csv(output, index=False)
        
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={payload.filename}.csv",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/health")
async def health():
    return {"status": "ok", "model": GEMINI_MODEL, "provider": "google-gemini"}
