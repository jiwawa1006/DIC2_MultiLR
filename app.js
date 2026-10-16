// app.js - Controller for Multiple Linear Regression Explorer

(function () {
  'use strict';

  // Global State
  let currentDatasetId = 'startups_50';
  let currentAlgo = 'lasso';
  let currentK = 2;
  let rmseChart = null;
  let r2Chart = null;

  const ALGO_COLORS = {
    lasso: '#4f46e5',
    forward: '#f97316',
    backward: '#06b6d4',
    rfe: '#10b981',
    elastic_net: '#ec4899',
    mutual_information: '#8b5cf6',
    variance_threshold: '#64748b',
  };

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });

  function initApp() {
    if (!window.DATASETS_DATA || Object.keys(window.DATASETS_DATA).length === 0) {
      console.error('No dataset data found in window.DATASETS_DATA.');
      alert('Error: model_data.js was not loaded or contains no data. Please run export_web_data.py.');
      return;
    }

    populateDatasetDropdown();
    setupGlobalEventListeners();
    loadDataset(currentDatasetId);
  }

  // Populate Dropdown Menu (下拉選單)
  function populateDatasetDropdown() {
    const select = document.getElementById('datasetSelect');
    select.innerHTML = '';

    const datasets = window.DATASETS_DATA;
    const datasetIds = Object.keys(datasets);

    // Prefer startups_50 first if present, otherwise first available
    if (datasets['startups_50']) {
      currentDatasetId = 'startups_50';
    } else {
      currentDatasetId = datasetIds[0];
    }

    datasetIds.forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = datasets[id].name || id;
      if (id === currentDatasetId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      loadDataset(e.target.value);
    });
  }

  function setupGlobalEventListeners() {
    // Static plot drawer toggle
    const toggleBtn = document.getElementById('togglePlotsBtn');
    const drawerToggle = document.getElementById('plotDrawerToggle');
    const drawerBody = document.getElementById('plotDrawerBody');
    const drawerIcon = document.getElementById('plotDrawerIcon');

    const toggleDrawer = () => {
      const isHidden = drawerBody.style.display === 'none';
      drawerBody.style.display = isHidden ? 'block' : 'none';
      drawerIcon.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
      toggleBtn.querySelector('span').textContent = isHidden ? 'Hide Figures' : 'Show Figures';
    };

    drawerToggle.addEventListener('click', toggleDrawer);
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDrawer();
    });
  }

  // Load / Switch Dataset
  function loadDataset(datasetId) {
    const ds = window.DATASETS_DATA[datasetId];
    if (!ds) return;

    currentDatasetId = datasetId;

    // Reset default algo and k to sweet spot
    const availableAlgos = Object.keys(ds.methods);
    if (!availableAlgos.includes(currentAlgo)) {
      currentAlgo = availableAlgos[0] || 'lasso';
    }

    const sweet = ds.sweet_spot || { k: 2, method: currentAlgo };
    currentK = sweet.k || 2;
    if (availableAlgos.includes(sweet.method)) {
      currentAlgo = sweet.method;
    }

    // Update Header & Breadcrumb
    document.getElementById('breadcrumbDataset').textContent = ds.name;
    document.getElementById('headerTitle').textContent = `${ds.name} MLR Explorer`;

    // Update Hero Banner
    document.getElementById('heroTitle').textContent = `${ds.name} - Feature Progression & Model Parsimony`;
    document.getElementById('heroDesc').textContent = ds.description;
    document.getElementById('heroDatasetName').textContent = ds.name;
    document.getElementById('heroSamples').textContent = `${ds.total_samples} (${ds.train_samples} Train / ${ds.test_samples} Test)`;
    document.getElementById('heroPredictors').textContent = `${ds.n_encoded_features} Encoded Features`;

    const unitStr = ds.unit ? ` (${ds.unit})` : '';
    document.getElementById('heroSweetSpot').textContent = `k=${sweet.k} via ${sweet.method.toUpperCase()} (${formatNumber(sweet.test_rmse, ds.unit)})`;

    // Render Algorithm Tabs
    renderAlgorithmTabs(ds);

    // Update UI for current selection
    updateAlgorithmSelection();
  }

  function renderAlgorithmTabs(ds) {
    const tabsContainer = document.getElementById('algoTabs');
    tabsContainer.innerHTML = '';

    const methods = ds.methods;
    Object.keys(methods).forEach((mKey) => {
      const mObj = methods[mKey];
      const btn = document.createElement('button');
      btn.className = `tab-btn ${mKey === currentAlgo ? 'active' : ''}`;
      btn.dataset.algo = mKey;
      btn.innerHTML = `
        <i class="fa-solid fa-code-branch"></i>
        <span>${mObj.name}</span>
        <span class="badge-pill">${mObj.badge}</span>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('#algoTabs .tab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentAlgo = mKey;
        updateAlgorithmSelection();
      });
      tabsContainer.appendChild(btn);
    });

    // "Compare All Methods" tab
    const allBtn = document.createElement('button');
    allBtn.className = `tab-btn ${currentAlgo === 'ALL' ? 'active' : ''}`;
    allBtn.dataset.algo = 'ALL';
    allBtn.style.borderLeft = '2px solid var(--primary)';
    allBtn.innerHTML = `
      <i class="fa-solid fa-layer-group" style="color: #fbbf24;"></i>
      <span>Compare All 7 Methods</span>
      <span class="badge-pill">Overview</span>
    `;
    allBtn.addEventListener('click', () => {
      document.querySelectorAll('#algoTabs .tab-btn').forEach((b) => b.classList.remove('active'));
      allBtn.classList.add('active');
      currentAlgo = 'ALL';
      updateAlgorithmSelection();
    });
    tabsContainer.appendChild(allBtn);
  }

  function updateAlgorithmSelection() {
    const ds = window.DATASETS_DATA[currentDatasetId];
    if (!ds) return;

    renderKButtons(ds);
    renderDashboardMetrics(ds);
    renderActivePredictors(ds);
    renderCharts(ds);
    renderEquation(ds);
    renderCoefficientsTable(ds);
    renderLiveCalculator(ds);
    renderOutliersTable(ds);
    updateStaticPlots(ds);
  }

  function renderKButtons(ds) {
    const kContainer = document.getElementById('kSelectorGroup');
    kContainer.innerHTML = '';

    const methodData = currentAlgo === 'ALL'
      ? (ds.methods['lasso'] ? ds.methods['lasso'].data : Object.values(ds.methods)[0].data)
      : ds.methods[currentAlgo].data;

    const sweetK = ds.sweet_spot.k || 2;
    const maxK = methodData.length;

    methodData.forEach((row) => {
      const k = row.k;
      const btn = document.createElement('button');
      const isSweet = k === sweetK;
      const isOverfit = k === maxK && maxK >= 4;

      let extraClass = '';
      if (isSweet) extraClass += ' sweet-spot';
      if (isOverfit && !isSweet) extraClass += ' overfitting';
      if (k === currentK) extraClass += ' active';

      btn.className = `k-btn${extraClass}`;
      btn.dataset.k = k;

      let labelExtra = '';
      if (isSweet) {
        labelExtra = ' ★ Optimal';
      } else if (isOverfit) {
        labelExtra = ' (Full Model)';
      }

      btn.innerHTML = `<span>k = ${k}${labelExtra}</span>`;

      btn.addEventListener('click', () => {
        document.querySelectorAll('#kSelectorGroup .k-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentK = k;
        updateKSelection();
      });

      kContainer.appendChild(btn);
    });
  }

  function updateKSelection() {
    const ds = window.DATASETS_DATA[currentDatasetId];
    if (!ds) return;

    renderDashboardMetrics(ds);
    renderActivePredictors(ds);
    renderCharts(ds);
    renderEquation(ds);
    renderCoefficientsTable(ds);
    renderLiveCalculator(ds);
    renderOutliersTable(ds);
  }

  function getActiveRowData(ds) {
    const methodObj = currentAlgo === 'ALL'
      ? (ds.methods['lasso'] || Object.values(ds.methods)[0])
      : ds.methods[currentAlgo];

    if (!methodObj || !methodObj.data) return null;
    return methodObj.data.find((d) => d.k === currentK) || methodObj.data[0];
  }

  function renderDashboardMetrics(ds) {
    const row = getActiveRowData(ds);
    if (!row) return;

    const unit = ds.unit || '';
    const isSweet = row.k === ds.sweet_spot.k;

    // RMSE
    document.getElementById('valRMSE').textContent = formatNumber(row.test_rmse, unit);
    const rmseBadge = document.getElementById('rmseBadge');
    if (isSweet) {
      rmseBadge.innerHTML = '<i class="fa-solid fa-award"></i> Optimal';
      rmseBadge.className = 'badge-tag badge-green';
    } else {
      rmseBadge.innerHTML = `k=${row.k}`;
      rmseBadge.className = 'badge-tag badge-slate';
    }

    // R2
    document.getElementById('valR2').textContent = row.test_r2.toFixed(4);
    const pctFit = Math.max(0, row.test_r2 * 100).toFixed(1);
    document.getElementById('r2Badge').innerHTML = `<i class="fa-solid fa-circle-check"></i> ${pctFit}% Fit`;
    document.getElementById('r2VarianceNote').textContent = `Explains ${pctFit}% of ${ds.target} variance`;

    // Adj R2
    document.getElementById('valAdjR2').textContent = row.adj_r2.toFixed(4);

    // MAE
    document.getElementById('valMAE').textContent = formatNumber(row.mae, unit);

    // CV RMSE
    document.getElementById('valCVRMSE').textContent = formatNumber(row.cv_rmse, unit);

    // F-Stat
    const fVal = row.f_stat ? row.f_stat.toFixed(1) : 'N/A';
    const fP = row.f_pvalue < 0.001 ? 'p < 0.001' : `p = ${row.f_pvalue.toFixed(3)}`;
    document.getElementById('fStatBadge').textContent = `F = ${fVal} (${fP})`;
  }

  function renderActivePredictors(ds) {
    const row = getActiveRowData(ds);
    if (!row) return;

    document.getElementById('featuresCount').textContent = row.features.length;
    const chipsBox = document.getElementById('featuresListChips');
    chipsBox.innerHTML = '';

    row.features.forEach((feat) => {
      const chip = document.createElement('span');
      chip.className = 'feature-chip';
      chip.textContent = feat;
      chipsBox.appendChild(chip);
    });

    const isSweet = row.k === ds.sweet_spot.k;
    const parsimony = document.getElementById('parsimonyNotice');
    if (isSweet) {
      parsimony.className = 'badge-tag badge-green parsimony-badge';
      parsimony.innerHTML = `<i class="fa-solid fa-star"></i> Occam's Razor: Optimal sweet spot (k=${row.k}) achieves lowest test error without overfitting.`;
    } else if (row.k > ds.sweet_spot.k) {
      parsimony.className = 'badge-tag badge-slate parsimony-badge';
      parsimony.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-amber);"></i> Model complexity increased: adding extra variables increases variance and test error.`;
    } else {
      parsimony.className = 'badge-tag badge-slate parsimony-badge';
      parsimony.innerHTML = `<i class="fa-solid fa-info-circle"></i> Under-parameterized model (k=${row.k}): higher bias.`;
    }
  }

  // Render Chart.js Visualizations
  function renderCharts(ds) {
    const ctxRMSE = document.getElementById('rmseChart').getContext('2d');
    const ctxR2 = document.getElementById('r2Chart').getContext('2d');

    if (rmseChart) rmseChart.destroy();
    if (r2Chart) r2Chart.destroy();

    const isCompareAll = currentAlgo === 'ALL';
    const ks = [1, 2, 3, 4, 5];

    document.getElementById('rmseChartBadge').textContent = isCompareAll ? 'Comparing 7 Methods' : ds.methods[currentAlgo].name;
    document.getElementById('r2ChartBadge').textContent = isCompareAll ? 'Comparing 7 Methods' : ds.methods[currentAlgo].name;

    if (!isCompareAll) {
      const methodData = ds.methods[currentAlgo].data;
      const trainRMSE = methodData.map((d) => d.train_rmse);
      const testRMSE = methodData.map((d) => d.test_rmse);
      const trainR2 = methodData.map((d) => d.train_r2);
      const testR2 = methodData.map((d) => d.test_r2);
      const labels = methodData.map((d) => `k=${d.k}`);

      // RMSE Chart
      rmseChart = new Chart(ctxRMSE, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Train RMSE',
              data: trainRMSE,
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              borderDash: [5, 5],
              pointRadius: 4,
              tension: 0.2,
            },
            {
              label: 'Test RMSE',
              data: testRMSE,
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              pointRadius: 6,
              pointBackgroundColor: labels.map((_, i) => (methodData[i].k === currentK ? '#f43f5e' : '#4f46e5')),
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.2,
            },
          ],
        },
        options: getChartOptions('RMSE', ds.unit),
      });

      // R2 Chart
      r2Chart = new Chart(ctxR2, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Train R²',
              data: trainR2,
              borderColor: '#94a3b8',
              backgroundColor: 'rgba(148, 163, 184, 0.1)',
              borderDash: [5, 5],
              pointRadius: 4,
              tension: 0.2,
            },
            {
              label: 'Test R²',
              data: testR2,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              pointRadius: 6,
              pointBackgroundColor: labels.map((_, i) => (methodData[i].k === currentK ? '#f43f5e' : '#10b981')),
              pointBorderColor: '#fff',
              pointBorderWidth: 2,
              tension: 0.2,
            },
          ],
        },
        options: getChartOptions('R² Score', ''),
      });
    } else {
      // Compare All 7 Methods Overlay
      const rmseDatasets = [];
      const r2Datasets = [];

      Object.keys(ds.methods).forEach((mKey) => {
        const m = ds.methods[mKey];
        const color = ALGO_COLORS[mKey] || '#64748b';
        rmseDatasets.push({
          label: m.name,
          data: m.data.map((d) => d.test_rmse),
          borderColor: color,
          backgroundColor: 'transparent',
          pointRadius: 4,
          tension: 0.2,
        });
        r2Datasets.push({
          label: m.name,
          data: m.data.map((d) => d.test_r2),
          borderColor: color,
          backgroundColor: 'transparent',
          pointRadius: 4,
          tension: 0.2,
        });
      });

      rmseChart = new Chart(ctxRMSE, {
        type: 'line',
        data: {
          labels: ks.map((k) => `k=${k}`),
          datasets: rmseDatasets,
        },
        options: getChartOptions('Test RMSE (Comparison)', ds.unit),
      });

      r2Chart = new Chart(ctxR2, {
        type: 'line',
        data: {
          labels: ks.map((k) => `k=${k}`),
          datasets: r2Datasets,
        },
        options: getChartOptions('Test R² (Comparison)', ''),
      });
    }
  }

  function getChartOptions(yTitle, unit) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              return `${context.dataset.label}: ${typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : val} ${unit}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 11, weight: '600' } },
        },
        y: {
          title: {
            display: true,
            text: yTitle,
            font: { family: "'Outfit', sans-serif", size: 12, weight: '600' },
          },
          grid: { color: 'rgba(226, 232, 240, 0.8)' },
          ticks: { font: { family: "'Inter', sans-serif", size: 11 } },
        },
      },
    };
  }

  // Render Fitted Mathematical Equation Box
  function renderEquation(ds) {
    const row = getActiveRowData(ds);
    if (!row || !row.coefficients) return;

    const coefs = row.coefficients;
    const intercept = coefs.find((c) => c.feature.includes('Intercept')) || coefs[0];
    const slopeCoefs = coefs.filter((c) => !c.feature.includes('Intercept'));

    let formulaHtml = `<span class="equation-var">${ds.target}</span> = <span class="equation-coef">${intercept.coef.toFixed(4)}</span>`;

    slopeCoefs.forEach((c) => {
      const sign = c.coef >= 0 ? '+' : '-';
      const absVal = Math.abs(c.coef).toFixed(4);
      formulaHtml += ` ${sign} <span class="equation-coef">${absVal}</span> × (<span class="equation-var">${c.feature}</span>)`;
    });

    document.getElementById('equationBox').innerHTML = formulaHtml;
  }

  // Render Coefficients & Statistical Significance Table
  function renderCoefficientsTable(ds) {
    const row = getActiveRowData(ds);
    const tbody = document.getElementById('coefTableBody');
    tbody.innerHTML = '';

    if (!row || !row.coefficients) return;

    row.coefficients.forEach((c) => {
      const tr = document.createElement('tr');

      let star = 'NS';
      let starColor = 'var(--slate-400)';
      if (c.pvalue < 0.001) {
        star = '***';
        starColor = 'var(--accent-emerald)';
      } else if (c.pvalue < 0.01) {
        star = '**';
        starColor = 'var(--accent-emerald)';
      } else if (c.pvalue < 0.05) {
        star = '*';
        starColor = 'var(--accent-amber)';
      }

      const pStr = c.pvalue < 0.0001 ? '< 0.0001' : c.pvalue.toFixed(4);

      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--slate-900);">${c.feature}</td>
        <td class="mono">${c.coef.toFixed(4)}</td>
        <td class="mono">${c.stderr.toFixed(4)}</td>
        <td class="mono">${c.tstat.toFixed(3)}</td>
        <td class="mono" style="color: ${c.pvalue < 0.05 ? 'var(--primary)' : 'inherit'}; font-weight: ${c.pvalue < 0.05 ? '700' : 'normal'};">${pStr}</td>
        <td class="mono" style="font-size: 11.5px; color: var(--slate-500);">[${c.ci_lower.toFixed(2)}, ${c.ci_upper.toFixed(2)}]</td>
        <td><span style="font-weight: 700; color: ${starColor};">${star}</span></td>
      `;

      tbody.appendChild(tr);
    });
  }

  // Render Interactive Live Predictor Calculator
  function renderLiveCalculator(ds) {
    const row = getActiveRowData(ds);
    const container = document.getElementById('calculatorInputsContainer');
    container.innerHTML = '';

    document.getElementById('predTargetLabel').textContent = `${ds.target} (${ds.unit || ''})`;

    if (!row || !row.features) return;

    row.features.forEach((feat) => {
      const stats = (ds.feature_stats && ds.feature_stats[feat]) || {
        min: 0,
        max: 100,
        step: 1,
        default: 50,
      };

      const group = document.createElement('div');
      group.className = 'input-group';

      const inputId = `calc_num_${feat.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const sliderId = `calc_range_${feat.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const labelId = `calc_val_${feat.replace(/[^a-zA-Z0-9]/g, '_')}`;

      group.innerHTML = `
        <div class="input-label-row">
          <span>${feat}</span>
          <span id="${labelId}" style="color: var(--primary); font-family: var(--font-mono); font-size: 12px;">${stats.default.toFixed(2)}</span>
        </div>
        <input type="number" id="${inputId}" class="input-field" value="${stats.default}" min="${stats.min}" max="${stats.max}" step="${stats.step}">
        <input type="range" id="${sliderId}" class="range-slider" value="${stats.default}" min="${stats.min}" max="${stats.max}" step="${stats.step}">
      `;

      container.appendChild(group);

      const numInput = group.querySelector(`#${inputId}`);
      const rangeInput = group.querySelector(`#${sliderId}`);
      const valLabel = group.querySelector(`#${labelId}`);

      numInput.addEventListener('input', () => {
        rangeInput.value = numInput.value;
        valLabel.textContent = Number(numInput.value).toFixed(2);
        calculatePrediction(ds, row);
      });

      rangeInput.addEventListener('input', () => {
        numInput.value = rangeInput.value;
        valLabel.textContent = Number(rangeInput.value).toFixed(2);
        calculatePrediction(ds, row);
      });
    });

    calculatePrediction(ds, row);
  }

  function calculatePrediction(ds, row) {
    if (!row || !row.coefficients) return;

    const coefs = row.coefficients;
    const interceptObj = coefs.find((c) => c.feature.includes('Intercept')) || coefs[0];
    let yHat = interceptObj.coef;

    row.features.forEach((feat) => {
      const inputId = `calc_num_${feat.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const el = document.getElementById(inputId);
      const val = el ? parseFloat(el.value) || 0 : 0;

      const coefObj = coefs.find((c) => c.feature === feat);
      if (coefObj) {
        yHat += coefObj.coef * val;
      }
    });

    document.getElementById('predOutputValue').textContent = formatNumber(yHat, ds.unit);
  }

  // Render Outliers Diagnostics Table
  function renderOutliersTable(ds) {
    const row = getActiveRowData(ds);
    const tbody = document.getElementById('outliersTableBody');
    tbody.innerHTML = '';

    if (!row || !row.outliers) return;

    row.outliers.forEach((item) => {
      const tr = document.createElement('tr');

      let dotClass = 'dot-green';
      let statusText = 'Normal';

      if (item.status === 'alert' || item.pct_error > 15) {
        dotClass = 'dot-red';
        statusText = 'High Residual';
      } else if (item.status === 'warning' || item.pct_error > 8) {
        dotClass = 'dot-amber';
        statusText = 'Moderate';
      }

      tr.innerHTML = `
        <td class="mono" style="font-weight: 700;">#${item.rank}</td>
        <td class="mono">Sample [${item.index}]</td>
        <td class="mono">${formatNumber(item.actual, ds.unit)}</td>
        <td class="mono">${formatNumber(item.predicted, ds.unit)}</td>
        <td class="mono" style="color: ${item.residual < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}; font-weight: 600;">
          ${item.residual >= 0 ? '+' : ''}${formatNumber(item.residual, ds.unit)}
        </td>
        <td class="mono">${formatNumber(item.abs_error, ds.unit)}</td>
        <td class="mono">${item.pct_error.toFixed(2)}%</td>
        <td>
          <span class="status-dot ${dotClass}"></span>
          <span style="font-size: 12px; font-weight: 600;">${statusText}</span>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  // Update Static High-Res Figures
  function updateStaticPlots(ds) {
    const algoKey = currentAlgo === 'ALL' ? 'lasso' : currentAlgo;
    const rmsePath = `fig/${ds.id}/${algoKey}.png`;
    const r2Path = `fig/${ds.id}/${algoKey}_r2.png`;

    const imgRMSE = document.getElementById('staticPlotRMSE');
    const linkRMSE = document.getElementById('staticPlotRMSELink');
    const imgR2 = document.getElementById('staticPlotR2');
    const linkR2 = document.getElementById('staticPlotR2Link');

    imgRMSE.src = rmsePath;
    linkRMSE.href = rmsePath;

    imgR2.src = r2Path;
    linkR2.href = r2Path;
  }

  function formatNumber(num, unit) {
    if (typeof num !== 'number' || isNaN(num)) return 'N/A';
    const isCurrency = unit === '$';
    const prefix = isCurrency ? '$' : '';
    const suffix = !isCurrency && unit ? ` ${unit}` : '';

    return `${prefix}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
  }

})();
