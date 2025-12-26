document.addEventListener('DOMContentLoaded', () => {
    const buttonGrid = document.getElementById('buttonGrid');
    const statusDiv = document.getElementById('status');
    let updateInterval;

    // Get num parameter from URL, default to 5
    function getNumFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const num = parseInt(urlParams.get('num'));
        return num && num > 0 ? num : 5;
    }

    // Function to fetch and update buttons
    async function updateButtons() {
        try {
            const num = getNumFromURL();
            const response = await fetch(`api/getDomainStatusAll?num=${num}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch domain status');
            }

            // Clear existing buttons
            buttonGrid.innerHTML = '';

            // Get all items from the response (already limited by backend)
            const items = Object.values(data);

            // Create buttons for each item
            items.forEach((item, index) => {
                const button = document.createElement('button');
                button.className = 'domain-btn';
                button.setAttribute('data-id', item.id);
                button.setAttribute('data-enabled', item.enabled);
                button.textContent = item.comment || `Button ${index + 1}`;
                
                // Set color based on enabled status (reversed: true = red, false = green)
                if (item.enabled === true) {
                    button.classList.add('disabled');
                } else {
                    button.classList.add('enabled');
                }

                // Add click handler - calls /api/setDomainStatus with id and opposite enabled value
                button.addEventListener('click', async () => {
                    const buttonId = button.getAttribute('data-id');
                    const currentEnabled = button.getAttribute('data-enabled') === 'true';
                    const newEnabled = !currentEnabled;
                    
                    // Disable button during request
                    button.disabled = true;
                    showStatus('Updating status...', 'info');
                    
                    try {
                        const response = await fetch(`api/setDomainStatus`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                id: buttonId,
                                enabled: newEnabled
                            })
                        });
                        
                        const data = await response.json();
                        
                        if (response.ok) {
                            showStatus(`Status updated successfully`, 'success');
                            // Refresh buttons to show updated state
                            await updateButtons();
                        } else {
                            showStatus(`Error: ${data.error || 'Failed to update status'}`, 'error');
                            button.disabled = false;
                        }
                    } catch (error) {
                        console.error('Error setting domain status:', error);
                        showStatus(`Error: ${error.message}`, 'error');
                        button.disabled = false;
                    }
                });

                buttonGrid.appendChild(button);
            });

            showStatus('Status updated', 'success');
        } catch (error) {
            console.error('Error updating buttons:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    // Initial load
    updateButtons();

    // Update every 10 seconds
    updateInterval = setInterval(updateButtons, 5000);

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
    }

    // Environment variables toggle
    const envToggle = document.getElementById('envToggle');
    const envInfo = document.getElementById('envInfo');
    let envVisible = false;

    envToggle.addEventListener('click', async () => {
        if (!envVisible) {
            try {
                const configResponse = await fetch('api/config');
                const config = await configResponse.json();
                
                envInfo.innerHTML = `
                    <div class="env-info-item">
                        <span class="env-info-label">APP_PORT:</span>
                        <span class="env-info-value">${config.APP_PORT || 'N/A'}</span>
                    </div>
                    <div class="env-info-item">
                        <span class="env-info-label">PIHOLE_API_URL:</span>
                        <span class="env-info-value">${config.PIHOLE_API_URL || 'N/A'}</span>
                    </div>
                `;
                envInfo.style.display = 'block';
                envToggle.textContent = 'Hide Environment Variables';
                envVisible = true;
            } catch (error) {
                console.error('Error fetching environment variables:', error);
                envInfo.innerHTML = '<div class="env-info-item">Error loading environment variables</div>';
                envInfo.style.display = 'block';
            }
        } else {
            envInfo.style.display = 'none';
            envToggle.textContent = 'Show Environment Variables';
            envVisible = false;
        }
    });

    // Cleanup interval on page unload
    window.addEventListener('beforeunload', () => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
    });
});

