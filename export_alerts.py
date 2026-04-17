import pandas as pd
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
input_file = os.path.join(script_dir, "generated_data", "final_projection_results__aligned.csv")
output_file = os.path.join(os.path.dirname(script_dir), "Alert_Center_Validation.csv")

def export():
    print(f"Working Directory: {os.getcwd()}")
    print(f"Attempting to read from: {input_file}")
    
    if not os.path.exists(input_file):
        print(f"Error: File not found at {input_file}")
        return
        
    try:
        df = pd.read_csv(input_file)
        print(f"Columns found: {df.columns.tolist()}")
        
        if 'Priority' not in df.columns:
            print("Error: 'Priority' column not found.")
            return
            
        alerts_df = df[df['Priority'].isin(['P1', 'P2', 'P3'])]
        print(f"Found {len(alerts_df)} alerts.")
        
        cols = [
            'Alert_ID', 'SKU', 'Site', 'Week_Index', 'Priority', 'Alert', 
            'Start Inventory', 'Total Supply', 'Total Forecast/Order', 'End. Inventory',
            'Target Safety Stock (in Units)', 'Target Max Stock (in Units)',
            'Shortage', 'Excess', 'MSTN%', 'ESTN%', 'RCA_Summary', 'Agentic_RCA'
        ]
        
        existing_cols = [c for c in cols if c in alerts_df.columns]
        alerts_df = alerts_df[existing_cols]
        
        alerts_df.to_csv(output_file, index=False)
        print(f"Successfully exported to: {output_file}")
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    export()
