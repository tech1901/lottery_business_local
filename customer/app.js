document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const VC_AMOUNTS = {
        '1st Prize': 2000,
        '2nd Prize': 2000,
        '3rd Prize': 200,
        '4th Prize': 150,
        '5th Prize': 70
    };
    const SVC_AMOUNTS = {
        '1st Prize': 400,
        '2nd Prize': 400,
        '3rd Prize': 40,
        '4th Prize': 20,
        '5th Prize': 10
    };

    // --- DOM Elements ---
    const customerTableBody = document.getElementById('customer-table-body');
    const entryDate = document.getElementById('entry-date');
    const drawTimeSelect = document.getElementById('draw-time-select');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const soldNumbersModal = document.getElementById('sold-numbers-modal');
    const unsoldNumbersModal = document.getElementById('unsold-numbers-modal');
    const prizeResultModal = document.getElementById('prize-result-modal');
    const winningNumbersModal = document.getElementById('winning-numbers-modal');
    const prizeCategoryModal = document.getElementById('prize-category-modal');
    const customerNameInput = document.getElementById('customer-name-input');
    const soldNumbersChipContainer = document.getElementById('sold-numbers-chip-container');
    const unsoldNumbersChipContainer = document.getElementById('unsold-numbers-chip-container');
    const editCustomerModal = document.getElementById('edit-customer-modal');
    const editCustomerNameInput = document.getElementById('edit-customer-name-input');
    const editSemTypeSelect = document.getElementById('edit-sem-type-select');
    const editPurchaseInput = document.getElementById('edit-purchase-input');
    const editUnsoldInput = document.getElementById('edit-unsold-input');
    const updateCustomerBtn = document.getElementById('update-customer-btn');
    const copyAllSoldBtn = document.getElementById('copy-all-sold-btn');
    const prizeResultTitle = document.getElementById('prize-result-title');
    const prizeResultTableBody = document.getElementById('prize-result-table-body');
    const winningNumbersChipContainer = document.getElementById('winning-numbers-chip-container');
    const prizeCategoryModalText = document.getElementById('prize-category-modal-text');
    const viewResultBtn = document.getElementById('view-result-btn');
    const submitAllDataBtn = document.getElementById('submit-all-data-btn');
    const reportCardsContainer = document.getElementById('report-cards-container');
    const reportDetailModal = document.getElementById('report-detail-modal');
    const reportDateDisplay = document.getElementById('report-date-display');
    const customerListContainer = document.getElementById('customer-list-container');
    const searchUnsoldBtn = document.getElementById('search-unsold-btn');
    const searchUnsoldModal = document.getElementById('search-unsold-modal');
    const searchCustomerNameInput = document.getElementById('search-customer-name-input');
    const searchUnsoldNumbersInput = document.getElementById('search-unsold-numbers-input');
    const submitSearchUnsoldBtn = document.getElementById('submit-search-unsold-btn');
    const searchUnsoldResultsContainer = document.getElementById('search-unsold-results-container');

    // --- State Management ---
    let tableData = [];
    let currentCustomer = null;
    let currentDrawTime = null;
    let currentEntryDate = null;

    // --- Utility Functions ---
    const showModal = (modal) => modal.style.display = 'flex';
    const hideModal = (modal) => modal.style.display = 'none';
    const setCurrentDate = () => { entryDate.value = new Date().toISOString().slice(0, 10); };

    function getCategoryClass(category) {
        if (!category) return '';
        if (category.includes('1st')) return 'prize-cat-1';
        if (category.includes('2nd')) return 'prize-cat-2';
        if (category.includes('3rd')) return 'prize-cat-3';
        if (category.includes('4th')) return 'prize-cat-4';
        if (category.includes('5th')) return 'prize-cat-5';
        return '';
    }

    function parseAlphanumericTicket(ticketString) {
        const match = ticketString.match(/^(.*?)(\d+)(\D*)$/);
        if (match) return { prefix: match[1], numericPart: parseInt(match[2], 10), padding: match[2].length, suffix: match[3] };
        const numeric = parseInt(ticketString, 10);
        return { prefix: '', numericPart: isNaN(numeric) ? 0 : numeric, padding: ticketString.length, suffix: '' };
    }

    function formatAlphanumericTicket(prefix, num, padding, suffix) {
        return prefix + String(num).padStart(padding, '0') + suffix;
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

        fullReportData.forEach(row => {
            summary.totalSoldCount += (row.soldNumbers || []).length;
            summary.totalPurchaseCount += (row.purchaseCount || 0);

            (row.pwtBreakdown || []).forEach(item => summary.totalPWT += parseAmount(item));
            (row.vcBreakdown || []).forEach(item => summary.totalVC += parseAmount(item));
            (row.svcBreakdown || []).forEach(item => summary.totalSVC += parseAmount(item));
        });

        return summary;
    }

    function compressNumberList(numbersAsStrings) {
        if (!numbersAsStrings || numbersAsStrings.length === 0) return [];
        const parsedNumbers = numbersAsStrings.map(s => parseAlphanumericTicket(s)).sort((a, b) => a.numericPart - b.numericPart);
        if (parsedNumbers.length === 0) return [];
        const { prefix, padding, suffix } = parsedNumbers[0];
        const ranges = [];
        let startNum = parsedNumbers[0].numericPart;
        let endNum = parsedNumbers[0].numericPart;
        for (let i = 1; i < parsedNumbers.length; i++) {
            if (parsedNumbers[i].numericPart === endNum + 1) {
                endNum = parsedNumbers[i].numericPart;
            } else {
                const startStr = formatAlphanumericTicket(prefix, startNum, padding, suffix);
                const endStr = formatAlphanumericTicket(prefix, endNum, padding, suffix);
                ranges.push(startNum === endNum ? startStr : `${startStr}-${endStr}`);
                startNum = parsedNumbers[i].numericPart;
                endNum = parsedNumbers[i].numericPart;
            }
        }
        const startStr = formatAlphanumericTicket(prefix, startNum, padding, suffix);
        const endStr = formatAlphanumericTicket(prefix, endNum, padding, suffix);
        ranges.push(startNum === endNum ? startStr : `${startStr}-${endStr}`);
        return ranges;
    }

    function getOcrResultKey() {
        const date = entryDate.value;
        const drawTimeMap = { 'Morning': '1PM', 'Noon': '6PM', 'Evening': '8PM' };
        const ocrDrawTime = drawTimeMap[drawTimeSelect.value];
        if (!date || !ocrDrawTime) return null;
        return `lotteryResult_${date}_${ocrDrawTime}`;
    }

    function getReportKey(date, drawTime) {
        return `customerReports_${date}_${drawTime}`;
    }

    function getDailyCustomersKey(date) {
        return `dailyCustomers_${date}`;
    }

    function parseReportKey(key) {
        const parts = key.split('_');
        if (parts.length === 3) {
            return { date: parts[1], drawTime: parts[2] };
        }
        return { date: undefined, drawTime: undefined };
    }

    function parsePrizeAmount(amountString) {
        if (!amountString) return 0;
        return parseInt(amountString.replace(/[^\d]/g, ''), 10) || 0;
    }

    function getWinningPrizesMap() {
        const key = getOcrResultKey();
        if (!key) return null;
        const ocrResult = localStorage.getItem(key);
        if (!ocrResult) return null;
        const parsedResult = JSON.parse(ocrResult);
        const prizesMap = new Map();
        if (parsedResult && parsedResult.results) {
            parsedResult.results.forEach(prize => {
                const amount = parsePrizeAmount(prize.amount);
                if (prize.numbers && prize.numbers !== 'N/A') {
                    prize.numbers.split(',').forEach(numStr => {
                        const ticketNumber = numStr.trim().match(/\d+$/)?.[0];
                        if (ticketNumber) prizesMap.set(ticketNumber, { category: prize.category, amount: amount });
                    });
                }
            });
        }
        return prizesMap;
    }

    // --- Modal Functions ---
    function showPrizeCategoryModal(category) {
        prizeCategoryModalText.textContent = category;
        showModal(prizeCategoryModal);
    }

    function openSoldNumbersModal(index, data = tableData) {
        const rowData = data[index];
        if (!rowData || !rowData.soldNumbers) return;
        const winDetailsMap = new Map();
        (rowData.winningTickets || []).forEach(wt => winDetailsMap.set(wt.ticket, getCategoryClass(wt.category)));
        soldNumbersChipContainer.innerHTML = rowData.soldNumbers.map(soldNum => {
            let winnerClass = '';
            for (const [winner, categoryClass] of winDetailsMap.entries()) {
                if (soldNum.endsWith(winner)) { winnerClass = categoryClass; break; }
            }
            return `<span class="sold-chip ${winnerClass ? `winning-chip ${winnerClass}` : ''}">${getNumericDisplay(soldNum)}</span>`;
        }).join('');
        copyAllSoldBtn.onclick = () => navigator.clipboard.writeText(rowData.soldNumbers.join(', ')).then(() => alert('Copied!'));
        showModal(soldNumbersModal);
    }

    function openWinningNumbersModal(index, data = tableData) {
        const rowData = data[index];
        if (!rowData || !rowData.winningTickets || rowData.winningTickets.length === 0) return;
        winningNumbersChipContainer.innerHTML = rowData.winningTickets.map(wt => {
            const categoryClass = getCategoryClass(wt.category);
            return `<span class="sold-chip winning-chip winning-ticket-chip ${categoryClass}" data-ticket-category="${wt.category}">${wt.ticket}</span>`;
        }).join(' ');
        showModal(winningNumbersModal);
    }

    function openUnsoldNumbersModal(index, data = tableData) {
        const rowData = data[index];
        if (!rowData || !rowData.unsoldNumbersWithStatus) return;
        unsoldNumbersChipContainer.innerHTML = rowData.unsoldNumbersWithStatus.map(unsoldNum => {
            return `<span class="sold-chip ${!unsoldNum.isValid ? 'invalid-number' : ''}">${unsoldNum.number}</span>`;
        }).join('');
        showModal(unsoldNumbersModal);
    }

    // --- Core Logic ---
    function deleteSemRow(index) {
        if (!confirm('Are you sure you want to delete this SEM entry?')) return;
        tableData.splice(index, 1);
        renderTable();
        // Optionally, save the report after deletion if auto-save is desired
        // saveReport(entryDate.value, drawTimeSelect.value, tableData);
    }



    function deleteCustomer(customerName) {
        if (!confirm(`Are you sure you want to delete all entries for ${customerName}?`)) return;
        tableData = tableData.filter(row => row.name !== customerName);
        renderTable();
        // Optionally, save the report after deletion if auto-save is desired
        // saveReport(entryDate.value, drawTimeSelect.value, tableData);
    }

    function getTruncatedText(text, maxLength, index, linkClass) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return `${text.substring(0, maxLength)}... <span class="${linkClass}" data-index="${index}">(see more)</span>`;
    }

    function getGroupedData() {
        const groupedData = [];
        if (tableData.length === 0) {
            return groupedData;
        }

        let currentCustomerName = tableData[0].name;
        let currentCustomerRows = [];

        tableData.forEach(row => {
            if (row.name !== currentCustomerName) {
                groupedData.push({
                    customerName: currentCustomerName,
                    rows: currentCustomerRows,
                    summary: calculateCustomerSummary(currentCustomerRows)
                });
                currentCustomerName = row.name;
                currentCustomerRows = [];
            }
            currentCustomerRows.push(row);
        });

        groupedData.push({
            customerName: currentCustomerName,
            rows: currentCustomerRows,
            summary: calculateCustomerSummary(currentCustomerRows)
        });

        return groupedData;
    }

    function calculateCustomerSummary(rows) {
        const summary = {
            totalPurchase: 0,
            totalUnsold: 0,
            totalSold: 0,
            totalWinningTickets: 0,
            totalPWT: 0,
            totalVC: 0,
            totalSVC: 0,
        };

        rows.forEach(rowData => {
            let numberOfTickets = 0;
            const purchaseRanges = (rowData.purchaseRanges || '').split(',').map(r => r.trim()).filter(Boolean);
            for (const range of purchaseRanges) {
                const parts = range.split('-').map(p => p.trim());
                if (parts.length === 2) {
                    const parsedFrom = parseAlphanumericTicket(parts[0]);
                    const parsedTo = parseAlphanumericTicket(parts[1]);
                    const numericFrom = parsedFrom.numericPart;
                    const numericTo = parsedTo.numericPart;
                    if (!isNaN(numericFrom) && !isNaN(numericTo) && numericTo >= numericFrom) {
                        numberOfTickets += (numericTo - numericFrom + 1);
                    }
                } else if (parts.length === 1) {
                    numberOfTickets++;
                }
            }
            summary.totalPurchase += numberOfTickets * (parseInt(rowData.sem, 10) || 0);
            summary.totalUnsold += (rowData.unsoldNumbers || []).length;
            summary.totalSold += (rowData.soldNumbers || []).length;
            summary.totalWinningTickets += (rowData.winningTickets || []).length;

            (rowData.pwtBreakdown || []).forEach(item => {
                summary.totalPWT += parsePrizeAmount(item);
            });
            (rowData.vcBreakdown || []).forEach(item => {
                summary.totalVC += parsePrizeAmount(item);
            });
            (rowData.svcBreakdown || []).forEach(item => {
                summary.totalSVC += parsePrizeAmount(item);
            });
        });

        return summary;
    }

    function renderTable() {
        customerTableBody.innerHTML = '';
        const groupedData = getGroupedData();
        let customerSerial = 0;

        groupedData.forEach(customerGroup => {
            customerSerial++;
            const customerRows = customerGroup.rows;
            const summary = customerGroup.summary;

            customerRows.forEach((rowData, rowIndex) => {
                const tr = document.createElement('tr');
                const globalIndex = tableData.indexOf(rowData);
                tr.dataset.index = globalIndex;
                
                let cellsHTML = '';
                if (rowIndex === 0) {
                    cellsHTML += `<td rowspan="${customerRows.length}">${customerSerial}</td>`;
                    cellsHTML += `<td rowspan="${customerRows.length}">
                                    ${customerGroup.customerName} 
                                    <div class="action-icons">
                                    <i class="fas fa-user-times delete-customer" data-customer-name="${customerGroup.customerName}" title="Delete all entries for ${customerGroup.customerName}"></i>
                                  </div>
                                  </td>`;
                }
                
                cellsHTML += `
                    <td>${rowData.sem}</td>
                    <td><input type="text" class="purchase-input" placeholder="e.g., 32180-32199,45630-43649" value="${rowData.purchaseRanges || ''}"></td>
                    <td>
                        <input type="text" class="unsold-input" placeholder="e.g., 2251,2252" value="${rowData.unsoldRaw || ''}" ${!rowData.purchaseRanges ? 'disabled' : ''}>
                        <div class="unsold-display">
                            ${rowData.unsoldNumbers && rowData.unsoldNumbers.length > 0 ? `${rowData.unsoldNumbers.length} unsold` : ''}
                            ${rowData.unsoldNumbersWithStatus && rowData.unsoldNumbersWithStatus.filter(n => !n.isValid).length > 0 ? ` <span class="invalid-number">(${rowData.unsoldNumbersWithStatus.filter(n => !n.isValid).length} invalid)</span>` : ''}
                            ${rowData.unsoldNumbers && rowData.unsoldNumbers.length > 2 ? ` <span class="unsold-more-link" data-index="${globalIndex}">... (see all)</span>` : ''}
                        </div>
                    </td>
                `;

                const soldRanges = rowData.soldRanges || [];
                let soldHTML = '';
                if (soldRanges.length > 0) {
                    const soldText = soldRanges.map(getNumericDisplay).join(', ');
                    soldHTML = `<div class="sold-preview">${getTruncatedText(soldText, 10, globalIndex, 'sold-more-link')}</div>`;
                }
                cellsHTML += `<td>${soldHTML}</td>`;

                const winningTickets = rowData.winningTickets || [];
                let winningHTML = '';
                if (winningTickets.length > 0) {
                    let previewHTML = winningTickets.slice(0, 2).map(wt => {
                        const categoryClass = getCategoryClass(wt.category);
                        return `<span class="sold-chip winning-chip winning-ticket-chip ${categoryClass}" data-ticket-category="${wt.category}">${wt.ticket}</span>`;
                    }).join(' ');
                    if (winningTickets.length > 2) previewHTML += ` <span class="winning-more-link" data-index="${globalIndex}">... (+${winningTickets.length - 2} more)</span>`;
                    winningHTML = `<div class="winning-preview">${previewHTML}</div>`;
                }
                cellsHTML += `<td>${winningHTML}</td>`;

                const pwtHTML = (rowData.pwtBreakdown || []).join('<br>');
                const vcHTML = (rowData.vcBreakdown || []).join('<br>');
                const svcHTML = (rowData.svcBreakdown || []).join('<br>');
                
                cellsHTML += `<td>${pwtHTML}</td><td>${vcHTML}</td><td>${svcHTML}</td>`;
                cellsHTML += `<td>
                                <div class="action-icons">
                                    <i class="fas fa-edit edit-sem-row" data-index="${globalIndex}" title="Edit this SEM entry"></i>
                                    <i class="fas fa-trash-alt delete-sem-row" data-index="${globalIndex}" title="Delete this SEM entry"></i>
                                </div>
                              </td>`;
                tr.innerHTML = cellsHTML;
                customerTableBody.appendChild(tr);
            });

            // Add summary row for the customer
            const summaryTr = document.createElement('tr');
            summaryTr.classList.add('summary-row');
            summaryTr.innerHTML = `
                <th colspan="2">Total</th>
                <th></th>
                <th>${summary.totalPurchase}</th>
                <th>${summary.totalUnsold}</th>
                <th>${summary.totalSold}</th>
                <th>${summary.totalWinningTickets}</th>
                <th>${summary.totalPWT.toLocaleString('en-IN')}</th>
                <th>${summary.totalVC.toLocaleString('en-IN')}</th>
                <th>${summary.totalSVC.toLocaleString('en-IN')}</th>
                <th></th>
            `;
            customerTableBody.appendChild(summaryTr);
        });
    }

    function renderSummaryRow() {
        let totalPurchase = 0;
        let totalUnsold = 0;
        let totalSold = 0;
        let totalWinningTickets = 0;
        let totalPWT = 0;
        let totalVC = 0;
        let totalSVC = 0;

        tableData.forEach(rowData => {
            totalPurchase += (rowData.purchaseCount || 0);
            totalUnsold += (rowData.unsoldNumbers || []).length;
            totalSold += (rowData.soldNumbers || []).length;
            totalWinningTickets += (rowData.winningTickets || []).length;

            (rowData.pwtBreakdown || []).forEach(item => {
                totalPWT += parsePrizeAmount(item);
            });
            (rowData.vcBreakdown || []).forEach(item => {
                totalVC += parsePrizeAmount(item);
            });
            (rowData.svcBreakdown || []).forEach(item => {
                totalSVC += parsePrizeAmount(item);
            });
        });

        let summaryRow = document.querySelector('#customer-table tfoot');
        if (!summaryRow) {
            const tfoot = document.createElement('tfoot');
            document.getElementById('customer-table').appendChild(tfoot);
            summaryRow = tfoot;
        }

        summaryRow.innerHTML = `
            <tr>
                <th colspan="2">Total</th>
                <th></th>
                <th>${totalPurchase}</th>
                <th>${totalUnsold}</th>
                <th>${totalSold}</th>
                <th>${totalWinningTickets}</th>
                <th>${totalPWT.toLocaleString('en-IN')}</th>
                <th>${totalVC.toLocaleString('en-IN')}</th>
                <th>${totalSVC.toLocaleString('en-IN')}</th>
                <th></th>
            </tr>
        `;
    }

    function updateRowData(index) {
        const rowData = tableData[index];
        if (!rowData) return;

        const purchaseSet = new Set();
        const purchaseRanges = (rowData.purchaseRanges || '').split(',').map(r => r.trim()).filter(Boolean);
        let numberOfTickets = 0;
        
        for (const range of purchaseRanges) {
            const parts = range.split('-').map(p => p.trim());
            if (parts.length === 2) {
                const parsedFrom = parseAlphanumericTicket(parts[0]);
                const parsedTo = parseAlphanumericTicket(parts[1]);
                const numericFrom = parsedFrom.numericPart;
                const numericTo = parsedTo.numericPart;
                const commonPrefix = parsedFrom.prefix;
                const commonSuffix = parsedFrom.suffix;
                const commonPadding = Math.max(parsedFrom.padding, parsedTo.padding);

                if (!isNaN(numericFrom) && !isNaN(numericTo) && numericTo >= numericFrom) {
                    numberOfTickets += (numericTo - numericFrom + 1);
                    for (let i = numericFrom; i <= numericTo; i++) {
                        purchaseSet.add(formatAlphanumericTicket(commonPrefix, i, commonPadding, commonSuffix));
                    }
                }
            } else if (parts.length === 1) {
                numberOfTickets++;
                purchaseSet.add(parts[0]);
            }
        }

        rowData.purchaseCount = numberOfTickets * (parseInt(rowData.sem, 10) || 0);


        if (purchaseSet.size === 0) {
            rowData.soldRanges = []; rowData.soldNumbers = []; rowData.winningTickets = [];
            rowData.pwtBreakdown = []; rowData.vcBreakdown = []; rowData.svcBreakdown = [];
            rowData.unsoldValidatedHTML = rowData.unsoldRaw || '';
            renderTable();
            return;
        }

        const shorthandUnsold = (rowData.unsoldRaw || '').split(',').map(n => n.trim()).filter(Boolean);
        const unsoldNumbers = [...new Set(shorthandUnsold)];
        rowData.unsoldNumbers = unsoldNumbers;

        const unsoldNumbersWithStatus = unsoldNumbers.map(num => ({
            number: num,
            isValid: purchaseSet.has(num)
        }));
        rowData.unsoldNumbersWithStatus = unsoldNumbersWithStatus;

        const validUnsoldNumbers = new Set(unsoldNumbers.filter(num => purchaseSet.has(num)));
        
        rowData.soldNumbers = Array.from(purchaseSet).filter(num => !validUnsoldNumbers.has(num));
        rowData.soldRanges = compressNumberList(rowData.soldNumbers);

        const winningPrizesMap = getWinningPrizesMap();
        let pwtBreakdown = [];
        let vcBreakdown = [];
        let svcBreakdown = [];
        const winningTicketDetails = [];

        if (winningPrizesMap && winningPrizesMap.size > 0) {
            const sem = parseInt(rowData.sem, 10) || 0;
            rowData.soldNumbers.forEach(soldNum => {
                for (const [winner, prizeDetails] of winningPrizesMap.entries()) {
                    if (soldNum.endsWith(winner)) {
                        winningTicketDetails.push({ ticket: winner, category: prizeDetails.category });
                        const categoryClass = getCategoryClass(prizeDetails.category);
                        
                        const pwtWinAmount = prizeDetails.amount * sem;
                        pwtBreakdown.push(`${pwtWinAmount.toLocaleString('en-IN')} <span class="pwt-winner-info ${categoryClass}">(${prizeDetails.category}: ${winner})</span>`);

                        const vcAmount = VC_AMOUNTS[prizeDetails.category] || 0;
                        if (vcAmount > 0) {
                            const vcWinAmount = vcAmount * sem;
                            vcBreakdown.push(`${vcWinAmount.toLocaleString('en-IN')} <span class="pwt-winner-info ${categoryClass}">(${prizeDetails.category}: ${winner})</span>`);
                        }

                        const svcAmount = SVC_AMOUNTS[prizeDetails.category] || 0;
                        if (svcAmount > 0) {
                            const svcWinAmount = svcAmount * sem;
                            svcBreakdown.push(`${svcWinAmount.toLocaleString('en-IN')} <span class="pwt-winner-info ${categoryClass}">(${prizeDetails.category}: ${winner})</span>`);
                        }
                    }
                }
            });
        }
        const uniqueWinners = new Map();
        winningTicketDetails.forEach(d => { if (!uniqueWinners.has(d.ticket)) uniqueWinners.set(d.ticket, d.category); });
        rowData.winningTickets = Array.from(uniqueWinners.entries()).map(([ticket, category]) => ({ ticket, category }));
        
        rowData.pwtBreakdown = pwtBreakdown;
        rowData.vcBreakdown = vcBreakdown;
        rowData.svcBreakdown = svcBreakdown;

        renderTable();
    }

    function addNewRow(name, sem) {
        tableData.push({ name, sem });
        currentCustomer = { name, sem };
        renderTable();
    }

    // --- Report Functions ---
    function saveReport(date, drawTime, data) {
        if (data.length === 0) {
            alert('No customer data to save.');
            return;
        }
        // Save the full report
        const reportKey = getReportKey(date, drawTime);
        localStorage.setItem(reportKey, JSON.stringify(data));

        // Update the daily customer list
        const dailyCustomersKey = getDailyCustomersKey(date);
        const existingCustomersRaw = localStorage.getItem(dailyCustomersKey);
        const existingCustomers = existingCustomersRaw ? JSON.parse(existingCustomersRaw) : [];
        
        // Map: customerName -> Set of SEMs
        const customerSemMap = new Map();
        existingCustomers.forEach(customer => {
            if (!customerSemMap.has(customer.name)) {
                customerSemMap.set(customer.name, new Set());
            }
            customerSemMap.get(customer.name).add(customer.sem);
        });

        data.forEach(row => {
            if (!customerSemMap.has(row.name)) {
                customerSemMap.set(row.name, new Set());
            }
            customerSemMap.get(row.name).add(row.sem);
        });

        // Convert map back to array of {name, sem} objects, one for each unique name-sem pair
        const updatedDailyCustomers = [];
        customerSemMap.forEach((sems, name) => {
            sems.forEach(sem => {
                updatedDailyCustomers.push({ name: name, sem: sem });
            });
        });

        localStorage.setItem(dailyCustomersKey, JSON.stringify(updatedDailyCustomers));

        alert(`Customer data for ${date} (${drawTime}) saved successfully!`);
        loadAndRenderReportCards(date);
    }

    function loadData(date, drawTime) {
        const reportKey = getReportKey(date, drawTime);
        const savedData = localStorage.getItem(reportKey);

        if (savedData) {
            tableData = JSON.parse(savedData);
        } else {
            tableData = [];
        }

        tableData.forEach((_, index) => updateRowData(index));
        renderTable();
    }

    function loadAndRenderReportCards(dateFilter) {
        reportCardsContainer.innerHTML = '';
        let reportKeys = Object.keys(localStorage).filter(key => key.startsWith('customerReports_'));

        if (dateFilter) {
            reportKeys = reportKeys.filter(key => {
                const { date } = parseReportKey(key);
                return date === dateFilter;
            });
        }

        reportKeys.sort().reverse();

        if (reportKeys.length === 0) {
            reportCardsContainer.innerHTML = '<p style="text-align: center; color: var(--dark-gray-color);">No saved reports for this date.</p>';
            return;
        }

        reportKeys.forEach(key => {
            const { date, drawTime } = parseReportKey(key);
            if (date && drawTime) {
                const card = document.createElement('div');
                card.classList.add('report-card');
                card.dataset.reportKey = key;
                card.innerHTML = `<h3>${date}</h3><p>${drawTime}</p>`;
                reportCardsContainer.appendChild(card);
            }
        });
    }

    function openReportDetailModal(reportKey) {
        const savedData = localStorage.getItem(reportKey);
        if (!savedData) {
            alert('Report data not found.');
            return;
        }
        const data = JSON.parse(savedData);
        const { date, drawTime } = parseReportKey(reportKey);
        reportDateDisplay.textContent = `${date} (${drawTime})`;

        const customerNames = [...new Set(data.map(item => item.name))];
        customerListContainer.innerHTML = '';
        customerNames.forEach(name => {
            const item = document.createElement('div');
            item.classList.add('customer-list-item');
            item.innerHTML = `
                <span>${name}</span>
                <i class="fas fa-share-alt share-customer-report" data-customer-name="${name}" data-report-key="${reportKey}"></i>
            `;
            item.dataset.customerName = name;
            item.dataset.reportKey = reportKey;
            customerListContainer.appendChild(item);
        });

        showModal(reportDetailModal);
    }

    function shareCustomerReportAsImage(customerName, reportKey) {
        const savedData = localStorage.getItem(reportKey);
        if (!savedData) return;

        const allData = JSON.parse(savedData);
        const customerData = allData.filter(item => item.name === customerName);
        const { date, drawTime } = parseReportKey(reportKey);
        const summary = calculateReportSummary(allData);

        const reportContent = `
            <html>
                <head>
                    <title>Details for ${customerName} on ${date}</title>
                    <style>
                        body { font-family: sans-serif; }
                        table { width: 100%; border-collapse: collapse; font-size: 12pt; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                        th { background-color: #f2f2f2; }
                        .col-sold { width: 35%; }
                        .col-pwt, .col-vc, .col-svc { width: 15%; }
                        .col-winning { width: 15%; }
                        .summary-table { margin-top: 30px; }
                        .summary-table th { text-align: right; width: 85%; }
                        .summary-table td { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>Report for ${customerName}</h2>
                    <h3>Date: ${date} (${drawTime})</h3>
                    <table>
                        <thead>
                            <tr>
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
                            ${customerData.map(row => `
                                <tr>
                                    <td>${row.sem}</td>
                                    <td>${row.purchaseRanges || ''}</td>
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
        
        const reportContainer = document.createElement('div');
        reportContainer.style.width = '1191px';
        reportContainer.style.height = '842px';
        reportContainer.innerHTML = reportContent;
        document.body.appendChild(reportContainer);

        html2canvas(reportContainer).then(canvas => {
            document.body.removeChild(reportContainer);
            canvas.toBlob(blob => {
                const file = new File([blob], `report-${customerName}-${date}.png`, { type: 'image/png' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    navigator.share({
                        files: [file],
                        title: `Report for ${customerName}`,
                        text: `Here is the report for ${customerName} on ${date}.`,
                    })
                    .catch(error => console.error('Error sharing:', error));
                } else {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(file);
                    link.download = `report-${customerName}-${date}.png`;
                    link.click();
                }
            }, 'image/png');
        });
    }

    function openCustomerDetailPopup(customerName, reportKey) {
        const savedData = localStorage.getItem(reportKey);
        if (!savedData) return;

        const allData = JSON.parse(savedData);
        const customerData = allData.filter(item => item.name === customerName);
        const { date, drawTime } = parseReportKey(reportKey);
        const summary = calculateReportSummary(allData);

        const popupContent = `
            <html>
                <head>
                    <title>Details for ${customerName} on ${date}</title>
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
                    <h2>Report for ${customerName}</h2>
                    <h3>Date: ${date} (${drawTime})</h3>
                    <table>
                        <thead>
                            <tr>
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
                            ${customerData.map(row => `
                                <tr>
                                    <td>${row.sem}</td>
                                    <td>${row.purchaseRanges || ''}</td>
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

    // --- Event Handlers ---
    addCustomerBtn.addEventListener('click', () => {
        const name = prompt('Enter customer name:');
        if (name && name.trim()) {
            const semTypes = ['5', '10', '15', '20'];
            semTypes.forEach(sem => {
                addNewRow(name.trim(), sem);
            });
        }
    });
    searchUnsoldBtn.addEventListener('click', () => {
        searchCustomerNameInput.value = '';
        searchUnsoldNumbersInput.value = '';
        searchUnsoldResultsContainer.innerHTML = '';
        showModal(searchUnsoldModal);
    });
    document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', (e) => hideModal(e.target.closest('.modal'))));
    
    
    submitAllDataBtn.addEventListener('click', () => {
        const date = entryDate.value;
        const drawTime = drawTimeSelect.value;
        if (!date) {
            alert('Please select a date before submitting data.');
            return;
        }
        saveReport(date, drawTime, tableData);
    });

    submitSearchUnsoldBtn.addEventListener('click', () => {
        const customerName = searchCustomerNameInput.value.trim().toLowerCase();
        const searchNumbersRaw = searchUnsoldNumbersInput.value.trim();
        const searchNumbers = searchNumbersRaw.split(',').map(n => n.trim()).filter(Boolean);

        searchUnsoldResultsContainer.innerHTML = '';

        if (!customerName && searchNumbers.length === 0) {
            searchUnsoldResultsContainer.innerHTML = '<p>Please enter a customer name or ticket number(s) to search.</p>';
            return;
        }

        let resultsFound = false;

        if (customerName && searchNumbers.length === 0) {
            // Search by customer name only
            const customerData = tableData.filter(row => row.name.toLowerCase() === customerName);
            if (customerData.length > 0) {
                resultsFound = true;
                const customerResultDiv = document.createElement('div');
                customerResultDiv.classList.add('search-result-item');
                
                let html = `<h4>${customerData[0].name}</h4>`;

                const allUnsold = customerData.flatMap(row => row.unsoldNumbers || []);
                const allSold = customerData.flatMap(row => row.soldNumbers || []);
                const allWinning = customerData.flatMap(row => row.winningTickets || []);

                if (allUnsold.length > 0) {
                    html += `<p>Unsold Tickets:</p><div class="sold-chip-container">${allUnsold.map(n => `<span class="sold-chip">${n}</span>`).join('')}</div>`;
                }
                if (allSold.length > 0) {
                    html += `<p>Sold Tickets:</p><div class="sold-chip-container">${allSold.map(n => `<span class="sold-chip">${getNumericDisplay(n)}</span>`).join('')}</div>`;
                }
                if (allWinning.length > 0) {
                    html += `<p>Winning Tickets:</p><div class="sold-chip-container">${allWinning.map(wt => `<span class="sold-chip winning-chip ${getCategoryClass(wt.category)}">${wt.ticket}</span>`).join(' ')}</div>`;
                }

                if (allUnsold.length === 0 && allSold.length === 0) {
                    html += '<p>No tickets found for this customer.</p>';
                }

                customerResultDiv.innerHTML = html;
                searchUnsoldResultsContainer.appendChild(customerResultDiv);
            }
        } else if (searchNumbers.length > 0) {
            // Search by ticket number(s)
            searchNumbers.forEach(number => {
                let foundInPurchase = false;
                tableData.forEach(rowData => {
                    const purchaseSet = new Set();
                    const purchaseRanges = (rowData.purchaseRanges || '').split(',').map(r => r.trim()).filter(Boolean);
                    for (const range of purchaseRanges) {
                        const parts = range.split('-').map(p => p.trim());
                        if (parts.length === 2) {
                            const parsedFrom = parseAlphanumericTicket(parts[0]);
                            const parsedTo = parseAlphanumericTicket(parts[1]);
                            const numericFrom = parsedFrom.numericPart;
                            const numericTo = parsedTo.numericPart;
                            if (!isNaN(numericFrom) && !isNaN(numericTo) && numericTo >= numericFrom) {
                                for (let i = numericFrom; i <= numericTo; i++) {
                                    purchaseSet.add(formatAlphanumericTicket(parsedFrom.prefix, i, parsedFrom.padding, parsedFrom.suffix));
                                }
                            }
                        } else if (parts.length === 1) {
                            purchaseSet.add(parts[0]);
                        }
                    }

                    if (purchaseSet.has(number)) {
                        foundInPurchase = true;
                        resultsFound = true;
                        let status = 'Sold';
                        if ((rowData.unsoldNumbers || []).includes(number)) {
                            status = 'Unsold';
                        }
                        
                        let winningInfo = '';
                        const winningTicket = (rowData.winningTickets || []).find(wt => number.endsWith(wt.ticket));
                        if (winningTicket) {
                            winningInfo = ` - <span class="winning-chip ${getCategoryClass(winningTicket.category)}">Winning Ticket (${winningTicket.category})</span>`;
                        }

                        const ticketResultDiv = document.createElement('div');
                        ticketResultDiv.classList.add('search-result-item');
                        ticketResultDiv.innerHTML = `
                            <h4>Ticket: ${number}</h4>
                            <p>Customer: ${rowData.name} (SEM: ${rowData.sem})</p>
                            <p>Status: ${status}${winningInfo}</p>
                        `;
                        searchUnsoldResultsContainer.appendChild(ticketResultDiv);
                    }
                });
                if (!foundInPurchase) {
                     const ticketResultDiv = document.createElement('div');
                        ticketResultDiv.classList.add('search-result-item');
                        ticketResultDiv.innerHTML = `<h4>Ticket: ${number}</h4><p>Not found in any purchase.</p>`;
                        searchUnsoldResultsContainer.appendChild(ticketResultDiv);
                }
            });
        }

        if (!resultsFound && !(customerName && searchNumbers.length === 0)) {
            searchUnsoldResultsContainer.innerHTML = '<p>No matching entries found.</p>';
        }
    });



    customerTableBody.addEventListener('change', (e) => {
        const target = e.target;
        const tr = target.closest('tr');
        if (!tr) return;
        const rowIndex = parseInt(tr.dataset.index, 10);
        const rowData = tableData[rowIndex];
        if (!rowData) return;
        if (target.classList.contains('purchase-input')) rowData.purchaseRanges = target.value;
        if (target.classList.contains('unsold-input')) rowData.unsoldRaw = target.value;
        updateRowData(rowIndex);
    });

    customerTableBody.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('sold-more-link')) openSoldNumbersModal(target.dataset.index);
        if (target.classList.contains('unsold-more-link')) openUnsoldNumbersModal(target.dataset.index);
        if (target.classList.contains('winning-more-link')) openWinningNumbersModal(target.dataset.index);
        if (target.classList.contains('winning-ticket-chip')) showPrizeCategoryModal(target.dataset.ticketCategory);
        if (target.classList.contains('delete-sem-row')) deleteSemRow(parseInt(target.dataset.index, 10));
        if (target.classList.contains('delete-customer')) deleteCustomer(target.dataset.customerName);
        if (target.classList.contains('edit-sem-row')) {
            const rowIndex = parseInt(target.dataset.index, 10);
            const rowData = tableData[rowIndex];
            if (rowData) {
                editCustomerNameInput.value = rowData.name;
                editSemTypeSelect.value = rowData.sem;
                editPurchaseInput.value = rowData.purchaseRanges || '';
                editUnsoldInput.value = rowData.unsoldRaw || '';
                updateCustomerBtn.dataset.rowIndex = rowIndex;
                showModal(editCustomerModal);
            }
        }
    });

    winningNumbersChipContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('winning-ticket-chip')) showPrizeCategoryModal(e.target.dataset.ticketCategory);
    });

    reportCardsContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.report-card');
        if (card) {
            openReportDetailModal(card.dataset.reportKey);
        }
    });

    customerListContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('share-customer-report')) {
            e.stopPropagation();
            const customerName = target.dataset.customerName;
            const reportKey = target.dataset.reportKey;
            shareCustomerReportAsImage(customerName, reportKey);
        } else {
            const item = e.target.closest('.customer-list-item');
            if (item) {
                const customerName = item.dataset.customerName;
                const reportKey = item.dataset.reportKey;
                openCustomerDetailPopup(customerName, reportKey);
            }
        }
    });

    entryDate.addEventListener('change', () => {
        const oldKey = getReportKey(currentEntryDate, currentDrawTime);
        if (tableData.length > 0) {
            localStorage.setItem(oldKey, JSON.stringify(tableData));
        }
        currentEntryDate = entryDate.value;
        loadData(entryDate.value, drawTimeSelect.value);
        loadAndRenderReportCards(entryDate.value);
    });

    drawTimeSelect.addEventListener('change', () => {
        const oldKey = getReportKey(entryDate.value, currentDrawTime);
        if (tableData.length > 0) {
            localStorage.setItem(oldKey, JSON.stringify(tableData));
        }
        currentDrawTime = drawTimeSelect.value;
        loadData(entryDate.value, drawTimeSelect.value);
    });

    viewResultBtn.addEventListener('click', () => {
        const key = getOcrResultKey();
        if (!key) return alert('Please select a date and draw time.');
        const ocrResult = localStorage.getItem(key);
        if (!ocrResult) return alert('No prize result found for the selected date and draw time.');
        const data = JSON.parse(ocrResult);
        prizeResultTitle.textContent = `Prize Result for ${data.date} (${drawTimeSelect.options[drawTimeSelect.selectedIndex].text})`;
        prizeResultTableBody.innerHTML = '';
        data.results.forEach(prize => {
            const tr = document.createElement('tr');
            const categoryClass = getCategoryClass(prize.category);
            if (categoryClass) {
                tr.classList.add(categoryClass);
            }
            tr.innerHTML = `<td>${prize.category}</td><td>${prize.numbers}</td>`;
            prizeResultTableBody.appendChild(tr);
        });
        showModal(prizeResultModal);
    });

    updateCustomerBtn.addEventListener('click', () => {
        const rowIndex = parseInt(updateCustomerBtn.dataset.rowIndex, 10);
        const newName = editCustomerNameInput.value.trim();
        const newSem = editSemTypeSelect.value;
        const newPurchase = editPurchaseInput.value.trim();
        const newUnsold = editUnsoldInput.value.trim();

        if (!newName) {
            alert('Please enter a customer name.');
            return;
        }

        if (rowIndex >= 0 && rowIndex < tableData.length) {
            const rowData = tableData[rowIndex];
            rowData.name = newName;
            rowData.sem = newSem;
            rowData.purchaseRanges = newPurchase;
            rowData.unsoldRaw = newUnsold;
            
            hideModal(editCustomerModal);
            updateRowData(rowIndex);
        }
    });
    
    // --- Initial Setup ---
    setCurrentDate();
    currentEntryDate = entryDate.value;
    currentDrawTime = drawTimeSelect.value;
    loadData(currentEntryDate, currentDrawTime);
    loadAndRenderReportCards(currentEntryDate);
});