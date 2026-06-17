// app.js - Frontend logic for simulator

let potentialChart = null;
let wavefunctionChart = null;
let currentResults = null;

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('simulatorForm');
    form.addEventListener('submit', handleSubmit);
    
    // Load material info when material is selected
    document.getElementById('material').addEventListener('change', loadMaterialInfo);
});

async function handleSubmit(e) {
    e.preventDefault();
    
    clearMessages();
    showLoadingSpinner(true);
    
    const formData = {
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
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            currentResults = data.results;
            displayResults(data);
            showSuccessMessage(data.message);
        } else {
            showErrorMessage(data.message || 'Simulation failed');
        }
    } catch (error) {
        showErrorMessage(`Error: ${error.message}`);
        console.error('Submission error:', error);
    } finally {
        showLoadingSpinner(false);
    }
}

function displayResults(data) {
    const results = data.results;
    
    // Display energy levels
    displayEnergyLevels(results.energies);
    
    // Display charts
    displayPotentialChart(results.z_grid, results.potential);
    displayWavefunctionChart(results.z_grid, results.wavefunctions, results.energies);
    
    // Show results sections
    document.getElementById('energyLevelsSection').classList.remove('hidden');
    document.getElementById('chartsSection').classList.remove('hidden');
}

function displayEnergyLevels(energies) {
    const tbody = document.getElementById('energyTableBody');
    tbody.innerHTML = '';
    
    energies.forEach((energy, index) => {
        const row = document.createElement('tr');
        const energyMeV = energy * 1000; // Convert eV to meV
        row.innerHTML = `
            <td>${index}</td>
            <td>${energy.toFixed(6)}</td>
            <td>${energyMeV.toFixed(3)}</td>
        `;
        tbody.appendChild(row);
    });
}

function displayPotentialChart(zGrid, potential) {
    const ctx = document.getElementById('potentialChart').getContext('2d');
    
    if (potentialChart) {
        potentialChart.destroy();
    }
    
    potentialChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: zGrid.map(z => z.toFixed(2)),
            datasets: [{
                label: 'Band Structure Potential (eV)',
                data: potential.map(v => v * 1000), // Convert to meV
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Band Structure Potential Profile' }
            },
            scales: {
                x: { title: { display: true, text: 'Position z (Å)' } },
                y: { title: { display: true, text: 'Energy (meV)' } }
            }
        }
    });
}

function displayWavefunctionChart(zGrid, wavefunctions, energies) {
    const ctx = document.getElementById('wavefunctionChart').getContext('2d');
    
    if (wavefunctionChart) {
        wavefunctionChart.destroy();
    }
    
    const colors = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(75, 192, 192)', 'rgb(255, 206, 86)'];
    
    const datasets = wavefunctions.map((wf, index) => ({
        label: `State ${index} (E = ${energies[index].toFixed(6)} eV)`,
        data: wf instanceof Array ? wf[0] : Array.from(wf),
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        tension: 0.3,
        borderWidth: 2
    }));
    
    wavefunctionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: zGrid.map(z => z.toFixed(2)),
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Quantum Well Wavefunctions' }
            },
            scales: {
                x: { title: { display: true, text: 'Position z (Å)' } },
                y: { title: { display: true, text: 'Wavefunction Amplitude' } }
            }
        }
    });
}

async function loadMaterialInfo(e) {
    const material = e.target.value;
    
    if (!material) {
        document.getElementById('materialInfoSection').classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`/api/material-info?material=${material}`);
        const data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('info-bandgap-well').textContent = data.band_gap.well.toFixed(4);
            document.getElementById('info-bandgap-barrier').textContent = data.band_gap.barrier.toFixed(4);
            document.getElementById('info-mass-well').textContent = data.effective_mass.well.toFixed(4);
            document.getElementById('info-mass-barrier').textContent = data.effective_mass.barrier.toFixed(4);
            document.getElementById('info-kane-well').textContent = data.kane_parameter.well.toFixed(4);
            document.getElementById('info-kane-barrier').textContent = data.kane_parameter.barrier.toFixed(4);
            document.getElementById('materialInfoSection').classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading material info:', error);
    }
}

function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    const submitBtn = document.getElementById('submitBtn');
    
    if (show) {
        spinner.classList.remove('hidden');
        submitBtn.disabled = true;
    } else {
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
    }
}

function showErrorMessage(msg) {
    const errorBox = document.getElementById('errorMessage');
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
}

function showSuccessMessage(msg) {
    const successBox = document.getElementById('successMessage');
    successBox.textContent = msg;
    successBox.classList.remove('hidden');
}

function clearMessages() {
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
}