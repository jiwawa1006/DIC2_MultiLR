# Multiple Linear Regression & Feature Selection Explorer (MLR)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-4f46e5?style=for-the-badge&logo=github)](https://jiwawa1006.github.io/DIC2_MultiLR/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python)](https://python.org)
[![Methodology](https://img.shields.io/badge/Methodology-CRISP--DM-10b981?style=for-the-badge)](https://en.wikipedia.org/wiki/Cross-industry_standard_process_for_data_mining)

> 🌐 **Live Demo Website**: **[https://jiwawa1006.github.io/DIC2_MultiLR/](https://jiwawa1006.github.io/DIC2_MultiLR/)**

An interactive, publication-quality web dashboard for Multiple Linear Regression and Feature Selection evaluation, deployed on **GitHub Pages**.

Supports interactive model diagnostics, parsimony analysis (Occam's razor), bias-variance tradeoff exploration, and dynamic dataset selection via a dropdown menu.

---

## 📸 Live Dashboard Preview

![Multiple Linear Regression Explorer Dashboard](assets/dashboard_preview.png)

---

## 🌟 Key Features

1. **Dynamic Dataset Dropdown (下拉選單)**:
   - Easily switch between datasets (currently `startups_50` and `boston_housing`).
   - Automatically adapts to any newly added datasets in `data/`.
2. **7 Feature Selection Algorithms**:
   - **Filter Methods**: Variance Threshold, Mutual Information
   - **Wrapper Methods**: Forward Stepwise Selection, Backward Elimination, Recursive Feature Elimination (RFE)
   - **Embedded Methods**: Lasso (L1 regularization), Elastic Net (L1 + L2)
   - **Compare All**: Overlay performance across all 7 algorithms simultaneously
3. **Interactive Visualizations (Chart.js)**:
   - Dynamic Train vs. Test RMSE curves with highlighted optimal parsimonious sweet spot $k^*$
   - Train vs. Test $R^2$ curves
4. **Fitted OLS Regression Equation**:
   - Real-time formatted mathematical equation ($y = \beta_0 + \beta_1 X_1 + \dots$)
5. **Statistical Tests & Coefficients Table**:
   - Parameter estimates ($\beta$), Standard Errors, t-statistics, p-values, 95% Confidence Intervals, and significance stars
6. **Live Value Predictor**:
   - Interactive slider and numeric inputs dynamically built from active features to test predictions in real-time
7. **Test Residual & Outlier Diagnostics**:
   - Out-of-sample sample ranking by absolute error $|y - \hat{y}|$ with diagnostic status dots

---

## 📁 Repository Structure

```
MLR/
├── assets/
│   └── dashboard_preview.png# Live dashboard screenshot preview
├── index.html               # Main dashboard HTML (GitHub Pages entrypoint)
├── index.css                # Polished modern stylesheet
├── app.js                   # Interactive controller and Chart.js integration
├── model_data.js            # Precomputed statistics & metrics for all datasets
├── export_web_data.py       # Exporter that updates model_data.js from data/ and fig/
├── plot_figure.py           # Core experiment pipeline & Matplotlib figure generator
├── feature_selector.py      # Feature selection algorithms & CV routines
├── data/                    # CSV datasets
│   ├── startups_50.csv
│   └── boston_housing.csv
├── fig/                     # Saved 300 DPI publication plots and metric CSVs
│   ├── startups_50/
│   └── boston_housing/
└── requirements.txt         # Python dependencies
```

---

## 🚀 How to Run & Preview Locally

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the experiments**:
   ```bash
   python plot_figure.py
   ```
   *This automatically runs feature selection, generates plots in `fig/`, and updates `model_data.js`.*

3. **Preview the web dashboard**:
   ```bash
   python -m http.server 8080
   ```
   Open your browser to [http://localhost:8080](http://localhost:8080).

---

## 🌐 Live GitHub Pages Deployment

The dashboard is automatically hosted on GitHub Pages:

👉 **[https://jiwawa1006.github.io/DIC2_MultiLR/](https://jiwawa1006.github.io/DIC2_MultiLR/)**

To deploy or update:
```bash
git add .
git commit -m "Update dashboard"
git push origin main
```
GitHub Pages automatically deploys from the `main` branch root `/`.

---

## ➕ How to Add New Datasets in the Future

1. Place your new CSV file in the `data/` folder (e.g. `data/my_new_data.csv`).
2. Run:
   ```bash
   python plot_figure.py
   ```
3. That's it! The script will automatically:
   - Identify or detect the target variable
   - Train and evaluate all 7 feature selection methods
   - Export plots and metrics
   - Append the new dataset into `model_data.js`
   - The frontend dropdown menu (**下拉選單**) will automatically list your new dataset!