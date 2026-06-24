import os
import zipfile
import fnmatch

def should_exclude(rel_path, gitignore_patterns):
    # Normalize path separators to forward slash
    rel_path_normalized = rel_path.replace(os.sep, '/')
    parts = rel_path_normalized.split('/')
    
    # Standard directories to always ignore
    always_exclude_dirs = {'.git', 'node_modules', 'venv', '.venv', 'env', '__pycache__', '.cache'}
    for part in parts:
        if part in always_exclude_dirs:
            return True
            
    # Always exclude target zip files and this script itself
    if rel_path_normalized.endswith('.zip') or rel_path_normalized == 'zip_source.py':
        return True
        
    # Check against gitignore patterns
    for pattern in gitignore_patterns:
        # Strip trailing/leading slashes for match
        pat = pattern.strip('/')
        if not pat or pat.startswith('#'):
            continue
            
        # Match pattern
        if fnmatch.fnmatch(rel_path_normalized, pat) or fnmatch.fnmatch(os.path.basename(rel_path_normalized), pat):
            return True
            
        # Handle directory-specific matches
        if pattern.endswith('/') and any(fnmatch.fnmatch(part, pat) for part in parts):
            return True
            
    return False

def read_gitignore():
    patterns = []
    if os.path.exists('.gitignore'):
        with open('.gitignore', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    patterns.append(line)
    return patterns

def create_zip(zip_name):
    gitignore_patterns = read_gitignore()
    print(f"Loaded gitignore patterns: {gitignore_patterns}")
    
    file_count = 0
    total_uncompressed_size = 0
    
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Calculate relative root
            rel_root = os.path.relpath(root, '.')
            if rel_root == '.':
                rel_root = ''
                
            # Filter directories in-place to prevent walking down excluded paths
            dirs[:] = [d for d in dirs if not should_exclude(os.path.join(rel_root, d), gitignore_patterns)]
            
            for file in files:
                rel_path = os.path.join(rel_root, file)
                if should_exclude(rel_path, gitignore_patterns):
                    continue
                    
                file_size = os.path.getsize(rel_path)
                # Skip files that are excessively large if any (safety check)
                if file_size > 20 * 1024 * 1024:
                    print(f"Skipping very large file: {rel_path} ({file_size / (1024*1024):.2f} MB)")
                    continue
                    
                zipf.write(rel_path, rel_path)
                file_count += 1
                total_uncompressed_size += file_size
                
    print(f"\nSuccessfully created {zip_name}!")
    print(f"Total files zipped: {file_count}")
    print(f"Total uncompressed size: {total_uncompressed_size / (1024*1024):.2f} MB")
    
    zip_size = os.path.getsize(zip_name)
    print(f"ZIP file size: {zip_size / (1024*1024):.2f} MB")
    
    if zip_size < 50 * 1024 * 1024:
        print("Success: Zip file is under 50 MB limits!")
    else:
        print("Warning: Zip file exceeds 50 MB limits!")

if __name__ == '__main__':
    create_zip('fircopilot_source.zip')
