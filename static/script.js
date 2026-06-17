document.getElementById('simulatorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const statusBox = document.getElementById('statusIndicator');
    statusBox.className = "status-box running";
    statusBox.innerText = "Processing numerical solvers...";

    // Capture the 1-for-1 package configuration fields
    const payload = {
        material: document.getElementById('material').value,
        solver: document.getElementById('solver').value,
        subband_model: document.getElementById('subband_model').value,
        layer_structure: document.getElementById('layer_structure').value,
        electric_field: document.getElementById('electric_field').value,
        grid_spacing: document.getElementById('grid_spacing').value,
        num_states: document.getElementById('num_states').value
    };

    try {
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.status === "success") {
            statusBox.className = "status-box success";
            statusBox.innerText = data.message;
            
            // Send the raw computational array directly to your visualization element
            plotEnergyLevels(data.results.energies);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        statusBox.className = "status-box error";
        statusBox.innerText = `Simulation Error: ${error.message}`;
    }
});