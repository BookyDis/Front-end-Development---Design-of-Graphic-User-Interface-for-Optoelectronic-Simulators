from flask import Flask, request, jsonify, send_from_directory
import os

# Import your custom python package here
# from dTMM_Schrodinger import FDMSolver, dTMMSolver 

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def home():
    # Serves your local static front-end page
    return send_from_directory('static', 'index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.json
    
    # 1. Extract the parameters sent from the HTML form
    material = data.get('material')
    well_width = float(data.get('well_width', 50))
    barrier_height = float(data.get('barrier_height', 0.3))
    solver_type = data.get('solver', 'TMM')
    
    try:
        # 2. --- TRIGGER YOUR PYTHON PACKAGE CALCULATION HERE ---
        # Example: 
        # solver = FDMSolver(material=material, width=well_width, barrier=barrier_height)
        # energies, wavefunctions = solver.solve()
        
        # Simulated mock output matching your data goals for testing:
        mock_energy_levels = [0.045, 0.122, 0.261]
        
        return jsonify({
            "status": "success",
            "energy_levels": mock_energy_levels,
            "message": "Simulation run completed successfully."
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    # Runs locally on your machine
    print("Launch GUI at: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)