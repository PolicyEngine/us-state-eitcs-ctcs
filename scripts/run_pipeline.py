"""Run Modal pipeline with proper encoding handling."""
import os
import sys
import subprocess

os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

year = sys.argv[1] if len(sys.argv) > 1 else "2025"

print(f"Running pipeline for {year}...")

proc = subprocess.Popen(
    ["modal", "run", "modal_pipeline.py", "--year", year],
    cwd=os.path.dirname(os.path.abspath(__file__)),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)

for line in proc.stdout:
    try:
        print(line.decode("utf-8", errors="replace").rstrip())
    except:
        pass

proc.wait()
print(f"\nPipeline for {year} completed with exit code: {proc.returncode}")
