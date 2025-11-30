document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const PRIZE_AMOUNTS = {
        '1st Prize': '₹25,000/-',
        '2nd Prize': '₹20,000/-',
        '3rd Prize': '₹2,000/-',
        '4th Prize': '₹700/-',
        '5th Prize': '₹300/-'
    };

    // --- Element References ---
    const imageUpload = document.getElementById('image-upload');
    const uploadedImage = document.getElementById('uploaded-image');
    const imageContainer = document.querySelector('.image-container');
    const cropBoxes = document.querySelectorAll('.crop-box');
    const extractBtn = document.getElementById('extract-btn');
    const resultsTableBody = document.querySelector('#results-table tbody');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const resultDateInput = document.getElementById('result-date');
    const drawTimeSelect = document.getElementById('draw-time');
    const saveResultBtn = document.getElementById('save-result-btn');
    const reportsListContainer = document.getElementById('reports-list');
    const resultsHeader = document.getElementById('results-header');
    
    // Modal elements
    const drawsModal = document.getElementById('draws-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalDrawsList = document.getElementById('modal-draws-list');
    const closeModalBtn = document.querySelector('.close-button');

    let currentImage = null;
    let reportsData = {}; // To hold grouped reports { date: { draw: key, ... } }

    // --- Main Initialization ---
    setCurrentDate();
    loadReports();
    initializeCropBoxes();

    // --- Event Listeners ---
    imageUpload.addEventListener('change', handleImageUpload);
    extractBtn.addEventListener('click', handleOcrExtraction);
    saveResultBtn.addEventListener('click', saveResult);
    downloadCsvBtn.addEventListener('click', downloadCsv);
    reportsListContainer.addEventListener('click', handleReportCardClick);
    closeModalBtn.addEventListener('click', () => drawsModal.style.display = 'none');
    window.addEventListener('click', (event) => {
        if (event.target == drawsModal) {
            drawsModal.style.display = 'none';
        }
    });
    modalDrawsList.addEventListener('click', handleModalDrawClick);


    // --- Functions ---

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImage.src = e.target.result;
                uploadedImage.onload = () => {
                    currentImage = uploadedImage;
                    cropBoxes.forEach(box => box.style.display = 'block');
                    initializeCropBoxes();
                };
            };
            reader.readAsDataURL(file);
        }
    }

    function initializeCropBoxes() {
        const defaultPositions = {
            'crop-box-1': { top: 35, left: 45, width: 40, height: 10 },
            'crop-box-2': { top: 53, left: 45, width: 50, height: 10 },
            'crop-box-3': { top: 63, left: 45, width: 50, height: 8 },
            'crop-box-4': { top: 72, left: 45, width: 50, height: 8 },
            'crop-box-5': { top: 85, left: 5, width: 90, height: 15 }
        };

        cropBoxes.forEach(box => {
            const id = box.id;
            let savedPos = JSON.parse(localStorage.getItem(`cropBox_${id}`));
            if (!savedPos) savedPos = defaultPositions[id];

            if (savedPos) {
                box.style.top = `${savedPos.top}%`;
                box.style.left = `${savedPos.left}%`;
                box.style.width = `${savedPos.width}%`;
                box.style.height = `${savedPos.height}%`;
            }
            makeDraggableAndResizable(box);
        });
    }

    function saveCropBoxPosition(box) {
        const id = box.id;
        const containerRect = imageContainer.getBoundingClientRect();
        const boxRect = box.getBoundingClientRect();

        const pos = {
            top: ((boxRect.top - containerRect.top) / containerRect.height) * 100,
            left: ((boxRect.left - containerRect.left) / containerRect.width) * 100,
            width: (boxRect.width / containerRect.width) * 100,
            height: (boxRect.height / containerRect.height) * 100,
        };
        localStorage.setItem(`cropBox_${id}`, JSON.stringify(pos));
    }

    function makeDraggableAndResizable(element) {
        const handle = element.querySelector('.resize-handle');
        let isDragging = false, isResizing = false;
        let startX, startY, initialX, initialY, initialWidth, initialHeight;

        const dragStart = (e) => {
            isDragging = true;
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            startX = clientX;
            startY = clientY;
            initialX = element.offsetLeft;
            initialY = element.offsetTop;
            element.style.cursor = 'grabbing';
            if (e.preventDefault) e.preventDefault();
        };

        const resizeStart = (e) => {
            isResizing = true;
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;
            startX = clientX;
            startY = clientY;
            initialWidth = element.offsetWidth;
            initialHeight = element.offsetHeight;
            if (e.preventDefault) e.preventDefault();
        };

        const move = (e) => {
            const clientX = e.clientX || e.touches[0].clientX;
            const clientY = e.clientY || e.touches[0].clientY;

            if (isDragging) {
                const dx = clientX - startX, dy = clientY - startY;
                const newX = initialX + dx, newY = initialY + dy;
                const maxLeft = imageContainer.offsetWidth - element.offsetWidth;
                const maxTop = imageContainer.offsetHeight - element.offsetHeight;
                element.style.left = `${Math.max(0, Math.min(newX, maxLeft))}px`;
                element.style.top = `${Math.max(0, Math.min(newY, maxTop))}px`;
            }

            if (isResizing) {
                const dx = clientX - startX, dy = clientY - startY;
                const newWidth = initialWidth + dx, newHeight = initialHeight + dy;
                const maxW = imageContainer.offsetWidth - element.offsetLeft;
                const maxH = imageContainer.offsetHeight - element.offsetTop;
                element.style.width = `${Math.max(30, Math.min(newWidth, maxW))}px`;
                element.style.height = `${Math.max(20, Math.min(newHeight, maxH))}px`;
            }
        };

        const end = () => {
            if (isDragging || isResizing) {
                isDragging = false;
                isResizing = false;
                element.style.cursor = 'move';
                saveCropBoxPosition(element);
            }
        };

        element.addEventListener('mousedown', (e) => { if (e.target !== handle) dragStart(e); });
        element.addEventListener('touchstart', (e) => { if (e.target !== handle) dragStart(e); }, { passive: false });
        handle.addEventListener('mousedown', resizeStart);
        handle.addEventListener('touchstart', resizeStart, { passive: false });
        document.addEventListener('mousemove', move);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('mouseup', end);
        document.addEventListener('touchend', end);
    }

    async function handleOcrExtraction() {
        if (!currentImage) {
            alert('Please upload an image first.');
            return;
        }

        extractBtn.textContent = 'Extracting...';
        extractBtn.disabled = true;
        resultsTableBody.innerHTML = '';

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = currentImage.naturalWidth;
        canvas.height = currentImage.naturalHeight;
        ctx.drawImage(currentImage, 0, 0);

        const results = [];
        for (const box of cropBoxes) {
            const prizeCategory = box.querySelector('span').textContent;
            const boxRect = box.getBoundingClientRect();
            const containerRect = imageContainer.getBoundingClientRect();

            const scaleX = currentImage.naturalWidth / containerRect.width;
            const scaleY = currentImage.naturalHeight / containerRect.height;

            const cropX = (boxRect.left - containerRect.left) * scaleX;
            const cropY = (boxRect.top - containerRect.top) * scaleY;
            const cropWidth = boxRect.width * scaleX;
            const cropHeight = boxRect.height * scaleY;

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropWidth;
            cropCanvas.height = cropHeight;
            cropCanvas.getContext('2d').drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

            try {
                const { data: { text } } = await Tesseract.recognize(cropCanvas, 'eng');
                results.push({ category: prizeCategory, text: text });
            } catch (error) {
                console.error(`OCR failed for ${prizeCategory}:`, error);
                results.push({ category: prizeCategory, text: 'OCR Error' });
            }
        }
        
        displayResults(results);
        extractBtn.textContent = 'Extract Numbers';
        extractBtn.disabled = false;
        saveResultBtn.style.display = 'block';
    }

    function displayResults(results, date, drawTime) {
        resultsTableBody.innerHTML = '';
        const dateStr = date || resultDateInput.value;
        const drawTimeValue = drawTime || drawTimeSelect.value;
        const drawTimeText = drawTimeSelect.options[drawTimeSelect.selectedIndex].text;
        resultsHeader.textContent = `Results for ${dateStr} (${drawTimeText})`;

        results.forEach(result => {
            let numbers = 'N/A';
            const text = result.text || result.numbers || ''; // Handle both live and saved data
            if (result.category.includes('1st')) {
                const match = text.match(/\b\d{2}[A-Z]?\s+\d{5}\b/g);
                if (match) numbers = match.join(', ');
            } else if (result.category.includes('2nd')) {
                const match = text.match(/\b\d{5}\b/g);
                if (match) numbers = match.join(', ');
            } else if (result.category.includes('5th')) {
                // For 5th prize, use a more lenient regex to capture all numbers from the large text block
                let match = text.match(/\d{4}/g);
                if (!match || match.length === 0) {
                    match = text.match(/\d{3}/g);
                }
                if (match) numbers = match.join(', ');
            } else { // For 3rd and 4th prizes
                let match = text.match(/\b\d{4}\b/g);
                if (!match || match.length === 0) match = text.match(/\b\d{3}\b/g);
                if (match) numbers = match.join(', ');
            }
            
            const amount = result.amount || PRIZE_AMOUNTS[result.category] || 'N/A';

            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${result.category}</td><td>${amount}</td><td>${numbers}</td>`;
            resultsTableBody.appendChild(tr);
        });
    }

    function saveResult() {
        const date = resultDateInput.value;
        const drawTime = drawTimeSelect.value;

        if (!date || !drawTime) {
            alert('Please select a date and draw time before saving.');
            return;
        }

        const key = `lotteryResult_${date}_${drawTime}`;
        const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
        const resultsData = rows.map(row => ({
            category: row.cells[0].textContent,
            amount: row.cells[1].textContent,
            numbers: row.cells[2].textContent
        }));

        const dataToSave = { date, drawTime, results: resultsData };
        localStorage.setItem(key, JSON.stringify(dataToSave));
        alert(`Result for ${date} (${drawTime}) saved!`);
        loadReports(); // Refresh the list
    }

    function loadReports() {
        reportsListContainer.innerHTML = '';
        reportsData = {};
        let migrationNeeded = false;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('lotteryResult_')) {
                const data = JSON.parse(localStorage.getItem(key));
                
                // --- Data Migration Logic ---
                let dataWasUpdated = false;
                if (data.results && data.results.every(r => r.amount === undefined)) {
                    migrationNeeded = true;
                    data.results.forEach(r => {
                        r.amount = PRIZE_AMOUNTS[r.category] || 'N/A';
                    });
                    dataWasUpdated = true;
                }
                if (dataWasUpdated) {
                    localStorage.setItem(key, JSON.stringify(data));
                }
                // --- End Migration Logic ---

                if (!reportsData[data.date]) {
                    reportsData[data.date] = {};
                }
                reportsData[data.date][data.drawTime] = key;
            }
        }

        if (migrationNeeded) {
            alert('Updated existing reports with new prize amount data.');
        }

        const sortedDates = Object.keys(reportsData).sort().reverse();
        for (const date of sortedDates) {
            const card = document.createElement('div');
            card.className = 'report-card';
            card.textContent = date;
            card.dataset.date = date;
            reportsListContainer.appendChild(card);
        }
    }

    function handleReportCardClick(event) {
        const card = event.target.closest('.report-card');
        if (card) {
            const date = card.dataset.date;
            const draws = reportsData[date];
            openDrawsModal(date, draws);
        }
    }

    function openDrawsModal(date, draws) {
        modalTitle.textContent = `Draws for ${date}`;
        modalDrawsList.innerHTML = '';
        for (const drawTime in draws) {
            const key = draws[drawTime];
            const li = document.createElement('li');
            const option = Array.from(drawTimeSelect.options).find(opt => opt.value === drawTime);
            
            const textSpan = document.createElement('span');
            textSpan.textContent = option ? option.text : drawTime;
            li.appendChild(textSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-draw-btn';
            deleteBtn.dataset.key = key;
            li.appendChild(deleteBtn);
            
            li.dataset.key = key; // For viewing by clicking the li
            modalDrawsList.appendChild(li);
        }
        drawsModal.style.display = 'block';
    }

    function handleModalDrawClick(event) {
        const target = event.target;

        // Handle delete button click
        if (target.classList.contains('delete-draw-btn')) {
            const key = target.dataset.key;
            if (confirm('Are you sure you want to delete this saved result?')) {
                localStorage.removeItem(key);
                loadReports(); // Refresh the main list
                drawsModal.style.display = 'none'; // Close modal
            }
            return; // Stop further processing
        }

        // Handle viewing by clicking the list item (but not the button)
        const li = target.closest('li');
        if (li && li.dataset.key) {
            const key = li.dataset.key;
            const data = JSON.parse(localStorage.getItem(key));
            if (data) {
                resultDateInput.value = data.date;
                drawTimeSelect.value = data.drawTime;
                displayResults(data.results, data.date, data.drawTime);
                saveResultBtn.style.display = 'none';
                drawsModal.style.display = 'none';
            }
        }
    }

    function downloadCsv() {
        const rows = Array.from(resultsTableBody.querySelectorAll('tr'));
        if (rows.length === 0) {
            alert('No results to download.');
            return;
        }

        const date = resultDateInput.value;
        const drawTime = drawTimeSelect.options[drawTimeSelect.selectedIndex].text;
        let csvContent = `data:text/csv;charset=utf-8,Date,${date}\nDraw,${drawTime}\n\nPrize Category,Prize Amount,Ticket Numbers\n`;

        rows.forEach(row => {
            const category = row.cells[0].textContent.trim();
            const amount = row.cells[1].textContent.trim();
            const numbers = row.cells[2].textContent.trim();
            csvContent += `${category},${amount},"${numbers}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('download', `lottery_results_${date}_${drawTimeSelect.value}.csv`);
        link.href = encodedUri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function setCurrentDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        resultDateInput.value = `${year}-${month}-${day}`;
    }
});