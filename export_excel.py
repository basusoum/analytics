import pandas as pd
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
input_file = os.path.join(script_dir, "generated_data", "final_projection_results__aligned.csv")
output_file = os.path.join(os.path.dirname(script_dir), "Alert_Center.xlsx")

def export():
    print(f"Reading from: {input_file}")
    if not os.path.exists(input_file):
        print(f"Error: File not found at {input_file}")
        return
        
    try:
        df = pd.read_csv(input_file)
        
        # Filter for alerts (P1, P2, P3) just like the UI Alert Center
        if 'Priority' in df.columns:
            alerts_df = df[df['Priority'].isin(['P1', 'P2', 'P3'])]
        else:
            alerts_df = df
            
        print(f"Found {len(alerts_df)} alerts.")
        
        # Select columns that exactly map to what is seen in the UI's Alert Table
        ui_columns_mapping = {
            'Alert_ID': 'Alert ID',
            'SKU': 'SKU',
            'Site': 'Site',
            'Week_Index': 'Wk',
            'Priority': 'Priority',
            'Alert': 'Alert',
            'MSTN%': 'MSTN (%)',
            'ESTN%': 'ESTN (%)',
            'Start Inventory': 'Opening Stock',
            'Total Supply': 'Supply',
            'Total Forecast/Order': 'Demand',
            'End. Inventory': 'Closing Stock',
            'Target Safety Stock (in Units)': 'Target SS',
            'Target Max Stock (in Units)': 'Max Stock',
            'Shortage': 'Shortage',
            'Excess': 'Excess',
            'Agentic_RCA': 'Root Cause Analysis/AI Insights'
        }
        
        # Filter and rename columns to match UI aesthetic
        existing_cols = []
        for col in ui_columns_mapping.keys():
            if col in alerts_df.columns:
                existing_cols.append(col)
                
        export_df = alerts_df[existing_cols].rename(columns=ui_columns_mapping)
        
        # Save to Excel without index
        export_df.to_excel(output_file, index=False, engine='openpyxl')
        print(f"Successfully exported exact UI representation to: {output_file}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    export()
