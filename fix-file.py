import sys

# Read the file
path = r'C:\Users\Perry Home WoundCare\OneDrive\Desktop\Innovacare Architecture Pro\innovacare-trainning-main\src\app\features\learner\learner-dashboard\learner-dashboard.ts'

try:
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Total lines before: {len(lines)}")
    print(f"Line 162 before: {repr(lines[161])}")
    
    # Keep only first 161 lines (indices 0-160)
    lines = lines[:161]
    # Add a closing brace as line 162
    lines.append('}\n')
    
    print(f"Total lines after: {len(lines)}")
    print(f"Line 162 after: {repr(lines[161])}")
    
    # Write back
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✓ File fixed successfully!")
    
    # Verify
    with open(path, 'r', encoding='utf-8') as f:
        verify_lines = f.readlines()
    print(f"Verification - Total lines: {len(verify_lines)}")
    print(f"Last line: {repr(verify_lines[-1])}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
