import json
import os

def analyze_resource(resource, depth=0, max_depth=10):
    if depth > max_depth:
        return
        
    if isinstance(resource, dict):
        resource_type = resource.get('resourceType', '')
        if resource_type:
            print(f"\n{'  ' * depth}ResourceType: {resource_type}")
            
        for key, value in resource.items():
            if key != 'resourceType':
                if isinstance(value, (dict, list)):
                    print(f"{'  ' * depth}{key}:")
                    analyze_resource(value, depth + 1)
                else:
                    print(f"{'  ' * depth}{key}: {type(value).__name__}")
                    
    elif isinstance(resource, list) and resource:
        for item in resource[:1]:  # Look at first item only
            analyze_resource(item, depth)

def main():
    fhir_directory = "backend/src/data/fhir"
    
    # Only process first file for detailed analysis
    for filename in os.listdir(fhir_directory):
        if filename.endswith('.json'):
            print(f"\nAnalyzing {filename}:")
            with open(os.path.join(fhir_directory, filename)) as f:
                data = json.load(f)
                if 'entry' in data:
                    for entry in data['entry'][:5]:  # Look at first 5 entries
                        if 'resource' in entry:
                            analyze_resource(entry['resource'])
            break  # Only process first file

if __name__ == "__main__":
    main()