document.getElementById('simulatorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const statusBox = document.getElementById('statusIndicator');
    statusBox.classList.remove('hidden');
    statusBox.className = "status-box running";
    statusBox.innerText = "Running simulation... Please wait.";

    // Package the form parameters
    const payload = {
        material: document.getElementById('material').value,
        well_width: document.getElementById('well_width').value,
        barrier_height: document.getElementById('barrier_height').value,
        solver: document.getElementById('solver').value
    };

    try {
        // Post directly to the local Python endpoint
        const response = await fetch('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.status === "success") {
            statusBox.className = "status-box success";
            statusBox.innerText = data.message;
            // Trigger dynamic visualization mapping 
            plotEnergyLevels(data.energy_levels);
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        statusBox.className = "status-box error";
        statusBox.innerText = `Simulation failed: ${error.message}`;
    }
});

let renderingChart = null;
function plotEnergyLevels(energies) {
    const ctx = document.getElementById('resultsChart').getContext('2d');
    
    // Clear old data instance if it exists
    if (renderingChart) renderingChart.destroy();

    renderingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: energies.map((_, index) => `E${index + 1}`),
            datasets: [{
                label: 'Calculated Energy Levels (eV)',
                data: energies,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Energy (eV)' } }
            }
        }
    });
}