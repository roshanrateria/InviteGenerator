const nameInput = document.getElementById('nameInput');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const previewImage = document.getElementById('previewImage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

generateBtn.addEventListener('click', generateCard);
nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') generateCard();
});

async function generateCard() {
    const teamName = nameInput.value.trim();
    
    if (!teamName) {
        showStatus('Please enter a team name', 'error');
        return;
    }
    
    generateBtn.disabled = true;
    showStatus('Creating your card...', 'loading');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw base image
            ctx.drawImage(img, 0, 0);
            
            // Detect the white bar region
            const rect = detectNameBar(img.width, img.height);
            
            // Draw neon text matching Python implementation
            drawNeonText(teamName, rect);
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `card_${teamName.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
                a.click();
                URL.revokeObjectURL(url);
                
                showStatus('Card created successfully!', 'success');
                generateBtn.disabled = false;
            }, 'image/jpeg', 0.95);
        };
        
        img.onerror = () => {
            showStatus('Error loading image', 'error');
            generateBtn.disabled = false;
        };
        
        img.src = 'Welcome.png';
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('Error generating card', 'error');
        generateBtn.disabled = false;
    }
}

function detectNameBar(w, h) {
    // Get image data to detect bright horizontal bar
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    const brightThreshold = 200;
    const candidates = [];
    
    // Scan between 35% and 80% of height
    const startY = Math.floor(h * 0.35);
    const endY = Math.floor(h * 0.8);
    
    // Track contiguous bright regions
    let inRegion = false;
    let regionStartY = 0;
    let regionMinX = w;
    let regionMaxX = 0;
    let regionHeight = 0;
    
    for (let y = startY; y < endY; y++) {
        let rowMinX = w;
        let rowMaxX = 0;
        let brightCount = 0;
        
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            if (brightness > brightThreshold) {
                brightCount++;
                if (x < rowMinX) rowMinX = x;
                if (x > rowMaxX) rowMaxX = x;
            }
        }
        
        // Check if this row has significant bright pixels
        if (brightCount > w * 0.1) {
            if (!inRegion) {
                inRegion = true;
                regionStartY = y;
                regionMinX = rowMinX;
                regionMaxX = rowMaxX;
                regionHeight = 1;
            } else {
                regionHeight++;
                if (rowMinX < regionMinX) regionMinX = rowMinX;
                if (rowMaxX > regionMaxX) regionMaxX = rowMaxX;
            }
        } else if (inRegion) {
            // End of region
            const rectW = regionMaxX - regionMinX + 1;
            const rectH = regionHeight;
            const area = rectW * rectH;
            const aspect = rectW / (rectH + 1);
            
            if (area > (w * h) * 0.001 && aspect > 4) {
                candidates.push({
                    x: regionMinX,
                    y: regionStartY,
                    width: rectW,
                    height: rectH,
                    area: area
                });
            }
            
            inRegion = false;
        }
    }
    
    // Check if we ended in a region
    if (inRegion) {
        const rectW = regionMaxX - regionMinX + 1;
        const rectH = regionHeight;
        const area = rectW * rectH;
        const aspect = rectW / (rectH + 1);
        
        if (area > (w * h) * 0.001 && aspect > 4) {
            candidates.push({
                x: regionMinX,
                y: regionStartY,
                width: rectW,
                height: rectH,
                area: area
            });
        }
    }
    
    // Return the widest candidate
    if (candidates.length > 0) {
        return candidates.reduce((max, curr) => curr.width > max.width ? curr : max);
    }
    
    // Fallback
    return {
        x: Math.floor((w - w * 0.7) / 2),
        y: Math.floor(h * 0.55),
        width: Math.floor(w * 0.7),
        height: Math.floor(h * 0.075)
    };
}

function drawNeonText(text, rect) {
    // Font matching Python's Arial Bold
    const fontFamily = 'Arial, Arial Black, sans-serif';
    
    // Start with font size = rect.height * 1.1
    let testSize = Math.floor(rect.height * 1.1);
    ctx.font = `bold ${testSize}px ${fontFamily}`;
    
    let metrics = ctx.measureText(text);
    let textW = metrics.width;
    
    // Reduce until text fits 92% of bar width and font size fits 96% of bar height
    while ((textW > rect.width * 0.92 || testSize > rect.height * 0.96) && testSize > 10) {
        testSize -= 2;
        ctx.font = `bold ${testSize}px ${fontFamily}`;
        metrics = ctx.measureText(text);
        textW = metrics.width;
    }
    
    // Get text height from metrics
    const textH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    
    // Padding = 0.5 * font size
    const pad = Math.floor(testSize * 0.5);
    const layerW = Math.floor(textW + pad * 2);
    const layerH = Math.floor(textH + pad * 2);
    
    // Create temporary canvas for text layer
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layerW;
    tempCanvas.height = layerH;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Text position within layer
    const tx = pad;
    const ty = pad + metrics.actualBoundingBoxAscent;
    
    tempCtx.font = `bold ${testSize}px ${fontFamily}`;
    tempCtx.textBaseline = 'alphabetic';
    
    // Layer 1: Outer glow (cyan) - simulating blur radius 12 + 6
    tempCtx.shadowColor = 'rgba(60, 220, 255, 1)';
    tempCtx.shadowBlur = 30;
    tempCtx.fillStyle = 'rgba(60, 220, 255, 0.8)';
    tempCtx.fillText(text, tx, ty);
    tempCtx.fillText(text, tx, ty);
    
    // Layer 2: Inner glow
    tempCtx.shadowBlur = 15;
    tempCtx.fillStyle = 'rgba(60, 220, 255, 0.6)';
    tempCtx.fillText(text, tx, ty);
    
    // Layer 3: Dark stroke for contrast (multiple passes)
    tempCtx.shadowBlur = 0;
    tempCtx.shadowColor = 'transparent';
    tempCtx.strokeStyle = 'rgba(2, 2, 6, 1)';
    tempCtx.lineWidth = Math.max(3, testSize * 0.05);
    
    const offsets = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1]];
    for (const [ox, oy] of offsets) {
        tempCtx.strokeText(text, tx + ox, ty + oy);
    }
    
    // Layer 4: Horizontal gradient (cyan → magenta)
    const gradient = tempCtx.createLinearGradient(tx, ty, tx + textW, ty);
    gradient.addColorStop(0, 'rgb(10, 200, 255)');   // cyan
    gradient.addColorStop(1, 'rgb(200, 30, 255)');   // magenta
    tempCtx.fillStyle = gradient;
    tempCtx.fillText(text, tx, ty);
    
    // Layer 5: Bright inner highlight
    tempCtx.shadowBlur = 3;
    tempCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    tempCtx.fillStyle = 'rgba(240, 250, 255, 0.78)';
    tempCtx.fillText(text, tx, ty);
    
    // Calculate paste position (center the layer in the rect)
    const pasteX = Math.floor(rect.x + (rect.width - layerW) / 2);
    const pasteY = Math.floor(rect.y + (rect.height - layerH) / 2);
    
    // Composite onto main canvas
    ctx.drawImage(tempCanvas, pasteX, pasteY);
}

function showStatus(message, type) {
    statusText.textContent = message;
    statusMessage.classList.remove('hidden', 'success');
    
    const loader = document.querySelector('.loader');
    const checkmark = document.querySelector('.checkmark');
    
    if (type === 'loading') {
        loader.style.display = 'block';
        checkmark.classList.add('hidden');
    } else if (type === 'success') {
        loader.style.display = 'none';
        checkmark.classList.remove('hidden');
        statusMessage.classList.add('success');
        
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    } else {
        loader.style.display = 'none';
        checkmark.classList.add('hidden');
        
        setTimeout(() => {
            statusMessage.classList.add('hidden');
        }, 3000);
    }
}
