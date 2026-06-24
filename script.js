const METRICS_FILE = 'model_metrics.json';
const charts = {};
let dashboardData;

const palette = ['#2563eb', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444', '#22c55e'];
const metricLabels = {
  accuracy: 'Accuracy',
  precision: 'Precision',
  recall: 'Recall',
  f1Score: 'F1 Score',
  rocArea: 'ROC Area',
  kappaStatistic: 'Kappa Statistic',
  meanAbsoluteError: 'Mean Absolute Error',
  rootMeanSquaredError: 'Root Mean Squared Error'
};

document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupExport();
  loadDashboard();
});

async function loadDashboard() {
  const status = document.getElementById('status');
  try {
    const response = await fetch(METRICS_FILE);
    if (!response.ok) throw new Error(`Unable to load ${METRICS_FILE}`);
    dashboardData = await response.json();
    setupModelSelector();
    renderModel(dashboardData.models[0]);
    renderComparison();
    renderMetricsTable();
    revealDashboard();
    status.classList.add('hidden');
  } catch (error) {
    status.textContent = error.message;
  }
}

function setupExport() {
  document.getElementById('exportPdf').addEventListener('click', () => {
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
    }, 150);
  });
}

function revealDashboard() {
  document.querySelectorAll('.info-card, .kpi-card, .panel').forEach((element, index) => {
    element.style.animationDelay = `${Math.min(index * 45, 420)}ms`;
  });
}

function setupModelSelector() {
  const select = document.getElementById('modelSelect');
  select.innerHTML = dashboardData.models.map(model => `<option value="${model.id}">${model.algorithm}</option>`).join('');
  select.addEventListener('change', () => renderModel(dashboardData.models.find(model => model.id === select.value)));
}

function renderModel(model) {
  const { dataset } = dashboardData;
  document.getElementById('algorithmName').textContent = model.algorithm;
  document.getElementById('datasetName').textContent = dataset.name;
  document.getElementById('instances').textContent = dataset.instances.toLocaleString();
  document.getElementById('attributes').textContent = dataset.attributes.toLocaleString();

  renderKpis(model);
  renderGauge(model.metrics.accuracy);
  renderClassDistribution(model);
  renderConfusionMatrix(model);
}

function renderKpis(model) {
  const keys = ['accuracy', 'precision', 'recall', 'f1Score', 'rocArea', 'kappaStatistic', 'meanAbsoluteError', 'rootMeanSquaredError'];
  document.getElementById('performance').innerHTML = keys.map(key => `
    <article class="kpi-card">
      <span class="kpi-label">${metricLabels[key]}</span>
      <div class="kpi-value">${formatMetric(model.metrics[key], key)}</div>
    </article>
  `).join('');
}

function renderGauge(accuracy) {
  const gauge = document.getElementById('accuracyGauge');
  const value = Number.isFinite(accuracy) ? accuracy : 0;
  gauge.style.background = `conic-gradient(var(--accent) ${value * 3.6}deg, var(--surface-2) 0deg)`;
  gauge.querySelector('span').textContent = Number.isFinite(accuracy) ? `${accuracy.toFixed(1)}%` : 'N/A';
}

function renderComparison() {
  const supervised = dashboardData.models.filter(model => Number.isFinite(model.metrics.accuracy));
  drawChart('comparisonChart', {
    type: 'bar',
    data: {
      labels: supervised.map(model => model.algorithm),
      datasets: [
        { label: 'Accuracy %', data: supervised.map(model => model.metrics.accuracy), backgroundColor: palette[0], borderRadius: 10 },
        { label: 'ROC Area x100', data: supervised.map(model => model.metrics.rocArea * 100), backgroundColor: palette[1], borderRadius: 10 },
        { label: 'F1 x100', data: supervised.map(model => model.metrics.f1Score == null ? null : model.metrics.f1Score * 100), backgroundColor: palette[2], borderRadius: 10 }
      ]
    },
    options: chartOptions({ scales: { y: { beginAtZero: true, max: 100, grid: { color: cssVar('--line') } }, x: { grid: { display: false } } } })
  });
}

function renderClassDistribution(model) {
  const matrix = model.confusionMatrix?.matrix;
  if (matrix) {
    const actualCounts = matrix.map(row => row.reduce((total, value) => total + value, 0));
    drawPie('classChart', model.confusionMatrix.labels, actualCounts);
    return;
  }

  const clusters = model.clusterDistribution || [];
  drawPie('classChart', clusters.map(item => item.cluster), clusters.map(item => item.count));
}

function renderConfusionMatrix(model) {
  const target = document.getElementById('confusionMatrix');
  if (!model.confusionMatrix) {
    const clusters = model.clusterDistribution || [];
    target.innerHTML = `<p class="subtitle">KMeans is an unsupervised clusterer, so no confusion matrix is available. Cluster distribution: ${clusters.map(item => `${item.cluster}: ${item.count}`).join(', ')}.</p>`;
    return;
  }

  const labels = model.confusionMatrix.labels;
  const values = model.confusionMatrix.matrix.flat();
  const max = Math.max(...values);
  target.innerHTML = `
    <div class="matrix-grid">
      <div></div>
      ${labels.map(label => `<div class="matrix-cell matrix-label">Predicted ${label}</div>`).join('')}
      ${model.confusionMatrix.matrix.map((row, rowIndex) => `
        <div class="matrix-cell matrix-label">Actual ${labels[rowIndex]}</div>
        ${row.map(value => `<div class="matrix-cell" style="background:${heatColor(value, max)}"><strong>${value}</strong><span>${percent(value, row.reduce((a, b) => a + b, 0))}</span></div>`).join('')}
      `).join('')}
    </div>
  `;
}

function renderMetricsTable() {
  document.getElementById('metricsTable').innerHTML = dashboardData.models.map(model => `
    <tr>
      <td>${model.algorithm}</td>
      <td>${formatMetric(model.metrics.accuracy, 'accuracy')}</td>
      <td>${formatMetric(model.metrics.precision, 'precision')}</td>
      <td>${formatMetric(model.metrics.recall, 'recall')}</td>
      <td>${formatMetric(model.metrics.f1Score, 'f1Score')}</td>
      <td>${formatMetric(model.metrics.rocArea, 'rocArea')}</td>
      <td>${formatMetric(model.metrics.kappaStatistic, 'kappaStatistic')}</td>
      <td>${formatMetric(model.metrics.meanAbsoluteError, 'meanAbsoluteError')}</td>
      <td>${formatMetric(model.metrics.rootMeanSquaredError, 'rootMeanSquaredError')}</td>
    </tr>
  `).join('');
}

function drawPie(id, labels, data) {
  drawChart(id, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: palette, borderWidth: 0 }] },
    options: chartOptions({ cutout: '62%' })
  });
}

function drawChart(id, config) {
  charts[id]?.destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function chartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    color: cssVar('--text'),
    plugins: { legend: { labels: { color: cssVar('--text'), usePointStyle: true } } },
    ...extra
  };
}

function setupTheme() {
  const saved = localStorage.getItem('weka-dashboard-theme');
  if (saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches)) document.body.classList.add('dark');
  document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark');
    localStorage.setItem('weka-dashboard-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    if (dashboardData) {
      renderComparison();
      renderClassDistribution(dashboardData.models.find(model => model.id === document.getElementById('modelSelect').value));
    }
  });
}

function formatMetric(value, key) {
  if (!Number.isFinite(value)) return 'N/A';
  if (key === 'accuracy') return `${value.toFixed(2)}%`;
  return value.toFixed(value >= 10 ? 2 : 3);
}

function percent(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : '0%';
}

function heatColor(value, max) {
  const opacity = max ? 0.12 + (value / max) * 0.68 : 0.12;
  return `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, var(--surface))`;
}

function cssVar(name) {
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}
