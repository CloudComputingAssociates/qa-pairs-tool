// In-memory storage for QA pairs
let qaPairsList = [];

// ============================================================================
// TOKEN COUNTING (4 chars per token estimate)
// ============================================================================

function estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    return Math.ceil(text.length / 4);
}

function updateTokenCounts() {
    const prompt = document.getElementById('prompt').value;
    const response = document.getElementById('response').value;
    
    const promptTokens = estimateTokens(prompt);
    const responseTokens = estimateTokens(response);
    const totalTokens = promptTokens + responseTokens;
    
    document.getElementById('prompt-count').textContent = `Prompt: ${promptTokens} tokens`;
    document.getElementById('response-count').textContent = `Response: ${responseTokens} tokens`;
    document.getElementById('total-count').textContent = `Total: ${totalTokens} tokens`;
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

function validateForm() {
    const prompt = document.getElementById('prompt').value.trim();
    const response = document.getElementById('response').value.trim();
    
    if (!prompt) {
        showStatus('Please enter a prompt/question', 'error');
        return false;
    }
    
    if (!response) {
        showStatus('Please enter a response', 'error');
        return false;
    }
    
    return true;
}

// ============================================================================
// LIST MANAGEMENT
// ============================================================================

function addToList() {
    if (!validateForm()) {
        return;
    }
    
    const qaPair = {
        prompt: document.getElementById('prompt').value.trim(),
        response: document.getElementById('response').value.trim(),
        source: document.getElementById('source').value.trim() || null,
        attribution: document.getElementById('attribution').value.trim() || null,
        training_metadata: {
            prompt_tokens: estimateTokens(document.getElementById('prompt').value),
            response_tokens: estimateTokens(document.getElementById('response').value),
            total_tokens: estimateTokens(document.getElementById('prompt').value) + 
                         estimateTokens(document.getElementById('response').value),
            weighting: 5
        }
    };
    
    qaPairsList.push(qaPair);
    
    clearForm();
    renderList();
    showStatus(`✅ Added to list! (${qaPairsList.length} total)`, 'success');
}

function clearForm() {
    document.getElementById('prompt').value = '';
    document.getElementById('response').value = '';
    document.getElementById('source').value = '';
    document.getElementById('attribution').value = '';
    
    updateTokenCounts();
    hideStatus();
}

function renderList() {
    const listContainer = document.getElementById('qa-list');
    const listCount = document.getElementById('list-count');
    const insertActions = document.getElementById('insert-actions');
    
    if (qaPairsList.length === 0) {
        listContainer.innerHTML = '<p class="empty-message">No items yet. Add your first Q&A pair above!</p>';
        listCount.textContent = '0 items';
        insertActions.style.display = 'none';
        return;
    }
    
    listCount.textContent = `${qaPairsList.length} item${qaPairsList.length === 1 ? '' : 's'}`;
    insertActions.style.display = 'flex';
    
    listContainer.innerHTML = qaPairsList.map((item, index) => {
        const metaText = item.source || item.attribution 
            ? `(${[item.source, item.attribution].filter(Boolean).join(' | ')})`
            : '';
        
        return `
            <div class="qa-item" onclick="editItem(${index})">
                <div class="qa-item-number">${index + 1}</div>
                <div class="qa-item-text">${item.prompt}</div>
                ${metaText ? `<div class="qa-item-meta">${metaText}</div>` : ''}
            </div>
        `;
    }).join('');
}

function editItem(index) {
    const item = qaPairsList[index];
    
    // Populate form with item data
    document.getElementById('prompt').value = item.prompt;
    document.getElementById('response').value = item.response;
    document.getElementById('source').value = item.source || '';
    document.getElementById('attribution').value = item.attribution || '';
    
    // Remove from list
    qaPairsList.splice(index, 1);
    
    // Re-render list
    renderList();
    updateTokenCounts();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showStatus('Item loaded for editing. Hit "Add" to save changes or "Clear" to delete.', 'success');
}

// ============================================================================
// MONGODB INSERTION
// ============================================================================

async function insertToMongoDB() {
    if (qaPairsList.length === 0) {
        showStatus('No items to insert', 'error');
        return;
    }
    
    const insertBtn = document.getElementById('insert-btn');
    insertBtn.disabled = true;
    insertBtn.textContent = 'Inserting...';
    showStatus(`Inserting ${qaPairsList.length} QA pairs to MongoDB...`, 'loading');
    
    try {
        // Add created_at timestamp to each document
        const documentsToInsert = qaPairsList.map(item => ({
            ...item,
            created_at: new Date().toISOString()
        }));
        
        const response = await fetch('/api/insert-qa-pairs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ documents: documentsToInsert })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to insert documents');
        }
        
        const result = await response.json();
        showStatus(`✅ Successfully inserted ${result.insertedCount} QA pairs!`, 'success');
        
        // Clear the list
        qaPairsList = [];
        renderList();
        
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        console.error('Insert error:', error);
    } finally {
        insertBtn.disabled = false;
        insertBtn.textContent = '💾 Insert into MongoDB';
    }
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

function showStatus(message, type = 'loading') {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    
    if (type !== 'loading') {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

function hideStatus() {
    document.getElementById('status-message').style.display = 'none';
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Update token counts on input
    document.getElementById('prompt').addEventListener('input', updateTokenCounts);
    document.getElementById('response').addEventListener('input', updateTokenCounts);
    
    // Initialize token counts
    updateTokenCounts();
    
    // Initialize list
    renderList();
});