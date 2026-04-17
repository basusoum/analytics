import streamlit as st
import pandas as pd
from backend.data_loader import load_data
from backend.validation import validate_data
from backend.kpi import calculate_kpis

st.title("Inventory Risk Analysis AI")

# 🔹 Data source selection
source = st.selectbox(
    "Select Data Source",
    ["Upload File", "Use Sample Data"]
)

df = None

if source == "Upload File":
    file = st.file_uploader("Upload CSV or Excel", type=["csv", "xlsx"])
    if file:
        df = load_data(file)

elif source == "Use Sample Data":
    df = pd.read_csv("sample_data.csv")

# 🔹 Run validation
if df is not None:
    st.subheader("Data Preview")
    st.dataframe(df.head())

    validation_results = validate_data(df)
    
    st.subheader("Validation Results")
    for msg in validation_results:
        st.write(msg)

    # 🔹 KPIs
    kpis = calculate_kpis(df)
    
    st.subheader("Data Quality KPIs")
    st.json(kpis)
