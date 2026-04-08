#!/usr/bin/env python3
import sys

file_path = r'C:\Users\Perry Home WoundCare\OneDrive\Desktop\Innovacare Architecture Pro\innovacare-trainning-main\src\app\features\learner\learner-dashboard\learner-dashboard.ts'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    print(f"Original line 162 (index 161): {repr(lines[161])}")
    
    # Fix line 162 to be just '}'
    lines[161] = '}'
    
    # Keep only first 162 lines
    fixed = '\n'.join(lines[0:162]) + '\n'
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(fixed)
    
    print('✓ File fixed successfully!')
    print('✓ Line 162 is now: }')
    print('✓ Removed extra lines after line 162')
    
    # Verify
    with open(file_path, 'r', encoding='utf-8') as f:
        verify_content = f.read()
    verify_lines = verify_content.split('\n')
    print(f'Verification - Total lines: {len(verify_lines)}')
    print(f'Last non-empty line (162): {repr(verify_lines[161])}')
    
except Exception as err:
    print(f'Error: {err}')
    sys.exit(1)
