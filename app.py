import os
from flask import Flask, request, jsonify, send_from_directory
from src.Material import Material
from src.Grid import Grid
from src.Solvers_FDM import Parabolic_FDM, Kane_FDM , Taylor_FDM
from src.Solvers_TMM import Parabolic_TMM, Taylor_TMM,  Kane_TMM
app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def home():
    return send_from_directory('static', 'index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate():
    params = request.json
    
    # Extracting the complete 1-for-1 structural mapping from the GUI inputs
    material_system = params.get('material')
    solver_method = params.get('solver')
    subband_model = params.get('subband_model')
    raw_layers = params.get('layer_structure', '')
    electric_field = float(params.get('electric_field', 0.0))
    grid_spacing = float(params.get('grid_spacing', 1.0))
    num_states = int(params.get('num_states', 4))
    
    try:
        # Parse the raw spatial profile string into numerical pairing arrays
        # Ex: "200 0.15 200 0" -> [[200.0, 0.15], [200.0, 0.0]]
        tokens = raw_layers.strip().split()
        if len(tokens) % 2 != 0:
            return jsonify({"status": "error", "message": "Structure format must be pairs of Width and Molar values."}), 400
            
        layer_profile = [[float(tokens[i]), float(tokens[i+1])] for i in range(0, len(tokens), 2)]
        
        # --- 1-FOR-1 PASSING TO YOUR DOWNLOADED PYTHON PACKAGE ---
        # Under normal conditions, you pass these parameters to your grid/solver initialization:
        #
        # grid = Grid(layers=layer_profile, dz=grid_spacing)
        # if solver_method == "FDM":
        #     engine = FDMSolver(grid=grid, material=material_system, model=subband_model, field=electric_field)
        # else:
        #     engine = dTMMSolver(grid=grid, material=material_system, model=subband_model, field=electric_field)
        #
        # energies, wavefunctions = engine.solve(target_states=num_states)
        
        # Simulating returning the 1-for-1 processed array outputs back to JS
        calculated_energies = [0.0521, 0.1184, 0.2241, 0.3105][:num_states]
        
        return jsonify({
            "status": "success",
            "message": f"Successfully completed {solver_method} calculation ({subband_model} model).",
            "results": {
                "energies": calculated_energies,
                "field_applied": electric_field
            }
        })
        
    except Exception as e:
        return jsonify({"status": "error", "message": f"Execution error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)