"""
Download results from Modal and update frontend data files.

Usage:
    python download_modal_results.py
"""

import subprocess
import json
import shutil
from pathlib import Path


def download_from_modal():
    """Download latest results from Modal volume."""
    print("Downloading results from Modal volume...")

    # Create temp directory
    temp_dir = Path("temp_modal_results")
    temp_dir.mkdir(exist_ok=True)

    # Download files from Modal volume
    subprocess.run(
        [
            "modal",
            "volume",
            "get",
            "state-eitc-ctc-results",
            "results_latest.json",
            str(temp_dir / "results.json"),
        ],
        check=True,
    )

    subprocess.run(
        [
            "modal",
            "volume",
            "get",
            "state-eitc-ctc-results",
            "district_impacts_latest.csv",
            str(temp_dir / "district_impacts.csv"),
        ],
        check=True,
    )

    subprocess.run(
        [
            "modal",
            "volume",
            "get",
            "state-eitc-ctc-results",
            "state_impacts_latest.csv",
            str(temp_dir / "state_impacts.csv"),
        ],
        check=True,
    )

    return temp_dir


def update_frontend_data(temp_dir: Path):
    """Copy results to frontend public directory."""
    repo_root = Path(__file__).parent.parent
    frontend_data = repo_root / "frontend" / "public" / "data"
    data_dir = repo_root / "data"

    # Ensure directories exist
    frontend_data.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    # Copy JSON to frontend
    shutil.copy(temp_dir / "results.json", frontend_data / "results.json")
    print(f"Updated: {frontend_data / 'results.json'}")

    # Copy CSVs to data directory
    shutil.copy(temp_dir / "district_impacts.csv", data_dir / "district_impacts.csv")
    shutil.copy(temp_dir / "state_impacts.csv", data_dir / "state_impacts.csv")
    print(f"Updated: {data_dir / 'district_impacts.csv'}")
    print(f"Updated: {data_dir / 'state_impacts.csv'}")


def cleanup(temp_dir: Path):
    """Remove temporary directory."""
    shutil.rmtree(temp_dir)
    print("Cleaned up temporary files.")


def main():
    """Main function to download and update data."""
    try:
        temp_dir = download_from_modal()
        update_frontend_data(temp_dir)
        cleanup(temp_dir)
        print("\nFrontend data updated successfully!")
    except subprocess.CalledProcessError as e:
        print(f"Error downloading from Modal: {e}")
        print("Make sure you're logged into Modal: modal token new")
        raise
    except Exception as e:
        print(f"Error: {e}")
        raise


if __name__ == "__main__":
    main()
