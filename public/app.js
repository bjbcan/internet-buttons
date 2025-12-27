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

    // Blocking status component
    const blockingStatusContainer = document.getElementById('blockingStatusContainer');
    const blockingStatusDisplay = document.getElementById('blockingStatusDisplay');
    const timerOptions = document.getElementById('timerOptions');
    let currentBlockingStatus = { blocking: false, timer: 0 };

    // Function to fetch and update blocking status
    async function updateBlockingStatus() {
        try {
            const response = await fetch('api/getBlockingStatus');
            const data = await response.json();
            
            if (response.ok) {
                currentBlockingStatus = data;
                
                if (data.blocking === false) {
                    // Disabled - show timer rounded down to nearest minute, light red background
                    const minutes = Math.floor(data.timer / 60);
                    const displayText = `Adblocking disabled: ${minutes} min`;
                    blockingStatusDisplay.textContent = displayText;
                    blockingStatusDisplay.className = 'blocking-status-display disabled-status';
                    timerOptions.style.display = 'none';
                    // Hide button grid when blocking is disabled
                    buttonGrid.style.display = 'none';
                } else {
                    // Enabled - show enabled status
                    blockingStatusDisplay.textContent = 'Adblocking Enabled';
                    blockingStatusDisplay.className = 'blocking-status-display enabled-status';
                    timerOptions.style.display = 'none';
                    // Show button grid when blocking is enabled
                    buttonGrid.style.display = 'grid';
                }
            }
        } catch (error) {
            console.error('Error fetching blocking status:', error);
        }
    }

    // Function to set blocking status
    async function setBlockingStatus(blocking, timer) {
        try {
            const response = await fetch('api/setBlockingStatus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    blocking: blocking,
                    timer: timer
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showStatus('Blocking status updated successfully', 'success');
                await updateBlockingStatus();
            } else {
                showStatus(`Error: ${data.error || 'Failed to update blocking status'}`, 'error');
            }
        } catch (error) {
            console.error('Error setting blocking status:', error);
            showStatus(`Error: ${error.message}`, 'error');
        }
    }

    // Handle click on blocking status display
    blockingStatusDisplay.addEventListener('click', () => {
        if (currentBlockingStatus.blocking === false) {
            // Disabled - re-enable indefinitely
            setBlockingStatus(true, 0);
        } else {
            // Enabled - show timer options
            timerOptions.style.display = timerOptions.style.display === 'none' ? 'flex' : 'none';
        }
    });

    // Handle timer option clicks
    const timerOptionLinks = document.querySelectorAll('.timer-option-link');
    timerOptionLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const timer = parseInt(link.getAttribute('data-timer'));
            await setBlockingStatus(false, timer);
            timerOptions.style.display = 'none';
        });
    });

    // Hide timer options when clicking outside
    document.addEventListener('click', (e) => {
        if (!blockingStatusContainer.contains(e.target)) {
            timerOptions.style.display = 'none';
        }
    });

    // Initial load
    updateButtons();
    updateBlockingStatus();

    // Update every 10 seconds
    updateInterval = setInterval(() => {
        updateButtons();
        updateBlockingStatus();
    }, 10000);

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
    }

    // Cleanup interval on page unload
    window.addEventListener('beforeunload', () => {
        if (updateInterval) {
            clearInterval(updateInterval);
        }
    });
});

