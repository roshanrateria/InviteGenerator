const nameInput = document.getElementById('nameInput');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');
const statusText = document.getElementById('statusText');
const previewImage = document.getElementById('previewImage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Font paths for fallback
const FONTS = [
    'Arial Black',
    'Impact',
    'Verdana',
    'Calibri'
];

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
            
            ctx.drawImage(img, 0, 0);
            
            const rect = detectNameBar(img.width, img.height);
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
    return {
        x: w * 0.15,
        y: h * 0.55,
        width: w * 0.7,
        height: h * 0.075
    };
}

function drawNeonText(text, rect) {
    const maxWidth = rect.width * 0.92;
    const maxHeight = rect.height * 0.96;
    
    let fontSize = rect.height * 1.1;
    ctx.font = `bold ${fontSize}px ${FONTS[0]}, sans-serif`;
    
    let metrics = ctx.measureText(text);
    while ((metrics.width > maxWidth || fontSize > maxHeight) && fontSize > 10) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px ${FONTS[0]}, sans-serif`;
        metrics = ctx.measureText(text);
    }
    
    const textX = rect.x + (rect.width - metrics.width) / 2;
    const textY = rect.y + rect.height / 2 + fontSize * 0.35;
    
    // Outer glow (cyan)
    ctx.shadowColor = 'rgba(60, 220, 255, 0.8)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = 'rgba(60, 220, 255, 0.3)';
    for (let i = 0; i < 3; i++) {
        ctx.fillText(text, textX, textY);
    }
    
    // Inner glow
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(60, 220, 255, 0.9)';
    ctx.fillStyle = 'rgba(100, 230, 255, 0.5)';
    ctx.fillText(text, textX, textY);
    
    // Dark stroke for contrast
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(2, 2, 6, 0.9)';
    ctx.lineWidth = fontSize * 0.08;
    ctx.strokeText(text, textX, textY);
    
    // Gradient fill
    const gradient = ctx.createLinearGradient(textX, textY, textX + metrics.width, textY);
    gradient.addColorStop(0, '#0acaff');
    gradient.addColorStop(0.5, '#8a2be2');
    gradient.addColorStop(1, '#ff1493');
    
    ctx.fillStyle = gradient;
    ctx.fillText(text, textX, textY);
    
    // Bright highlight
    ctx.shadowBlur = 5;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = 'rgba(240, 250, 255, 0.4)';
    ctx.fillText(text, textX, textY - 1);
    
    ctx.shadowBlur = 0;
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
