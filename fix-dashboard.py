import re

path = r'C:\Users\Perry Home WoundCare\OneDrive\Desktop\Innovacare Architecture Pro\innovacare-trainning-main\src\app\features\learner\learner-dashboard\learner-dashboard.ts'

with open(path, 'rb') as f:
    data = f.read()

print(f'File size: {len(data)} bytes')
print(f'Last 60 bytes: {repr(data[-60:])}')

# Find the position of the last valid closing brace
# The class should end with:  }  (on its own line)
# We want to remove anything after the final closing brace of the class

# Find the last occurrence of b'\n}' followed by optional whitespace/garbage
# The correct ending is b'\n}\n'
# Current content has b'\n}\n\n}\xe2\x80\x99\n\n\n' or similar

# Strategy: find the last clean '}\n' that closes the class
# Remove everything after the second-to-last line that contains just '}'

lines = data.split(b'\n')
print(f'Total lines: {len(lines)}')
for i, line in enumerate(lines[-10:], start=len(lines)-10):
    print(f'Line {i}: {repr(line)}')

# Remove trailing garbage: keep only up to and including the line that is just b'}'
# which closes the class, then add a final newline
last_good = -1
for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == b'}':
        last_good = i

print(f'Last good closing brace at line index: {last_good}')
clean_lines = lines[:last_good + 1]
clean_data = b'\n'.join(clean_lines) + b'\n'

print(f'Clean file size: {len(clean_data)} bytes')
print(f'Last 40 bytes: {repr(clean_data[-40:])}')

with open(path, 'wb') as f:
    f.write(clean_data)

print('Done!')
