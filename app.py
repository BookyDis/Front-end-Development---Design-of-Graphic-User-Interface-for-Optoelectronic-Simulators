import os
import json
import io
import tempfile
from flask import Flask, request, jsonify, send_from_directory
from src.Material import Material
from src.Grid import Grid
from src.Solvers_FDM import Parabolic_FDM, Kane_FDM, Taylor_FDM
from src.Solvers_TMM import Parabolic_TMM, Taylor_TMM, Kane_TMM, Ekenberg_TMM

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/')
def home():
    return send_from_directory('static', 'index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate():
    """
    Main simulation endpoint that processes quantum well calculations
    """
    try:
        params = request.json
        
        # Extract parameters from GUI
        material_system = params.get('material')
        solver_method = params.get('solver')
        subband_model = params.get('subband_model')
        raw_layers = params.get('layer_structure', '')
        electric_field = float(params.get('electric_field', 0.0))
        grid_spacing = float(params.get('grid_spacing', 1.0))
        num_states = int(params.get('num_states', 4))
        
        # Validate inputs
        if not material_system or not solver_method or not subband_model:
            return jsonify({"status": "error", "message": "Missing required parameters"}), 400
        
        # Parse layer structure
        tokens = raw_layers.strip().split()
        if len(tokens) % 2 != 0:
            return jsonify({"status": "error", "message": "Structure format must be pairs of Width and Molar values."}), 400
        
        layer_profile = [[float(tokens[i]), float(tokens[i+1])] for i in range(0, len(tokens), 2)]
        
        # Create temporary layer file for Grid initialization
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            for width, molar in layer_profile:
                f.write(f"{width} {molar}\n")
            layer_file = f.name
        
        try:
            # Initialize Grid with the layer structure
            grid = Grid(layer_file, grid_spacing, material_system)
            
            # Set electric field
            grid.set_K(electric_field)
            
            # Select and instantiate appropriate solver
            solver = select_solver(solver_method, subband_model, grid, num_states)
            
            if solver is None:
                return jsonify({
                    "status": "error", 
                    "message": f"Invalid combination: {solver_method} + {subband_model}"
                }), 400
            
            # Execute calculation
            energies, wavefunctions = solver.get_wavefunctions()
            
            # Convert to lists for JSON serialization
            energies_list = energies.tolist() if hasattr(energies, 'tolist') else list(energies)
            
            # Convert wavefunctions to serializable format
            wavefunctions_list = []
            for wf in wavefunctions:
                if hasattr(wf, 'tolist'):
                    wavefunctions_list.append(wf.tolist())
                else:
                    wavefunctions_list.append(list(wf))
            
            # Get grid points for plotting
            z_points = grid.get_z().tolist() if hasattr(grid.get_z(), 'tolist') else list(grid.get_z())
            
            # Get potential profile
            potential = grid.get_bandstructure_potential().tolist()
            
            return jsonify({
                "status": "success",
                "message": f"Successfully completed {solver_method} calculation ({subband_model} model)",
                "results": {
                    "energies": energies_list[:num_states],
                    "wavefunctions": wavefunctions_list[:num_states],
                    "z_grid": z_points,
                    "potential": potential,
                    "field_applied": electric_field,
                    "material": material_system,
                    "solver_method": solver_method,
                    "subband_model": subband_model
                }
            })
        
        finally:
            # Clean up temporary file
            if os.path.exists(layer_file):
                os.unlink(layer_file)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "status": "error", 
            "message": f"Execution error: {str(e)}"
        }), 500

def select_solver(solver_method, subband_model, grid, num_states):
    """
    Factory function to select the appropriate solver based on method and model
    """
    if solver_method == "FDM":
        if subband_model == "parabolic":
            return Parabolic_FDM(grid, num_states)
        elif subband_model == "kane":
            return Kane_FDM(grid, num_states)
        elif subband_model == "taylor":
            return Taylor_FDM(grid, num_states)
    
    elif solver_method == "TMM":
        if subband_model == "parabolic":
            return Parabolic_TMM(grid, num_states)
        elif subband_model == "kane":
            return Kane_TMM(grid, num_states)
        elif subband_model == "taylor":
            return Taylor_TMM(grid, num_states)
        elif subband_model == "14kp":
            return Ekenberg_TMM(grid, num_states)
    
    return None

@app.route('/api/material-info', methods=['GET'])
def material_info():
    """
    Endpoint to get material information for visualization
    """
    material_name = request.args.get('material')
    
    if not material_name:
        return jsonify({"status": "error", "message": "Material name required"}), 400
    
    try:
        material = Material(material_name)
        
        # Return material band structure information
        return jsonify({
            "status": "success",
            "material": material_name,
            "band_gap": {
                "well": material.Eg.well,
                "barrier": material.Eg.barr
            },
            "effective_mass": {
                "well": material.m.well,
                "barrier": material.m.barr
            },
            "kane_parameter": {
                "well": material.P.well,
                "barrier": material.P.barr
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error fetching material info: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)