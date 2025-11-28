document.addEventListener('DOMContentLoaded', () => {
    const reportsContainer = document.getElementById('reports-container');
    const deleteAllBtn = document.getElementById('delete-all-btn');

    // Modals and their elements
    const drawTimeModal = document.getElementById('draw-time-modal');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const drawTimeOptions = document.getElementById('draw-time-options');
    const customerChoiceModal = document.getElementById('customer-choice-modal');
    const selectedDrawTimeDisplay = document.getElementById('selected-draw-time-display');
    const customerOptions = document.getElementById('customer-options');

    let currentSelectedDate = null;
    let currentSelectedReportKey = null;

    function parseReportKey(key) {
        const parts = key.split('_');
        if (parts.length === 3) {
            return { date: parts[1], drawTime: parts[2] };
        }
        return { date: undefined, drawTime: undefined };
    }

    function getNumericDisplay(ticketStringOrRange) {
        if (!ticketStringOrRange) return '';
        const rangeMatch = ticketStringOrRange.match(/^(.*?)(\d+)(\D*)-(.*?)(\d+)(\D*)$/);
        if (rangeMatch) return `${String(rangeMatch[2]).padStart(rangeMatch[5].length, '0')}-${rangeMatch[5]}`;
        const singleMatch = ticketStringOrRange.match(/\d+/);
        if (singleMatch) return singleMatch[0];
        return ticketStringOrRange;
    }

    function formatSoldNumbersForPopup(soldNumbers) {
        if (!soldNumbers || soldNumbers.length === 0) return '';
        
        const NUMBERS_PER_LINE = 7;
        let lines = [];
        for (let i = 0; i < soldNumbers.length; i += NUMBERS_PER_LINE) {
            lines.push(
                soldNumbers.slice(i, i + NUMBERS_PER_LINE).map(getNumericDisplay).join(', ')
            );
        }
        return lines.join(',<br>');
    }

    function formatWinningTicketsForPopup(winningTickets) {
        if (!winningTickets || winningTickets.length === 0) return '';
        return winningTickets.map(wt => `${wt.ticket} (${wt.category})`).join('<br>');
    }

    function calculateReportSummary(fullReportData) {
        const summary = {
            totalPWT: 0,
            totalVC: 0,
            totalSVC: 0,
            totalSoldCount: 0,
            totalPurchaseCount: 0,
        };

        if (!fullReportData) return summary;

        const parseAmount = (str) => parseInt(str.split(' ')[0].replace(/,/g, ''), 10) || 0;
        
        const parseAlphanumericTicket = (ticketString) => {
            const match = ticketString.match(/^(.*?)(\d+)(\D*)$/);
            if (match) return { prefix: match[1], numericPart: parseInt(match[2], 10), padding: match[2].length, suffix: match[3] };
            const numeric = parseInt(ticketString, 10);
            return { prefix: '', numericPart: isNaN(numeric) ? 0 : numeric, padding: ticketString.length, suffix: '' };
        }

        fullReportData.forEach(row => {
            summary.totalSoldCount += (row.soldNumbers || []).length;
            
            const from = parseAlphanumericTicket(row.purchaseFrom || '').numericPart;
            const to = parseAlphanumericTicket(row.purchaseTo || '').numericPart;
            if (!isNaN(from) && !isNaN(to) && to >= from) {
                summary.totalPurchaseCount += (to - from + 1);
            }

            (row.pwtBreakdown || []).forEach(item => summary.totalPWT += parseAmount(item));
            (row.vcBreakdown || []).forEach(item => summary.totalVC += parseAmount(item));
            (row.svcBreakdown || []).forEach(item => summary.totalSVC += parseAmount(item));
        });

        return summary;
    }

    function showModal(modal) { modal.style.display = 'flex'; }
    function hideModal(modal) { modal.style.display = 'none'; }

    function deleteAllReports() {
        if (confirm('ARE YOU SURE you want to delete ALL saved data? This action cannot be undone.')) {
            const keysToDelete = Object.keys(localStorage)
                .filter(key => key.startsWith('customerReports_') || key.startsWith('dailyCustomers_'));
            
            keysToDelete.forEach(key => localStorage.removeItem(key));
            loadAndRenderReports();
        }
    }

    function openReportPopup(title, reportData, fullReportData) {
        const summary = calculateReportSummary(fullReportData);
        const popupContent = `
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        @page {
                            size: A3 landscape;
                            margin: 20px;
                        }
                        body { 
                            font-family: sans-serif; 
                            -webkit-print-color-adjust: exact; /* Chrome, Safari */
                            color-adjust: exact; /* Firefox */
                        }
                        table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            font-size: 12pt;
                        }
                        th, td { 
                            border: 1px solid #ddd; 
                            padding: 8px; 
                            text-align: left; 
                            vertical-align: top;
                        }
                        th { 
                            background-color: #f2f2f2; 
                        }
                        .col-sold { width: 35%; }
                        .col-pwt, .col-vc, .col-svc { width: 15%; }
                        .col-winning { width: 15%; }
                        .summary-table { margin-top: 30px; }
                        .summary-table th { text-align: right; width: 85%; }
                        .summary-table td { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>${title}</h2>
                    ${reportData && reportData.length > 0 ? `
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>SEM</th>
                                    <th>Purchase</th>
                                    <th>Unsold</th>
                                    <th class="col-sold">Sold</th>
                                    <th class="col-winning">Winning Tickets</th>
                                    <th class="col-pwt">PWT</th>
                                    <th class="col-vc">VC</th>
                                    <th class="col-svc">SVC</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportData.map(row => `
                                    <tr>
                                        <td>${row.name}</td>
                                        <td>${row.sem}</td>
                                        <td>${row.purchaseFrom || ''} - ${row.purchaseTo || ''}</td>
                                        <td>${row.unsoldRaw || ''}</td>
                                        <td class="col-sold">${formatSoldNumbersForPopup(row.soldNumbers)}</td>
                                        <td class="col-winning">${formatWinningTicketsForPopup(row.winningTickets)}</td>
                                        <td class="col-pwt">${(row.pwtBreakdown || []).join('<br>')}</td>
                                        <td class="col-vc">${(row.vcBreakdown || []).join('<br>')}</td>
                                        <td class="col-svc">${(row.svcBreakdown || []).join('<br>')}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="no-data">No detailed data available for this selection.</p>'}

                    <h2 style="margin-top: 40px;">Draw Summary</h2>
                    <table class="summary-table">
                        <tr><th>Total Purchase Count:</th><td>${summary.totalPurchaseCount.toLocaleString('en-IN')}</td></tr>
                        <tr><th>Total Sold Count:</th><td>${summary.totalSoldCount.toLocaleString('en-IN')}</td></tr>
                        <tr><th>Total PWT:</th><td>${summary.totalPWT.toLocaleString('en-IN')}</td></tr>
                        <tr><th>Total VC:</th><td>${summary.totalVC.toLocaleString('en-IN')}</td></tr>
                        <tr><th>Total SVC:</th><td>${summary.totalSVC.toLocaleString('en-IN')}</td></tr>
                    </table>
                </body>
            </html>
        `;

        const popup = window.open('', '_blank', 'width=1191,height=842');
        popup.document.write(popupContent);
        popup.document.close();
    }

    function loadAndRenderReports() {
        reportsContainer.innerHTML = '';
        const reportKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('customerReports_'))
            .sort()
            .reverse();

        if (reportKeys.length === 0) {
            reportsContainer.innerHTML = `
                <div class="no-reports">
                    <p>No reports found.</p>
                </div>
            `;
            return;
        }

        const uniqueDates = [...new Set(reportKeys.map(key => parseReportKey(key).date))].sort().reverse();

        for (const date of uniqueDates) {
            const dateCard = document.createElement('div');
            dateCard.className = 'date-card';
            dateCard.dataset.date = date;
            dateCard.innerHTML = `<h2>${date}</h2>`;
            reportsContainer.appendChild(dateCard);
        }
    }

    // Event Listeners
    deleteAllBtn.addEventListener('click', deleteAllReports);

    reportsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.date-card');
        if (target) {
            currentSelectedDate = target.dataset.date;
            selectedDateDisplay.textContent = currentSelectedDate;
            drawTimeOptions.innerHTML = ''; // Clear previous options

            const reportKeysForDate = Object.keys(localStorage)
                .filter(key => key.startsWith('customerReports_') && parseReportKey(key).date === currentSelectedDate);
            
            const uniqueDrawTimes = [...new Set(reportKeysForDate.map(key => parseReportKey(key).drawTime))].sort();

            if (uniqueDrawTimes.length > 0) {
                uniqueDrawTimes.forEach(drawTime => {
                    const button = document.createElement('button');
                    button.className = 'modal-option-btn';
                    button.textContent = drawTime;
                    button.dataset.drawTime = drawTime;
                    drawTimeOptions.appendChild(button);
                });
                showModal(drawTimeModal);
            } else {
                alert('No reports found for this date.');
            }
        }
    });

    drawTimeOptions.addEventListener('click', (e) => {
        const target = e.target.closest('.modal-option-btn');
        if (target) {
            const selectedDrawTime = target.dataset.drawTime;
            currentSelectedReportKey = `customerReports_${currentSelectedDate}_${selectedDrawTime}`;
            selectedDrawTimeDisplay.textContent = `${currentSelectedDate} (${selectedDrawTime})`;
            customerOptions.innerHTML = ''; // Clear previous options

            const reportData = JSON.parse(localStorage.getItem(currentSelectedReportKey));
            if (reportData && reportData.length > 0) {
                const uniqueCustomers = [...new Set(reportData.map(c => c.name))].sort();
                uniqueCustomers.forEach(customerName => {
                    const button = document.createElement('button');
                    button.className = 'modal-option-btn';
                    button.textContent = customerName;
                    button.dataset.customerName = customerName;
                    customerOptions.appendChild(button);
                });
                hideModal(drawTimeModal);
                showModal(customerChoiceModal);
            } else {
                alert('No customer data found for this draw time.');
            }
        }
    });

    customerOptions.addEventListener('click', (e) => {
        const target = e.target.closest('.modal-option-btn');
        if (target) {
            const selectedCustomerName = target.dataset.customerName;
            const fullReport = JSON.parse(localStorage.getItem(currentSelectedReportKey));
            const customerReport = fullReport.filter(c => c.name === selectedCustomerName);
            const { date, drawTime } = parseReportKey(currentSelectedReportKey);
            openReportPopup(`Report for ${selectedCustomerName} on ${date} (${drawTime})`, customerReport, fullReport);
            hideModal(customerChoiceModal);
        }
    });

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            hideModal(e.target.closest('.modal'));
        });
    });

    // Initial load
    loadAndRenderReports();
});