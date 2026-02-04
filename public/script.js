// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    onTypeChange(); // Load contexts for default type (FAQ)
});

// ============================================================================
// TYPE AND CONTEXT HANDLING
// ============================================================================

async function onTypeChange() {
    const typeSelect = document.getElementById('doc-type');
    const contextSelect = document.getElementById('context');
    const categorySelect = document.getElementById('category');
    const selectedType = typeSelect.value;

    // Show/hide type-specific fields
    document.getElementById('faq-fields').style.display = selectedType === 'faq' ? 'block' : 'none';
    document.getElementById('reverse-prompt-fields').style.display = selectedType === 'reverse-prompt' ? 'block' : 'none';

    // Reset category when type changes
    categorySelect.innerHTML = '<option value="">-- Select Context First --</option>';

    // Load contexts for selected type
    if (selectedType) {
        contextSelect.disabled = true;
        contextSelect.innerHTML = '<option value="">Loading...</option>';

        try {
            const response = await fetch(`/api/contexts?type=${selectedType}`);
            const contexts = await response.json();

            if (contexts.length === 0) {
                contextSelect.innerHTML = '<option value="">No contexts available</option>';
            } else {
                contextSelect.innerHTML = '<option value="">-- Select Context --</option>' +
                    contexts.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
                contextSelect.disabled = false;
            }
        } catch (error) {
            console.error('Error loading contexts:', error);
            contextSelect.innerHTML = '<option value="">Error loading contexts</option>';
        }
    } else {
        contextSelect.innerHTML = '<option value="">-- Select Type First --</option>';
        contextSelect.disabled = true;
    }
}

async function onContextChange() {
    const contextSelect = document.getElementById('context');
    const categorySelect = document.getElementById('category');
    const selectedContext = contextSelect.value;

    // Load categories for selected context
    if (selectedContext) {
        categorySelect.innerHTML = '<option value="">Loading...</option>';

        try {
            const response = await fetch(`/api/categories?context=${selectedContext}`);
            const categories = await response.json();

            if (categories.length === 0) {
                categorySelect.innerHTML = '<option value="">No categories available</option>';
            } else {
                categorySelect.innerHTML = '<option value="">-- Select Category --</option>' +
                    categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            categorySelect.innerHTML = '<option value="">Error loading categories</option>';
        }
    } else {
        categorySelect.innerHTML = '<option value="">-- Select Context First --</option>';
    }
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

function validateForm() {
    const type = document.getElementById('doc-type').value;
    const context = document.getElementById('context').value;
    const category = document.getElementById('category').value;
    const prompt = document.getElementById('prompt').value.trim();

    if (!type) {
        showToast('Please select a type', true);
        return false;
    }

    if (!context) {
        showToast('Please select a context', true);
        return false;
    }

    if (!category) {
        showToast('Please select a category', true);
        return false;
    }

    if (!prompt) {
        showToast('Please enter a prompt', true);
        return false;
    }

    if (type === 'faq') {
        const response = document.getElementById('response').value.trim();
        if (!response) {
            showToast('Please enter a response', true);
            return false;
        }
    }

    if (type === 'reverse-prompt') {
        const action = document.getElementById('action').value.trim();
        const nextPrompt = document.getElementById('next-prompt').value.trim();
        if (!action) {
            showToast('Please enter an action', true);
            return false;
        }
        if (!nextPrompt) {
            showToast('Please enter a next-prompt value', true);
            return false;
        }
    }

    return true;
}

// ============================================================================
// UNSAVED DATA CHECK
// ============================================================================

function hasUnsavedData() {
    const subcategory = document.getElementById('subcategory').value.trim();
    const prompt = document.getElementById('prompt').value.trim();
    const response = document.getElementById('response').value.trim();
    const action = document.getElementById('action').value.trim();
    const nextPrompt = document.getElementById('next-prompt').value.trim();
    const source = document.getElementById('source').value.trim();
    const attribution = document.getElementById('attribution').value.trim();

    // Only check data entry fields, not Type/Context/Category (those are session state)
    return subcategory || prompt || response || action || nextPrompt || source || attribution;
}

// ============================================================================
// FORM MANAGEMENT
// ============================================================================

function clearForm() {
    document.getElementById('subcategory').value = '';
    document.getElementById('prompt').value = '';
    document.getElementById('response').value = '';
    document.getElementById('action').value = '';
    document.getElementById('next-prompt').value = '';
    document.getElementById('source').value = '';
    document.getElementById('attribution').value = '';
}

function resetForm() {
    clearForm();
    // Type and Context selections are preserved
}

function closeForm() {
    if (hasUnsavedData()) {
        document.getElementById('confirm-modal').classList.add('show');
    } else {
        resetForm();
    }
}

function confirmClose(confirm) {
    document.getElementById('confirm-modal').classList.remove('show');
    if (confirm) {
        resetForm();
    }
}

// ============================================================================
// MONGODB SAVE
// ============================================================================

async function saveToMongoDB() {
    if (!validateForm()) {
        return;
    }

    const type = document.getElementById('doc-type').value;
    const context = document.getElementById('context').value;
    const category = document.getElementById('category').value;
    const subcategory = document.getElementById('subcategory').value.trim() || null;
    const prompt = document.getElementById('prompt').value.trim();
    const source = document.getElementById('source').value.trim() || null;
    const attribution = document.getElementById('attribution').value.trim() || null;

    let item = {
        type,
        context,
        category,
        subcategory,
        prompt,
        source,
        attribution,
        created_at: new Date().toISOString()
    };

    if (type === 'faq') {
        item.response = document.getElementById('response').value.trim();
    } else if (type === 'reverse-prompt') {
        item.action = document.getElementById('action').value.trim();
        item['next-prompt'] = document.getElementById('next-prompt').value.trim();
    }

    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;

    try {
        const response = await fetch('/api/insert-promptme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ documents: [item] })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save');
        }

        showToast('Saved successfully!');
        clearForm();

    } catch (error) {
        showToast(`Error: ${error.message}`, true);
        console.error('Save error:', error);
    } finally {
        saveBtn.disabled = false;
    }
}

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}
