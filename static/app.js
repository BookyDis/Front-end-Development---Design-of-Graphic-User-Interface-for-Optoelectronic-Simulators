
//Frontend logic for simulator

let potentialChart = null;
let wavefunctionChart = null;
let boundStateChart = null;
let energyDiffChart = null;
let qclChart = null;
let currentResults = null;

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('simulatorForm');
    form.addEventListener('submit', handleSubmit);
    
    //Load material info when material is selected
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
    
    //Display energy levels
    displayEnergyLevels(results.energies);
    
    //Display charts
    displayPotentialChart(results.z_grid, results.potential, results.wavefunctions, results.energies);
    displayWavefunctionChart(results.z_grid, results.wavefunctions, results.energies);
    displayBoundStateEnergies(results.energies);
    displayEnergyDifferences(results.energies);
    displayTwoQCLPeriods(results.z_grid, results.potential, results.wavefunctions, results.energies);
    
    //Show results sections
    document.getElementById('energyLevelsSection').classList.remove('hidden');
    document.getElementById('chartsSection').classList.remove('hidden');
}

function displayEnergyLevels(energies) {
    const tbody = document.getElementById('energyTableBody');
    tbody.innerHTML = '';
    
    energies.forEach((energy, index) => {
        const row = document.createElement('tr');
        const energyMeV = energy * 1000; //Convert eV to meV
        row.innerHTML = `
            <td>${index}</td>
            <td>${energy.toFixed(6)}</td>
            <td>${energyMeV.toFixed(3)}</td>
        `;
        tbody.appendChild(row);
    });
}

function displayPotentialChart(zGrid, potential, wavefunctions, energies) {
    const ctx = document.getElementById('potentialChart').getContext('2d');
    
    if (potentialChart) {
        potentialChart.destroy();
    }

    const wfColors = ['rgb(54, 162, 235)', 'rgb(255, 99, 132)', 'rgb(75, 192, 192)', 'rgb(255, 206, 86)', 'rgb(153, 102, 255)'];
    const WF_SCALE = 1000; //visual scale factor so |psi|^2 bumps are visible against the V(z) baseline

    const datasets = [{
        label: 'V(z)',
        data: zGrid.map((z, i) => ({ x: z, y: potential[i] * 1000 })),
        borderColor: 'rgb(100, 149, 237)',
        backgroundColor: 'rgba(100, 149, 237, 0.1)',
        borderWidth: 3,
        pointRadius: 0,
        tension: 0,
        fill: true
    }];

    wavefunctions.forEach((wf, idx) => {
        const E_meV = energies[idx] * 1000;
        datasets.push({
            label: `${E_meV.toFixed(2)} meV`,
            data: zGrid.map((z, i) => ({ x: z, y: WF_SCALE * wf[i] * wf[i] + E_meV })),
            borderColor: wfColors[idx % wfColors.length],
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.3,
            fill: false
        });
    });
    
    potentialChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Bandstructure Potential Profile' }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'Position z (Å)' } },
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
        data: Array.from(wf),
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

function displayBoundStateEnergies(energies) {
    const ctx = document.getElementById('boundStateEnergiesChart').getContext('2d');
    if (boundStateChart) boundStateChart.destroy();

    //Build dashed "stem" lines from 0 up to each energy, with gaps (null) between stems
    const stemPoints = [];
    energies.forEach((E, i) => {
        stemPoints.push({ x: i, y: 0 });
        stemPoints.push({ x: i, y: E * 1000 });
        stemPoints.push({ x: i, y: null });
    });
    const markerPoints = energies.map((E, i) => ({ x: i, y: E * 1000 }));

    boundStateChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    data: stemPoints,
                    borderColor: 'rgb(70, 90, 230)',
                    borderDash: [6, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    spanGaps: false
                },
                {
                    type: 'scatter',
                    data: markerPoints,
                    pointStyle: 'circle',
                    pointRadius: 8,
                    pointBorderColor: 'rgb(70, 90, 230)',
                    pointBackgroundColor: 'rgba(0,0,0,0)',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Bound state energies' }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: '#' } },
                y: { title: { display: true, text: 'E [meV]' }, beginAtZero: true }
            }
        }
    });
}

function displayEnergyDifferences(energies) {
    const ctx = document.getElementById('energyDifferencesChart').getContext('2d');
    if (energyDiffChart) energyDiffChart.destroy();

    if (energies.length < 2) {
        energyDiffChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: {
                plugins: { title: { display: true, text: 'Energy differences (need 2+ states)' } }
            }
        });
        return;
    }

    //Reproduces the desktop tool's transition labeling scheme
    const freqsTHz = [];
    const tickLabels = [];
    for (let j = 0; j < energies.length - 1; j++) {
        const deltaMeV = (energies[j + 1] - energies[j]) * 1000;
        freqsTHz.push(deltaMeV / 4.1356);
        const i = j + 1;
        tickLabels.push(i < 10 ? (11 * i + 10) : (101 * i + 100));
    }

    const stemPoints = [];
    freqsTHz.forEach((f, j) => {
        stemPoints.push({ x: j, y: 0 });
        stemPoints.push({ x: j, y: f });
        stemPoints.push({ x: j, y: null });
    });
    const markerPoints = freqsTHz.map((f, j) => ({ x: j, y: f }));

    energyDiffChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    data: stemPoints,
                    borderColor: 'rgb(220, 53, 69)',
                    borderDash: [6, 4],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    spanGaps: false
                },
                {
                    type: 'scatter',
                    data: markerPoints,
                    pointStyle: 'circle',
                    pointRadius: 8,
                    pointBorderColor: 'rgb(220, 53, 69)',
                    pointBackgroundColor: 'rgba(0,0,0,0)',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Energy differences' }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'fi' },
                    ticks: {
                        stepSize: 1,
                        callback: (value) => {
                            const idx = Math.round(value);
                            return tickLabels[idx] !== undefined ? tickLabels[idx] : '';
                        }
                    }
                },
                y: { title: { display: true, text: 'f [THz]' } }
            }
        }
    });
}

function displayTwoQCLPeriods(zGrid, potential, wavefunctions, energies) {
    const ctx = document.getElementById('qclPeriodsChart').getContext('2d');
    if (qclChart) qclChart.destroy();

    const n = zGrid.length;
    const Lper = zGrid[n - 1] - zGrid[0];
    const dropPerPeriod_meV = (potential[0] - potential[n - 1]) * 1000;

    const periodColors = ['rgb(54, 162, 235)', 'rgb(220, 53, 69)'];
    const wfColors = ['rgb(75, 192, 192)', 'rgb(255, 159, 64)', 'rgb(153, 102, 255)', 'rgb(255, 206, 86)'];
    const datasets = [];

    for (let p = 0; p < 2; p++) {
        const shift = (p - 1) * Lper;                    
        const baseOffset = dropPerPeriod_meV * (1 - p);    

        datasets.push({
            label: 'V(z)',
            data: zGrid.map((z, i) => ({ x: z + shift, y: potential[i] * 1000 + baseOffset })),
            borderColor: periodColors[p],
            borderWidth: 3,
            pointRadius: 0,
            tension: 0,
            fill: false
        });

        wavefunctions.forEach((wf, idx) => {
            const E_meV = energies[idx] * 1000 + baseOffset;
            datasets.push({
                label: `${(energies[idx] * 1000).toFixed(2)} meV`,
                data: zGrid.map((z, i) => ({ x: z + shift, y: 1000 * wf[i] * wf[i] + E_meV })),
                borderColor: wfColors[idx % wfColors.length],
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.3,
                fill: false
            });
        });
    }

    qclChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Two QCL Periods' }
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'z [Å]' } },
                y: { title: { display: true, text: 'V [meV]' } }
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