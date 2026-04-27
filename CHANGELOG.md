# Changelog

All notable changes to the **TruckLog Pro** project will be documented in this file.

## [1.1.0] - 2026-04-27

### Added
- **Banking & Loan System (`bank.js`)**: Added a complete financial system allowing users to apply for truck financing. Features real-world simple interest calculation (3.5% - 6.0% APR) and terms from 12 to 60 months.
- **Automated Loan Payments (`app.js`)**: The system now automatically processes loan installments every 24 hours (in-game/real-world progression) and logs them into the ledger.
- **Truck Marketplace (`drivers.js`)**: Completely revamped the "Add Truck" modal into a full marketplace. Users must now select specific real-world brands (Scania, Volvo, Peterbilt, etc.) and models.
- **Used Truck Pricing & Depreciation (`rates.js`)**: Introduced dynamic pricing for used trucks based on initial odometer readings, simulating real-world vehicle depreciation.
- **Auto-Ownership Detection (`telemetry.js`, `calculator.js`)**: The app now reads `truck.brand` and `truck.model` from the live telemetry. If the driven truck does not match any owned truck in the player's fleet (and isn't a Quick Job), the app automatically applies a "Rental Fee".
- **Startup Script (`run_trucklog.bat`)**: Updated the Windows batch file to start the custom Python Backend (`server.py`) with a single click.
- **Local JSON Storage (`server.py`)**: Added a custom local API server that writes all company data directly to a `database.json` file on the hard drive, making the save file portable and immune to browser cache clearing.
- **Demo Data Seeder (`demo.js`)**: Added a script to populate realistic demo trips, trucks, and ledger entries on the first launch so the dashboard is not empty.

### Changed
- **Calculator Logic**: Updated `calcTripPnL` to handle rental fees dynamically based on the ownership verification.
- **Database Architecture (`db.js`)**: Migrated the storage engine from browser-based IndexedDB to a Local JSON Sync architecture. The app now fetches and pushes state to the Python backend (`database.json`), and supports the new `loans` data structure.
- **Sidebar Navigation (`index.html`)**: Added the "ธนาคาร & สินเชื่อ" (Banking) tab to the main sidebar.
- **Telemetry Job Start Data**: Expanded the captured data on `jobStarted` to include truck make/model for ownership verification.

### Fixed
- Fixed an issue in the Dashboard where the Profit/Loss Chart.js Y-axis did not start at zero.
- Fixed the KPI grid layout in CSS to consistently display 3 columns on larger screens.
