const nameInput = document.getElementById('nameInput');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const previewImage = document.getElementById('previewImage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Font matching Python's FONT_PATHS
const FONTS = 'bold Arial, Arial Black, Impact, Calibri, sans-serif';

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
            const rect = detectNameBar(canvas, img.width, img.height);
            
            // Draw neon text
            drawNeonText(teamName, rect, img.width, img.height);
            
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

function detectNameBar(canvas, w, h) {
    // Get image data to detect bright horizontal bar
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    
    // Find bright regions (similar to Python's threshold at 200)
    const brightThreshold = 200;
    const candidates = [];
    
    // Scan for horizontal bright regions
    for (let y = Math.floor(h * 0.35); y < Math.floor(h * 0.8); y++) {
        let startX = -1;
        let brightPixels = 0;
        
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            
            if (brightness > brightThreshold) {
                if (startX === -1) startX = x;
                brightPixels++;
            }
        }
        
        if (brightPixels > w * 0.3) { // At least 30% of width is bright
            const rectW = brightPixels;
            const rectH = Math.floor(h * 0.075);
            const area = rectW * rectH;
            const aspect = rectW / (rectH + 1);
            
            if (area > (w * h) * 0.001 && aspect > 4) {
                candidates.push({
                    x: startX,
                    y: y,
                    width: rectW,
                    height: rectH,
                    area: area
                });
                break; // Found the bar
            }
        }
    }
    
    // Return detected bar or fallback
    if (candidates.length > 0) {
        return candidates.reduce((max, curr) => curr.width > max.width ? curr : max);
    } else {
        // Fallback values matching Python
        return {
            x: Math.floor((w - w * 0.7) / 2),
            y: Math.floor(h * 0.55),
            width: Math.floor(w * 0.7),
            height: Math.floor(h * 0.075)
        };
    }
}

function drawNeonText(text, rect, imgW, imgH) {
    // Start with font size = rect.height * 1.1 (matching Python)
    let testSize = Math.floor(rect.height * 1.1);
    ctx.font = `${testSize}px ${FONTS}`;
    
    let metrics = ctx.measureText(text);
    let textW = metrics.width;
    let textH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    
    // Reduce font size to fit 92% of bar width and 96% of bar height
    while ((textW > rect.width * 0.92 || testSize > rect.height * 0.96) && testSize > 10) {
        testSize -= 2;
        ctx.font = `${testSize}px ${FONTS}`;
        metrics = ctx.measureText(text);
        textW = metrics.width;
        textH = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    }
    
    // Calculate padding (0.5 * font size)
    const pad = Math.floor(testSize * 0.5);
    const layerW = textW + pad * 2;
    const layerH = textH + pad * 2;
    
    // Create temporary canvas for text layer
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = layerW;
    tempCanvas.height = layerH;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Text position within layer (compensate for bbox)
    const tx = pad;
    const ty = pad + metrics.actualBoundingBoxAscent;
    
    tempCtx.font = `${testSize}px ${FONTS}`;
    tempCtx.textBaseline = 'alphabetic';
    
    // 1. Outer glow (cyan) - radius 12 + 6
    tempCtx.shadowColor = 'rgba(60, 220, 255, 1)';
    tempCtx.shadowBlur = 24;
    tempCtx.fillStyle = 'rgba(60, 220, 255, 0.8)';
    tempCtx.fillText(text, tx, ty);
    tempCtx.fillText(text, tx, ty);
    
    // 2. Dark stroke for contrast
    tempCtx.shadowBlur = 3;
    tempCtx.shadowColor = 'rgba(2, 2, 6, 1)';
    tempCtx.strokeStyle = 'rgba(2, 2, 6, 1)';
    tempCtx.lineWidth = Math.max(2, testSize * 0.04);
    tempCtx.strokeText(text, tx, ty);
    tempCtx.strokeText(text, tx - 1, ty);
    tempCtx.strokeText(text, tx + 1, ty);
    tempCtx.strokeText(text, tx, ty - 1);
    tempCtx.strokeText(text, tx, ty + 1);
    
    // 3. Horizontal gradient fill (cyan → magenta)
    tempCtx.shadowBlur = 0;
    const gradient = tempCtx.createLinearGradient(tx, ty, tx + textW, ty);
    // Matching Python: r: 10→200, g: 200→30, b: 255
    gradient.addColorStop(0, 'rgb(10, 200, 255)');    // cyan
    gradient.addColorStop(1, 'rgb(200, 30, 255)');    // magenta
    tempCtx.fillStyle = gradient;
    tempCtx.fillText(text, tx, ty);
    
    // 4. Bright inner highlight
    tempCtx.shadowBlur = 2;
    tempCtx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    tempCtx.fillStyle = 'rgba(240, 250, 255, 0.78)'; // 200/255 ≈ 0.78
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
