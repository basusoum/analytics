import os
import json
from google import genai
from google.genai import types

# Initialize client. It will automatically look for GEMINI_API_KEY in environment variables.
# You can also use python-dotenv to load from a .env file.
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

client = genai.Client() if os.getenv("GEMINI_API_KEY") else None

def get_llm_response(prompt: str) -> str:
    """
    Abstracted LLM call. Currently uses Google Gemini.
    To switch providers, replace the client and API call below.
    """
    if not client:
        return json.dumps({
            "Agentic_RCA": "AI skipped: GEMINI_API_KEY not found in environment."
        })

    try:
        full_prompt = f"You are an expert supply chain analyst.\n\n{prompt}"
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[full_prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2
            )
        )
        return response.text
    except Exception as e:
        # If API fails (rate limit, etc.), return error \u2014 fallback handles it downstream
        return json.dumps({
            "Agentic_RCA": f"AI Error: {str(e)}"
        })

def numpy_encoder(obj):
    if hasattr(obj, 'item'):
        return obj.item()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

def get_fallback_rca(alert_details):
    """Fallback strictly based on row data to be accurate."""
    start  = int(alert_details.get('opening_inv', 0))
    supply = int(alert_details.get('supply', 0))
    demand = int(alert_details.get('demand', 0))
    end    = int(alert_details.get('closing_inv', 0))
    ss     = int(alert_details.get('ss', 0))
    ms     = int(alert_details.get('ms', 0))
    
    # 🔹 Data-Driven Template Selection (More robust than keyword matching)
    if end > ms:
        surplus = end - ms
        return f"Opening inventory of {start} and supply of {supply} exceed the demand of {demand}, resulting in a projected surplus of {end}. This inventory levels violates the maximum stock threshold of {ms} units by {surplus} units, increasing holding risk."
    elif end < ss:
        if start + supply >= demand:
            shortage_vs_ss = ss - end
            return f"Opening inventory of {start} and supply of {supply} are sufficient to cover the demand of {demand}. However, the projected closing inventory of {end} falls {shortage_vs_ss} units below the target safety stock requirement of {ss}, compromising the critical service level buffer."
        else:
            stock_available = start + supply
            stockout_qty = demand - stock_available
            shortage_vs_ss = ss + stockout_qty
            return f"Opening inventory of {start} and supply of {supply} are insufficient to cover the demand of {demand}, leading to a projected stockout of {stockout_qty} units and a breach of the {ss} unit safety stock target by {shortage_vs_ss} units."
    
    return f"Inventory position analysis: Opening {start}, Supply {supply}, Demand {demand}, Closing {end}. Position is within target thresholds (SS: {ss}, Max: {ms})."

def generate_agentic_insights(sku, current_dc, alert_details, network_context):
    """
    Generates structured AI insights based on the local alert explicitly tied to the exact numbers.
    Falls back to simple math-based calculation if the API is unavailable.
    """
    prompt = f"""
Analyze the following inventory alert and provide a root cause analysis based STRICTLY on the mathematical numbers provided for this row.

**Current Status:**
- Opening Inventory: {alert_details.get('opening_inv', 0)}
- Upcoming Supply: {alert_details.get('supply', 0)}
- Expected Demand: {alert_details.get('demand', 0)}
- Projected Closing: {alert_details.get('closing_inv', 0)}
- Safety Stock (Minimum Buffer): {alert_details.get('ss', 0)}
- Max Stock (Maximum Target): {alert_details.get('ms', 0)}

**Instructions:**
1. Formulate your response as a professional business paragraph of 2-3 sentences.
2. **Strict Logic Match:**
   - IF (Projected Closing > Max Stock): Use the **Excess Template**.
   - IF (Projected Closing < Safety Stock): Use the **Shortage Template**.
3. **Excess Template:** "Opening inventory of [Opening] and supply of [Supply] exceed the demand of [Demand], resulting in a projected surplus of [Closing]. This inventory level violates the maximum stock threshold of [Max Stock] units by [Closing - Max Stock] units, increasing holding risk."
4. **Shortage Template:** "Opening inventory of [Opening] and supply of [Supply] are [insufficient/sufficient] to cover the demand of [Demand], resulting in a projected [stockout/closing inventory] of [Closing]. This inventory level breaches the target safety stock threshold of [Safety Stock] units by [Safety Stock - Closing] units, compromising service level buffers."
5. Return EXACTLY a JSON dictionary with this single key: "Agentic_RCA".
"""
    
    try:
        response_text = get_llm_response(prompt)
        result = json.loads(response_text)
        rca = result.get("Agentic_RCA", "")
        # If the API returned an error message, use data-driven fallback
        if "AI Error" in rca or "AI skipped" in rca:
            raise ValueError("API unavailable")
        return rca
    except Exception:
        return get_fallback_rca(alert_details)
