document.addEventListener('DOMContentLoaded', () => {
    const SVG_NS = "http://www.w3.org/2000/svg";
    let currentMonth = 0;
    let autoPlayInterval = null;
    let gameStartDate = "2024-01";
    
    let products = [{ 
        id: 1, name: 'Able', baseX: 5.5, baseY: 14.5, baseAge: 2.0, baseMTBF: 17000, basePrice: 28.0,
        revisions: [] 
    }];
    let productCounter = 2;
    let activeTab = 'summary';

    const segments = {
        traditional: { name: "Traditional", initX: 5.0, initY: 15.0, driftX: 0.7, driftY: -0.7, offsetX: 0.0, offsetY: 0.0, baseDemand: 7387, growthRate: 9.2, colorClass: "trad-color", colorHex: "#2563eb", estimatedShare: Array(9).fill(16.0), criteria: { idealAge: 2.0, priceMin: 20.0, priceMax: 30.0, mtbfMin: 14000, mtbfMax: 19000, wp: 21, wa: 47, wpr: 23, wm: 9 } },
        lowEnd: { name: "Low End", initX: 2.5, initY: 17.5, driftX: 0.5, driftY: -0.5, offsetX: -0.8, offsetY: 0.8, baseDemand: 8975, growthRate: 11.7, colorClass: "low-color", colorHex: "#8b5cf6", estimatedShare: Array(9).fill(16.0), criteria: { idealAge: 7.0, priceMin: 15.0, priceMax: 25.0, mtbfMin: 12000, mtbfMax: 17000, wp: 16, wa: 24, wpr: 53, wm: 7 } },
        highEnd: { name: "High End", initX: 7.5, initY: 12.5, driftX: 0.9, driftY: -0.9, offsetX: 1.4, offsetY: -1.4, baseDemand: 2554, growthRate: 16.2, colorClass: "high-color", colorHex: "#ec4899", estimatedShare: Array(9).fill(16.0), criteria: { idealAge: 0.0, priceMin: 30.0, priceMax: 40.0, mtbfMin: 23000, mtbfMax: 28000, wp: 43, wa: 29, wpr: 9, wm: 19 } },
        performance: { name: "Performance", initX: 8.0, initY: 17.0, driftX: 1.0, driftY: -0.2, offsetX: 1.4, offsetY: -0.2, baseDemand: 1915, growthRate: 19.8, colorClass: "perf-color", colorHex: "#f59e0b", estimatedShare: Array(9).fill(16.0), criteria: { idealAge: 1.0, priceMin: 25.0, priceMax: 35.0, mtbfMin: 22000, mtbfMax: 27000, wp: 29, wa: 9, wpr: 19, wm: 43 } },
        size: { name: "Size", initX: 3.0, initY: 12.0, driftX: 0.4, driftY: -1.0, offsetX: 0.4, offsetY: -1.0, baseDemand: 1984, growthRate: 18.3, colorClass: "size-color", colorHex: "#10b981", estimatedShare: Array(9).fill(16.0), criteria: { idealAge: 1.5, priceMin: 25.0, priceMax: 35.0, mtbfMin: 16000, mtbfMax: 21000, wp: 43, wa: 29, wpr: 9, wm: 19 } }
    };
    
    // UI Elements
    const startDateInput = document.getElementById('start-date');
    const productsContainer = document.getElementById('products-container');
    const segmentsContainer = document.getElementById('segments-container');
    const demandContainer = document.getElementById('demand-container');
    const configsContainer = document.getElementById('configs-container');
    const tabNavs = document.querySelectorAll('.tab-btn');
    const mapTitle = document.getElementById('map-title');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const fileImport = document.getElementById('file-import');
    
    const roundControls = {
        slider: document.getElementById('time-slider'),
        btnNext: document.getElementById('btn-next'),
        btnPrev: document.getElementById('btn-prev'),
        btnPlay: document.getElementById('btn-play'),
        dispRnd: document.getElementById('disp-rnd'),
        dispMo: document.getElementById('disp-mo'),
        badge: document.getElementById('map-time-badge')
    };

    const container = document.getElementById('svg-container');
    const tooltip = document.getElementById('tooltip');
    
    // Perceptual Map Constants
    const ROUGH_CUT_R = 4.0;
    const FINE_CUT_R = 2.5;

    // SVG elements refs
    let svg, dataGroup;
    let productElements = {}; // id -> element
    let segmentElements = {}; // segId -> { group, rough, fine, center, ideal, driftLine }
    
    const tooltipOffset = 15;

    // --- Initialization ---
    initMap();
    initUI();
    updateMap();
    
    // --- UI Logic ---
    function initUI() {
        startDateInput.addEventListener('input', (e) => {
            gameStartDate = e.target.value || "2024-01";
            updateProductsSVG();
            updateMap(); 
        });
        
        btnExport.addEventListener('click', exportData);
        btnImport.addEventListener('click', () => fileImport.click());
        fileImport.addEventListener('change', importData);
        
        tabNavs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabNavs.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                activeTab = e.target.getAttribute('data-tab');
                if (tooltip) tooltip.style.opacity = '0'; // Hide ghost tooltips when switching tabs
                updateTabState();
            });
        });
        
        renderProductsUI();
        renderSegmentsUI();
        buildSegmentConfigs();
        updateTabState();
        
        // Time controls
        roundControls.slider.addEventListener('input', (e) => {
            currentMonth = parseInt(e.target.value) || 0;
            updateMap();
        });
        roundControls.btnPrev.addEventListener('click', () => {
            currentMonth = Math.max(0, currentMonth - 12);
            updateMap();
        });
        roundControls.btnNext.addEventListener('click', () => {
            const maxMonths = 8 * 12;
            currentMonth = Math.min(maxMonths, currentMonth + 12);
            updateMap();
        });
        roundControls.btnPlay.addEventListener('click', toggleAutoPlay);
    }
    
    function buildSegmentConfigs() {
        configsContainer.innerHTML = '';
        Object.keys(segments).forEach(segId => {
            const seg = segments[segId];
            const segDiv = document.createElement('div');
            segDiv.className = `segment-config`;
            segDiv.id = `config-${segId}`;
            
            const header = document.createElement('div');
            header.className = 'segment-header';
            header.innerHTML = `<div><span class="color-ind" style="background:${seg.colorHex}"></span>${seg.name}</div> <i class="fa-solid fa-chevron-down caret"></i>`;
            header.onclick = () => {
                if(activeTab === 'summary') {
                    segDiv.classList.toggle('expanded');
                    const icon = header.querySelector('.caret');
                    icon.className = segDiv.classList.contains('expanded') ? 'fa-solid fa-chevron-up caret' : 'fa-solid fa-chevron-down caret';
                }
            };
            
            const body = document.createElement('div');
            body.className = 'segment-body';
            
            // Build inputs
            body.innerHTML = `
                <div class="input-group">
                    <label>Initial Center (Rd 0)</label>
                    <div class="row">
                        <div class="input-wrapper"><span>P</span><input type="number" step="0.1" value="${seg.initX}" id="initX-${segId}"></div>
                        <div class="input-wrapper"><span>S</span><input type="number" step="0.1" value="${seg.initY}" id="initY-${segId}"></div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Yearly Drift</label>
                    <div class="row">
                        <div class="input-wrapper"><span>ΔP</span><input type="number" step="0.1" value="${seg.driftX}" id="driftX-${segId}"></div>
                        <div class="input-wrapper"><span>ΔS</span><input type="number" step="0.1" value="${seg.driftY}" id="driftY-${segId}"></div>
                    </div>
                </div>
                 <div class="input-group">
                    <label>Ideal Offset</label>
                    <div class="row">
                        <div class="input-wrapper"><span>P</span><input type="number" step="0.1" value="${seg.offsetX}" id="offsetX-${segId}"></div>
                        <div class="input-wrapper"><span>S</span><input type="number" step="0.1" value="${seg.offsetY}" id="offsetY-${segId}"></div>
                    </div>
                </div>
            `;
            
            segDiv.appendChild(header);
            segDiv.appendChild(body);
            configsContainer.appendChild(segDiv);
            
            // Bind inputs to state
            const bindInput = (key, inputId) => {
                document.getElementById(inputId).addEventListener('input', (e) => {
                    seg[key] = parseFloat(e.target.value) || 0;
                    updateMap();
                });
            };
            bindInput('initX', `initX-${segId}`); bindInput('initY', `initY-${segId}`);
            bindInput('driftX', `driftX-${segId}`); bindInput('driftY', `driftY-${segId}`);
            bindInput('offsetX', `offsetX-${segId}`); bindInput('offsetY', `offsetY-${segId}`);
        });
    }
    
    function updateTabState() {
        const allConfigs = configsContainer.querySelectorAll('.segment-config');
        if (activeTab === 'products') {
            mapTitle.innerHTML = `Product Management <span class="badge" id="map-time-badge"></span>`;
            configsContainer.style.display = 'none';
            document.getElementById('svg-container').style.display = 'none';
            segmentsContainer.style.display = 'none';
            if (demandContainer) demandContainer.style.display = 'none';
            productsContainer.style.display = 'grid'; 
        } else if (activeTab === 'segments') {
            mapTitle.innerHTML = `Segments Buying Criteria <span class="badge" id="map-time-badge"></span>`;
            configsContainer.style.display = 'flex';
            document.getElementById('svg-container').style.display = 'none';
            productsContainer.style.display = 'none';
            if (demandContainer) demandContainer.style.display = 'none';
            segmentsContainer.style.display = 'grid';
            
            allConfigs.forEach(conf => {
                conf.style.display = 'block';
                conf.classList.remove('expanded');
                conf.querySelector('.caret').style.display = 'block';
                conf.querySelector('.caret').className = 'fa-solid fa-chevron-down caret';
            });
        } else if (activeTab === 'demand') {
            mapTitle.innerHTML = `Industry Demand Forecast <span class="badge" id="map-time-badge"></span>`;
            configsContainer.style.display = 'none';
            document.getElementById('svg-container').style.display = 'none';
            productsContainer.style.display = 'none';
            segmentsContainer.style.display = 'none';
            if (demandContainer) {
                demandContainer.style.display = 'block';
                renderDemandUI();
            }
        } else if (activeTab === 'summary') {
            mapTitle.innerHTML = `All Segments <span class="badge" id="map-time-badge"></span>`;
            configsContainer.style.display = 'flex';
            document.getElementById('svg-container').style.display = 'flex';
            productsContainer.style.display = 'none';
            segmentsContainer.style.display = 'none';
            if (demandContainer) demandContainer.style.display = 'none';
            allConfigs.forEach(conf => {
                conf.style.display = 'block';
                conf.classList.remove('expanded');
                conf.querySelector('.caret').style.display = 'block';
                conf.querySelector('.caret').className = 'fa-solid fa-chevron-down caret';
            });
        } else {
            mapTitle.innerHTML = `${segments[activeTab].name} Segment <span class="badge" id="map-time-badge"></span>`;
            configsContainer.style.display = 'flex';
            document.getElementById('svg-container').style.display = 'flex';
            productsContainer.style.display = 'none';
            segmentsContainer.style.display = 'none';
            if (demandContainer) demandContainer.style.display = 'none';
            allConfigs.forEach(conf => {
                if (conf.id === `config-${activeTab}`) {
                    conf.style.display = 'block';
                    conf.classList.add('expanded');
                    conf.querySelector('.caret').style.display = 'none'; // Lock open
                } else {
                    conf.style.display = 'none';
                }
            });
        }
        
        roundControls.badge = document.getElementById('map-time-badge');
        updateMap();
    }
    
    function renderProductsUI() {
        productsContainer.innerHTML = '';
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const header = document.createElement('div');
            header.className = 'product-card-header';
            header.innerHTML = `<input type="text" value="${p.name}" class="prod-name-edit">
                                <button class="btn-remove" title="Delete Product"><i class="fa-solid fa-trash"></i></button>`;
            
            header.querySelector('.prod-name-edit').oninput = e => { p.name = e.target.value; updateProductsSVG(); };
            header.querySelector('.btn-remove').onclick = () => { products = products.filter(x => x.id !== p.id); renderProductsUI(); updateProductsSVG(); };
            
            const baseRow = document.createElement('div');
            baseRow.className = 'input-group';
            baseRow.style.marginBottom = '0';
            baseRow.innerHTML = `
                <label>Base Config (Round 0)</label>
                <div class="row" style="margin-bottom: 6px;">
                    <div class="input-wrapper"><span>P</span><input type="number" step="0.1" value="${p.baseX}" class="base-p"></div>
                    <div class="input-wrapper"><span>S</span><input type="number" step="0.1" value="${p.baseY}" class="base-s"></div>
                </div>
                <div class="row">
                    <div class="input-wrapper"><span>Price</span><input type="number" step="0.1" value="${p.basePrice !== undefined ? p.basePrice : 28.0}" class="base-price"></div>
                    <div class="input-wrapper"><span>Age</span><input type="number" step="0.1" value="${p.baseAge !== undefined ? p.baseAge : 2.0}" class="base-age"></div>
                    <div class="input-wrapper"><span>MTBF</span><input type="number" step="100" value="${p.baseMTBF !== undefined ? p.baseMTBF : 17000}" class="base-mtbf"></div>
                </div>
            `;
            baseRow.querySelector('.base-p').oninput = e => { p.baseX = parseFloat(e.target.value)||0; updateProductsSVG(); };
            baseRow.querySelector('.base-s').oninput = e => { p.baseY = parseFloat(e.target.value)||0; updateProductsSVG(); };
            baseRow.querySelector('.base-price').oninput = e => { p.basePrice = parseFloat(e.target.value)||0; updateProductsSVG(); };
            baseRow.querySelector('.base-age').oninput = e => { p.baseAge = parseFloat(e.target.value)||0; updateProductsSVG(); };
            baseRow.querySelector('.base-mtbf').oninput = e => { p.baseMTBF = parseInt(e.target.value)||0; updateProductsSVG(); };
            
            const revList = document.createElement('div');
            revList.className = 'revision-list';
            
            p.revisions.forEach((rev, idx) => {
                const rRow = document.createElement('div');
                rRow.className = 'revision-item';
                rRow.innerHTML = `
                    <div class="row" style="width:100%; gap:4px; margin-bottom:4px;">
                        <input type="month" value="${rev.dateStr}" class="rev-date" style="flex:2;">
                        <button class="btn-remove rev-del" style="background: rgba(0,0,0,0.05); border-radius:4px;"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="row" style="width:100%; gap:4px;">
                        <input type="number" step="0.1" value="${rev.x}" class="rev-val rev-x" placeholder="P" title="Performance">
                        <input type="number" step="0.1" value="${rev.y}" class="rev-val rev-y" placeholder="S" title="Size">
                        <input type="number" step="0.1" value="${rev.price !== undefined ? rev.price : (p.basePrice || 25)}" class="rev-val rev-price" placeholder="Price">
                        <input type="number" step="100" value="${rev.mtbf !== undefined ? rev.mtbf : (p.baseMTBF || 17000)}" class="rev-val rev-m" placeholder="MTBF">
                    </div>
                `;
                rRow.querySelector('.rev-date').oninput = e => { rev.dateStr = e.target.value; updateProductsSVG(); };
                rRow.querySelector('.rev-x').oninput = e => { rev.x = parseFloat(e.target.value)||0; updateProductsSVG(); };
                rRow.querySelector('.rev-y').oninput = e => { rev.y = parseFloat(e.target.value)||0; updateProductsSVG(); };
                rRow.querySelector('.rev-price').oninput = e => { rev.price = parseFloat(e.target.value)||0; updateProductsSVG(); };
                rRow.querySelector('.rev-m').oninput = e => { rev.mtbf = parseInt(e.target.value)||0; updateProductsSVG(); };
                rRow.querySelector('.rev-del').onclick = () => { p.revisions.splice(idx, 1); renderProductsUI(); updateProductsSVG(); };
                revList.appendChild(rRow);
            });
            
            const btnAddRev = document.createElement('button');
            btnAddRev.className = 'btn-add-product'; 
            btnAddRev.style.marginTop = '8px';
            btnAddRev.innerHTML = '<i class="fa-solid fa-plus"></i> Add Revision';
            btnAddRev.onclick = () => {
                let nextDate = gameStartDate;
                p.revisions.push({ dateStr: nextDate, x: p.baseX, y: p.baseY, mtbf: p.baseMTBF, price: p.basePrice });
                renderProductsUI();
                updateProductsSVG();
            };
            
            card.appendChild(header); card.appendChild(baseRow); card.appendChild(revList); card.appendChild(btnAddRev);
            productsContainer.appendChild(card);
        });
        
        const btnAddNewProd = document.createElement('button');
        btnAddNewProd.className = 'btn-add-product';
        btnAddNewProd.innerHTML = '<i class="fa-solid fa-plus"></i> New Product';
        btnAddNewProd.onclick = () => {
            products.push({ id: productCounter++, name: 'New Pdt', baseX: 5, baseY: 15, baseAge: 2.0, baseMTBF: 17000, basePrice: 28.0, revisions: [] });
            renderProductsUI();
            updateProductsSVG();
        };
        productsContainer.appendChild(btnAddNewProd);
    }
    
    function renderSegmentsUI() {
        segmentsContainer.innerHTML = '';
        Object.keys(segments).forEach(segId => {
            const seg = segments[segId];
            const c = seg.criteria;
            
            const card = document.createElement('div');
            card.className = 'segment-criteria-card';
            card.style.borderColor = seg.colorHex;
            
            card.innerHTML = `
                <div class="segment-criteria-header"><span class="color-ind" style="background:${seg.colorHex}; width:12px; height:12px; border-radius:50%;"></span> ${seg.name} Buying Criteria</div>
                
                <div class="input-group">
                    <label>Industry Demand (Year 0)</label>
                    <div class="row">
                        <div class="input-wrapper"><span>Base</span><input type="number" step="1" id="bdem-${segId}" value="${seg.baseDemand || 0}"></div>
                        <div class="input-wrapper"><span>Grow %</span><input type="number" step="0.1" id="grt-${segId}" value="${seg.growthRate || 0}"></div>
                    </div>
                </div>

                <div class="input-group">
                    <label>Weights (%)</label>
                    <div class="row">
                        <div class="input-wrapper"><span>P/S</span><input type="number" id="wp-${segId}" value="${c.wp}"></div>
                        <div class="input-wrapper"><span>Age</span><input type="number" id="wa-${segId}" value="${c.wa}"></div>
                        <div class="input-wrapper"><span>Prc</span><input type="number" id="wpr-${segId}" value="${c.wpr}"></div>
                        <div class="input-wrapper"><span>MBF</span><input type="number" id="wm-${segId}" value="${c.wm}"></div>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Ideal Age</label>
                    <div class="input-wrapper"><input type="number" step="0.1" id="iage-${segId}" value="${c.idealAge}"></div>
                </div>
                
                <div class="input-group">
                    <label>Price Range</label>
                    <div class="row">
                        <div class="input-wrapper"><span>Min</span><input type="number" step="0.1" id="pmin-${segId}" value="${c.priceMin}"></div>
                        <div class="input-wrapper"><span>Max</span><input type="number" step="0.1" id="pmax-${segId}" value="${c.priceMax}"></div>
                    </div>
                </div>
                
                <div class="input-group" style="margin-bottom:0;">
                    <label>MTBF Range</label>
                    <div class="row">
                        <div class="input-wrapper"><span>Min</span><input type="number" step="100" id="mmin-${segId}" value="${c.mtbfMin}"></div>
                        <div class="input-wrapper"><span>Max</span><input type="number" step="100" id="mmax-${segId}" value="${c.mtbfMax}"></div>
                    </div>
                </div>
            `;
            
            segmentsContainer.appendChild(card);
            
            const bindC = (key, idStr) => {
                const el = document.getElementById(`${idStr}-${segId}`);
                if (el) el.oninput = e => { c[key] = parseFloat(e.target.value)||0; updateProductsSVG(); };
            };
            bindC("wp", "wp"); bindC("wa", "wa"); bindC("wpr", "wpr"); bindC("wm", "wm");
            bindC("idealAge", "iage"); bindC("priceMin", "pmin"); bindC("priceMax", "pmax");
            bindC("mtbfMin", "mmin"); bindC("mtbfMax", "mmax");
            
            const bindSeg = (key, idStr) => {
                const el = document.getElementById(`${idStr}-${segId}`);
                if (el) el.oninput = e => { seg[key] = parseFloat(e.target.value)||0; updateProductsSVG(); if (activeTab === 'demand') renderDemandUI(); };
            };
            bindSeg("baseDemand", "bdem"); bindSeg("growthRate", "grt");
        });
    }

    function renderDemandUI() {
        if (!demandContainer) return;
        let html = `<div class="glass-card" style="padding: 24px; max-width: 1100px; margin: 0 auto; background: white; border: 1px solid var(--panel-border);">
            <h3 style="margin-bottom: 20px; font-weight: 700; color: var(--text-primary); font-size: 1.2rem;">8-Year Market Share & Demand Matrix</h3>
            <div style="overflow-x: auto; border: 1px solid rgba(0,0,0,0.05); border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse; text-align: right; background: white; font-size: 0.85rem;">
                <thead style="background: rgba(0,0,0,0.02);">
                    <tr>
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid var(--panel-border); font-weight: 600; color: var(--text-secondary); width: 140px;">Segment Data</th>`;
        
        for (let i = 0; i <= 8; i++) html += `<th style="padding: 10px 12px; border-bottom: 2px solid var(--panel-border); font-weight: 600; color: var(--text-secondary); min-width: 80px;">Year ${i}</th>`;
        html += `<th style="padding: 10px 12px; border-bottom: 2px solid var(--panel-border); font-weight: 700; color: var(--text-primary); min-width: 90px; background: rgba(0,0,0,0.02);">Total</th>`;
        html += `</tr></thead><tbody>`;
        
        Object.keys(segments).forEach(segId => {
            const seg = segments[segId];
            if (!seg.estimatedShare) seg.estimatedShare = Array(9).fill(16.0); // Safe fallback
            
            // Sub-header row
            html += `<tr style="background: ${seg.colorHex}10;">
                <td colspan="11" style="padding: 8px 12px; text-align: left; font-weight: 700; color: ${seg.colorHex}; border-bottom: 1px solid rgba(0,0,0,0.05);">
                    ${seg.name} <span style="font-weight: 500; font-size: 0.75rem;">(+${seg.growthRate}%/yr)</span>
                </td>
            </tr>`;
            
            // Row 1: Industry Size
            html += `<tr><td style="padding: 8px 12px; text-align: left; color: var(--text-secondary);">Total Industry</td>`;
            let indDemands = [];
            let segmentTotalDemand = 0;
            for (let i = 0; i <= 8; i++) {
                const dem = Math.round((seg.baseDemand || 0) * Math.pow(1 + (seg.growthRate || 0)/100, i));
                indDemands.push(dem);
                segmentTotalDemand += dem;
                html += `<td style="padding: 8px 12px; border-bottom: 1px dashed rgba(0,0,0,0.05);">${dem.toLocaleString()}</td>`;
            }
            html += `<td style="padding: 8px 12px; border-bottom: 1px dashed rgba(0,0,0,0.05); font-weight: 700; color: ${seg.colorHex}; background: rgba(0,0,0,0.02);">${segmentTotalDemand.toLocaleString()}</td></tr>`;
            
            // Row 2: Est Share %
            html += `<tr><td style="padding: 8px 12px; text-align: left; color: var(--text-secondary);">Est. Share (%)</td>`;
            for (let i = 0; i <= 8; i++) {
                html += `<td style="padding: 4px 8px; border-bottom: 1px dashed rgba(0,0,0,0.05);">
                            <input type="number" step="0.1" class="share-input" data-seg="${segId}" data-yr="${i}" value="${seg.estimatedShare[i]}" style="width: 100%; text-align: right; padding: 4px; border: 1px solid var(--input-border); border-radius: 4px; background: #f8fafc; font-family: monospace;">
                        </td>`;
            }
            html += `<td style="padding: 8px 12px; border-bottom: 1px dashed rgba(0,0,0,0.05); background: rgba(0,0,0,0.02);"></td></tr>`;
            
            // Row 3: My Unit Demand
            html += `<tr><td style="padding: 8px 12px; text-align: left; font-weight: 600; color: var(--text-primary); border-bottom: 2px solid rgba(0,0,0,0.1);">My Unit Demand</td>`;
            let mySegmentTotal = 0;
            for (let i = 0; i <= 8; i++) {
                const myDem = Math.round(indDemands[i] * (seg.estimatedShare[i] / 100));
                mySegmentTotal += myDem;
                html += `<td style="padding: 8px 12px; font-weight: 700; color: var(--accent-blue); border-bottom: 2px solid rgba(0,0,0,0.1);">${myDem.toLocaleString()}</td>`;
            }
            html += `<td style="padding: 8px 12px; font-weight: 800; color: var(--accent-blue); border-bottom: 2px solid rgba(0,0,0,0.1); background: rgba(0,0,0,0.02);">${mySegmentTotal.toLocaleString()}</td></tr>`;
        });
        
        html += `</tbody></table></div></div>`;
        demandContainer.innerHTML = html;
        
        demandContainer.querySelectorAll('.share-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const sid = e.target.getAttribute('data-seg');
                const yr = parseInt(e.target.getAttribute('data-yr'));
                segments[sid].estimatedShare[yr] = parseFloat(e.target.value) || 0;
                renderDemandUI(); 
            });
        });
    }

    // --- Map Logic ---
    function initMap() {
        container.innerHTML = '';
        svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("viewBox", "0 0 20 20");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.width = "100%";
        svg.style.height = "100%";
        
        const gridGroup = document.createElementNS(SVG_NS, "g");
        for (let i = 0; i <= 20; i += 1) {
            let hLine = document.createElementNS(SVG_NS, "line"); hLine.setAttribute("x1", "0"); hLine.setAttribute("y1", i); hLine.setAttribute("x2", "20"); hLine.setAttribute("y2", i); hLine.setAttribute("class", "grid-line"); gridGroup.appendChild(hLine);
            let vLine = document.createElementNS(SVG_NS, "line"); vLine.setAttribute("x1", i); vLine.setAttribute("y1", "0"); vLine.setAttribute("x2", i); vLine.setAttribute("y2", "20"); vLine.setAttribute("class", "grid-line"); gridGroup.appendChild(vLine);
            if (i > 0 && i < 20) {
                let xLabel = document.createElementNS(SVG_NS, "text"); xLabel.setAttribute("x", i); xLabel.setAttribute("y", 19.8); xLabel.setAttribute("text-anchor", "middle"); xLabel.setAttribute("class", "axis-text"); xLabel.textContent = i; gridGroup.appendChild(xLabel);
                let yLabel = document.createElementNS(SVG_NS, "text"); yLabel.setAttribute("x", 0.5); yLabel.setAttribute("y", 20 - i + 0.15); yLabel.setAttribute("class", "axis-text"); yLabel.textContent = i; gridGroup.appendChild(yLabel);
            }
        }
        svg.appendChild(gridGroup);
        
        dataGroup = document.createElementNS(SVG_NS, "g");
        
        // Init SVG elements for each segment
        Object.keys(segments).forEach(segId => {
            const sGroup = document.createElementNS(SVG_NS, "g");
            sGroup.setAttribute("class", `segment-group ${segments[segId].colorClass}`);
            
            const line = document.createElementNS(SVG_NS, "line"); line.setAttribute("class", "svg-line drift-line");
            const rCircle = document.createElementNS(SVG_NS, "circle"); rCircle.setAttribute("class", "svg-circle rough-cut-circle"); rCircle.setAttribute("r", ROUGH_CUT_R);
            const fCircle = document.createElementNS(SVG_NS, "circle"); fCircle.setAttribute("class", "svg-circle fine-cut-circle"); fCircle.setAttribute("r", FINE_CUT_R);
            const cDot = document.createElementNS(SVG_NS, "circle"); cDot.setAttribute("class", "svg-circle center-dot"); cDot.setAttribute("r", "0.15");
            const iDot = document.createElementNS(SVG_NS, "circle"); iDot.setAttribute("class", "svg-circle ideal-dot"); iDot.setAttribute("r", "0.2");
            
            sGroup.appendChild(line); sGroup.appendChild(rCircle); sGroup.appendChild(fCircle); sGroup.appendChild(cDot); sGroup.appendChild(iDot);
            dataGroup.appendChild(sGroup);
            
            segmentElements[segId] = { group: sGroup, driftLine: line, rough: rCircle, fine: fCircle, center: cDot, ideal: iDot };
            
            // Tooltips for center and ideal points
            cDot.addEventListener("mousemove", (e) => {
                const {cx, cy} = getCalculatedCoords(segId, currentMonth);
                const year = Math.floor(currentMonth / 12);
                const demand = Math.round((segments[segId].baseDemand || 0) * Math.pow(1 + (segments[segId].growthRate || 0)/100, year));
                showTooltip(e, `<b>${segments[segId].name} Center</b><br/><span class="coord-label">P:</span><span class="coord-value">${cx.toFixed(2)}</span> <span class="coord-label">S:</span><span class="coord-value">${cy.toFixed(2)}</span><br/><span class="coord-label">Yr ${year} Dmd:</span><span class="coord-value" style="color:#10b981;">${demand.toLocaleString()}</span>`);
            });
            cDot.addEventListener("mouseleave", hideTooltip);
            iDot.addEventListener("mousemove", (e) => {
                const {ix, iy} = getCalculatedCoords(segId, currentMonth);
                const year = Math.floor(currentMonth / 12);
                const demand = Math.round((segments[segId].baseDemand || 0) * Math.pow(1 + (segments[segId].growthRate || 0)/100, year));
                showTooltip(e, `<b>${segments[segId].name} Ideal</b><br/><span class="coord-label">P:</span><span class="coord-value">${ix.toFixed(2)}</span> <span class="coord-label">S:</span><span class="coord-value">${iy.toFixed(2)}</span><br/><span class="coord-label">Yr ${year} Dmd:</span><span class="coord-value" style="color:#10b981;">${demand.toLocaleString()}</span>`);
            });
            iDot.addEventListener("mouseleave", hideTooltip);
        });
        
        svg.appendChild(dataGroup);
        container.appendChild(svg);
        
        // Products initialized separately so they are always on top
        updateProductsSVG();
        svg.addEventListener("mousemove", trackGlobalTooltip);
    }
    
    function createTrianglePath(x, y, size) {
        const h = size * Math.sqrt(3) / 2; return `${x},${y - h*2/3} ${x - size/2},${y + h/3} ${x + size/2},${y + h/3}`;
    }

    function getMonthOffsetFromStart(dateStr) {
        if (!dateStr || !gameStartDate) return 0;
        const [sY, sM] = gameStartDate.split('-').map(Number);
        const [rY, rM] = dateStr.split('-').map(Number);
        return ((rY - sY) * 12) + (rM - sM);
    }
    
    function getCalculatedProductState(p, targetMonth) {
        let age = p.baseAge !== undefined ? p.baseAge : 2.0;
        let pX = p.baseX;
        let pY = p.baseY;
        let mtbf = p.baseMTBF !== undefined ? p.baseMTBF : 17000;
        let price = p.basePrice !== undefined ? p.basePrice : 25.0;
        
        const revMap = {};
        p.revisions.forEach(r => {
            revMap[getMonthOffsetFromStart(r.dateStr)] = r;
        });

        for (let m = 1; m <= targetMonth; m++) {
            age += 1.0 / 12.0;
            if (revMap[m]) {
                const r = revMap[m];
                const changedPS = (r.x !== pX || r.y !== pY);
                if (changedPS) age = age / 2.0;
                pX = r.x; pY = r.y; 
                if (r.mtbf !== undefined) mtbf = r.mtbf;
                if (r.price !== undefined) price = r.price;
            }
        }
        
        // Month 0 revision edge case
        if (targetMonth === 0 && revMap[0]) {
            const r = revMap[0];
            const changedPS = (r.x !== pX || r.y !== pY);
            if(changedPS) age = age / 2.0;
            pX = r.x; pY = r.y; 
            if (r.mtbf !== undefined) mtbf = r.mtbf;
            if (r.price !== undefined) price = r.price;
        }

        return { x: pX, y: pY, age: age, mtbf: mtbf, price: price };
    }
    
    function calculateCSS(pState, segId, month) {
        const seg = segments[segId];
        const c = seg.criteria;
        const coords = getCalculatedCoords(segId, month);
        
        // distance from segment center determines if it's inside rough cut
        let distCenter = Math.sqrt(Math.pow(pState.x - coords.cx, 2) + Math.pow(pState.y - coords.cy, 2));
        if (distCenter > 4.0) return { score: 0, distCenter: distCenter, name: seg.name };

        // distance from ideal spot determines the actual CSS points
        let distIdeal = Math.sqrt(Math.pow(pState.x - coords.ix, 2) + Math.pow(pState.y - coords.iy, 2));
        let posScore = 0;
        
        // At fine cut edge (2.5), it drops to a proportional '10' relative to the max 43 weight.
        let fineCutScore = c.wp * (10.0 / 43.0); 
        
        if (distIdeal <= 2.5) {
            posScore = c.wp - (distIdeal / 2.5) * (c.wp - fineCutScore);
        } else if (distIdeal <= 4.0) {
            posScore = fineCutScore - ((distIdeal - 2.5) / 1.5) * fineCutScore;
        } else {
            posScore = 0;
        }
        
        let ageDiff = Math.abs(pState.age - c.idealAge);
        let ageScore = Math.max(0, c.wa * (1 - ageDiff / 3.0));
        
        let priceScore = 0;
        if (pState.price <= c.priceMin) priceScore = c.wpr;
        else if (pState.price < c.priceMax) priceScore = Math.max(0, c.wpr * ((c.priceMax - pState.price) / (c.priceMax - c.priceMin)));
        
        let mtbfScore = 0;
        if (pState.mtbf >= c.mtbfMax) mtbfScore = c.wm;
        else if (pState.mtbf > c.mtbfMin) mtbfScore = Math.max(0, c.wm * ((pState.mtbf - c.mtbfMin) / (c.mtbfMax - c.mtbfMin)));
        
        let score = Math.max(0, Math.round(posScore + ageScore + priceScore + mtbfScore));
        return { score: score, distCenter: distCenter, name: seg.name };
    }

    function updateProductsSVG() {
        Object.values(productElements).forEach(el => el.remove()); productElements = {};
        products.forEach(p => {
            const state = getCalculatedProductState(p, currentMonth);

            let poly = document.createElementNS(SVG_NS, "polygon");
            poly.setAttribute("class", "svg-polygon product-triangle");
            const svgX = state.x; const svgY = 20 - state.y;
            poly.setAttribute("points", createTrianglePath(svgX, svgY, 0.5));
            dataGroup.appendChild(poly);
            productElements[p.id] = poly;
            
            let insideSegments = [];
            let highestCSS = 0;
            Object.keys(segments).forEach(sid => {
                const res = calculateCSS(state, sid, currentMonth);
                if (res.distCenter <= 4.0) {
                    insideSegments.push(res);
                    if (res.score > highestCSS) highestCSS = res.score;
                }
            });
            
            let color = "#ef4444"; 
            if (insideSegments.length > 0) {
                // Gradient from Yellow-Orange (Hue: 40) to Dark Green (Hue: 140)
                const hue = 40 + (highestCSS * 1.0); // At CSS 100 -> Hue 140
                const lightness = 60 - (highestCSS * 0.25); // At CSS 100 -> L 35%
                color = `hsl(${hue}, 90%, ${Math.max(30, lightness)}%)`;
            }
            
            poly.style.fill = color;
            poly.style.stroke = "#1f2937";
            poly.style.strokeWidth = "0.05";
            
            let cssText = "";
            if (insideSegments.length === 0) {
                cssText = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 0.75rem; color: #ef4444; font-weight: bold;">Outside all segments</div>`;
            } else {
                cssText = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.1); font-size: 0.75rem;">`;
                insideSegments.sort((a,b) => b.score - a.score).forEach(res => {
                    cssText += `<div>CSS (${res.name}): <span class="coord-value">${res.score}</span></div>`;
                });
                cssText += `</div>`;
            }

            poly.addEventListener("mousemove", (e) => showTooltip(e, `<b>${p.name}</b><br/><span class="coord-label">P:</span><span class="coord-value">${state.x.toFixed(1)}</span> <span class="coord-label">S:</span><span class="coord-value">${state.y.toFixed(1)}</span><br/><span class="coord-label">Age:</span><span class="coord-value">${state.age.toFixed(1)}</span> <span class="coord-label">Prc:</span><span class="coord-value">$${state.price.toFixed(2)}</span><br/><span class="coord-label">MTBF:</span><span class="coord-value">${state.mtbf}</span>${cssText}`));
            poly.addEventListener("mouseleave", hideTooltip);
            poly.style.transformOrigin = `${svgX}px ${svgY}px`;
        });
    }
    
    // --- Tooltips ---
    function setupTooltip(element, text) {
        element.addEventListener("mousemove", (e) => showTooltip(e, text));
        element.addEventListener("mouseleave", hideTooltip);
    }
    function showTooltip(evt, htmlContent) { tooltip.innerHTML = htmlContent; tooltip.style.display = "block"; positionTooltip(evt); }
    function positionTooltip(evt) { if (tooltip.style.display === "block") { tooltip.style.left = (evt.pageX + tooltipOffset) + 'px'; tooltip.style.top = (evt.pageY + tooltipOffset) + 'px'; } }
    function hideTooltip() { tooltip.style.display = "none"; }
    function trackGlobalTooltip(evt) {
        if (evt.target.classList && (
            evt.target.classList.contains('center-dot') || 
            evt.target.classList.contains('ideal-dot') || 
            evt.target.classList.contains('product-triangle')
        )) {
            return;
        }
        
        const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        let p = svgP.x; let s = 20 - svgP.y;
        if (p >= 0 && p <= 20 && s >= 0 && s <= 20) showTooltip(evt, `<span class="coord-label">Perf:</span><span class="coord-value">${p.toFixed(1)}</span> <span class="coord-label">Size:</span><span class="coord-value">${s.toFixed(1)}</span>`); else hideTooltip();
    }

    function getCalculatedCoords(segId, months) {
        const seg = segments[segId];
        const years = months / 12.0;
        const cx = seg.initX + (seg.driftX * years);
        const cy = seg.initY + (seg.driftY * years);
        const ix = cx + seg.offsetX;
        const iy = cy + seg.offsetY;
        return { cx, cy, ix, iy };
    }

    function updateMap() {
        const maxMonths = 8 * 12;
        
        Object.keys(segments).forEach(segId => {
            const els = segmentElements[segId];
            
            // Visibility logic
            if (activeTab === 'summary' || activeTab === segId) {
                els.group.style.display = '';
            } else {
                els.group.style.display = 'none';
            }
            
            const startCoords = getCalculatedCoords(segId, 0);
            const endCoords = getCalculatedCoords(segId, maxMonths);
            const currentCoords = getCalculatedCoords(segId, currentMonth);
            
            els.driftLine.setAttribute("x1", startCoords.ix); els.driftLine.setAttribute("y1", 20 - startCoords.iy);
            els.driftLine.setAttribute("x2", endCoords.ix); els.driftLine.setAttribute("y2", 20 - endCoords.iy);
            
            const svgCx = currentCoords.cx; const svgCy = 20 - currentCoords.cy;
            const svgIx = currentCoords.ix; const svgIy = 20 - currentCoords.iy;
            
            els.rough.setAttribute("cx", svgCx); els.rough.setAttribute("cy", svgCy);
            els.fine.setAttribute("cx", svgCx); els.fine.setAttribute("cy", svgCy);
            els.center.setAttribute("cx", svgCx); els.center.setAttribute("cy", svgCy);
            els.ideal.setAttribute("cx", svgIx); els.ideal.setAttribute("cy", svgIy);
        });
        
        const round = Math.floor(currentMonth / 12);
        const monthOffset = currentMonth % 12;
        
        roundControls.dispRnd.textContent = `Round ${round}`;
        roundControls.dispMo.textContent = monthOffset > 0 ? ` +${monthOffset}mo` : '';
        roundControls.slider.max = maxMonths;
        roundControls.slider.value = currentMonth;
        
        // Compute active date string for the badge
        let dispMonthName = '';
        let dispYear = '';
        if (gameStartDate) {
            const [sy, sm] = gameStartDate.split('-').map(Number);
            const absMonth = (sm - 1) + currentMonth;
            dispYear = sy + Math.floor(absMonth / 12);
            dispMonthName = new Date(2000, absMonth % 12, 1).toLocaleString('default', { month: 'short' });
        }
        
        if(roundControls.badge) {
            roundControls.badge.textContent = `${dispMonthName} ${dispYear} (Round ${round})`;
        }
        
        roundControls.btnPrev.disabled = currentMonth < 12 && autoPlayInterval === null;
        roundControls.btnNext.disabled = currentMonth > maxMonths - 12 && autoPlayInterval === null;
        
        // Need to update product SVGs constantly during update map so they respond to time
        updateProductsSVG();
    }

    function toggleAutoPlay() {
        const maxMonths = 8 * 12;
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval); autoPlayInterval = null;
            roundControls.btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>'; roundControls.btnPlay.classList.remove('active');
            updateMap(); 
        } else {
            roundControls.btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i>'; roundControls.btnPlay.classList.add('active');
            
            if (currentMonth >= maxMonths) currentMonth = 0;
            
            // Auto play stops at the very end of the CURRENT year (round)
            let targetStopMonth;
            if (currentMonth % 12 === 0) {
                targetStopMonth = currentMonth + 12;
            } else {
                targetStopMonth = currentMonth + (12 - (currentMonth % 12));
            }
            targetStopMonth = Math.min(targetStopMonth, maxMonths);

            autoPlayInterval = setInterval(() => {
                if (currentMonth < targetStopMonth) { 
                    currentMonth += 1; 
                    updateMap(); 
                } else { 
                    toggleAutoPlay(); // Pause automatically at year end
                }
            }, 500); 
        }
    }

    function exportData() {
        const data = {
            products: products,
            productCounter: productCounter,
            segments: segments,
            gameStartDate: gameStartDate
        };
        const jsonStr = JSON.stringify(data, null, 2);
        
        // Using octet-stream forces Chrome to download it as a physical file rather than navigating to a Blob preview
        const blob = new Blob([jsonStr], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.style.display = "none";
        a.href = url;
        a.download = "capsim-data.json";
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 150);
    }

    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target.result);
                if (data.products && data.segments) {
                    products = data.products;
                    productCounter = data.productCounter || 100;
                    
                    Object.keys(data.segments).forEach(k => {
                        if (segments[k]) {
                            // Merge strategically to guarantee backwards compatibility with older save files that lack demand fields
                            segments[k] = { ...segments[k], ...data.segments[k] };
                        }
                    });
                    
                    gameStartDate = data.gameStartDate || "2024-01";
                    startDateInput.value = gameStartDate;
                    
                    currentMonth = 0;
                    buildSegmentConfigs();
                    renderSegmentsUI();
                    renderProductsUI();
                    updateTabState(); 
                } else {
                    alert("Invalid logic. Could not find products or segments objects in JSON.");
                }
            } catch (err) {
                console.error(err);
                alert("Error parsing JSON file. Is it corrupted?");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }
});
