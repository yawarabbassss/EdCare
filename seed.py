import sys
import os

# Add services/api and services to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "services", "api"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.seed import run_seed

if __name__ == "__main__":
    run_seed()
