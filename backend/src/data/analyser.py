import json
import os

def analyze_json_structure(data, prefix="", output_file=None, depth=0, max_depth=3):
    # Stop recursion if we've gone too deep
    if depth > max_depth:
        output_file.write(f"{prefix[:-1]}: [Deeper structure omitted]\n")
        return
    
    if isinstance(data, dict):
        if not data:
            output_file.write(f"{prefix[:-1]}: Empty Dictionary\n")
        else:
            # Instead of showing every key, just indicate the structure
            sample_keys = list(data.keys())[:3]  # Take up to 3 sample keys
            output_file.write(f"{prefix[:-1]}: Dictionary with {len(data)} keys\n")
            
            # Show a few example keys and their structure
            for key in sample_keys:
                analyze_json_structure(data[key], prefix + str(key) + ".", output_file, depth+1, max_depth)
            
            if len(data) > 3:
                output_file.write(f"{prefix}...: {len(data)-3} more keys\n")
    
    elif isinstance(data, list):
        output_file.write(f"{prefix[:-1]}: List (length: {len(data)})\n")
        if data and len(data) > 0:
            # Just analyze the first item to understand the structure
            analyze_json_structure(data[0], prefix + "[sample].", output_file, depth+1, max_depth)
    else:
        # For primitive types, just show the type without the actual value
        output_file.write(f"{prefix[:-1]}: {type(data).__name__}\n")

if __name__ == "__main__":
    try:
        file_path = input("Enter the JSON file path: ")
        
        if not os.path.exists(file_path):
            print(f"Error: File '{file_path}' not found.")
            exit(1)
        
        # Extract file name and use parent directory (data) instead of current directory (fhir)
        dir_path = os.path.dirname(file_path)
        parent_dir = os.path.dirname(dir_path)  # This should be the data directory
        filename = os.path.basename(file_path)
        base_name = os.path.splitext(filename)[0]
        output_path = os.path.join(parent_dir, f"{base_name}_structure.txt")
            
        with open(file_path, "r", encoding="utf-8") as file:
            try:
                json_data = json.load(file)
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON: {e}")
                exit(1)
        
        # Ask for maximum depth to analyze
        max_depth = int(input("Maximum depth to analyze (recommended: 3-5): ") or "3")
        
        with open(output_path, "w", encoding="utf-8") as output_file:
            analyze_json_structure(json_data, output_file=output_file, max_depth=max_depth)
        
        print(f"Analysis complete. Results saved to {output_path}")
    except Exception as e:
        print(f"An error occurred: {e}")