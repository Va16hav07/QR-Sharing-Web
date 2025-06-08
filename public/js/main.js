document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const dropZone = document.querySelector('.drop-zone');
  const fileInput = document.querySelector('#fileInput');
  const fileInfo = document.querySelector('#fileInfo');
  const fileName = document.querySelector('#fileName');
  const fileSize = document.querySelector('#fileSize');
  const uploadButton = document.querySelector('#uploadButton');
  const progressContainer = document.querySelector('.progress-container');
  const uploadProgress = document.querySelector('#uploadProgress');
  const resultContainer = document.querySelector('#resultContainer');
  const qrCode = document.querySelector('#qrCode');
  const downloadLink = document.querySelector('#downloadLink');
  const copyButton = document.querySelector('#copyButton');
  const shareButton = document.querySelector('#shareButton');
  const newUploadButton = document.querySelector('#newUploadButton');
  const themeToggle = document.querySelector('#themeToggle');
  const deleteButtons = document.querySelectorAll('.delete-button');
  const countdownTimers = document.querySelectorAll('.countdown-timer');

  // Handle file selection
  fileInput.addEventListener('change', handleFileSelect);
  dropZone.addEventListener('click', () => fileInput.click());
  
  // Drag and drop events
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('active');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('active');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('active');
    
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });
  
  // Handle the file upload
  uploadButton.addEventListener('click', uploadFile);
  
  // Copy link button
  copyButton.addEventListener('click', () => {
    downloadLink.select();
    document.execCommand('copy');
    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => {
      copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
    }, 2000);
  });
  
  // Share button (Web Share API if available)
  shareButton.addEventListener('click', async () => {
    const url = downloadLink.value;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Download my shared file',
          text: 'I\'ve shared a file with you. Click to download:',
          url: url
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback - copy to clipboard
      downloadLink.select();
      document.execCommand('copy');
      shareButton.innerHTML = '<i class="fas fa-check"></i> Link copied!';
      setTimeout(() => {
        shareButton.innerHTML = '<i class="fas fa-share-alt"></i> Share';
      }, 2000);
    }
  });
  
  // Reset for new upload
  newUploadButton.addEventListener('click', resetUpload);
  
  // Theme toggle functionality
  themeToggle.addEventListener('click', toggleTheme);
  
  // Initialize theme from localStorage
  initTheme();

  // Add event listeners for delete buttons
  deleteButtons.forEach(button => {
    button.addEventListener('click', handleFileDelete);
  });
  
  // Initialize any existing countdown timers for files already flagged for deletion
  countdownTimers.forEach(timer => {
    const deletionDateStr = timer.getAttribute('data-deletion-date');
    if (deletionDateStr) {
      startDeleteCountdown(timer, deletionDateStr);
    }
  });
  
  // Set up refresh interval to check for updates
  setInterval(refreshFileList, 60000); // Refresh every minute

  // Functions
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handleFileSelect() {
    const file = fileInput.files[0];
    
    if (!file) return;
    
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    fileInfo.classList.remove('hidden');
    progressContainer.classList.add('hidden');
    uploadProgress.style.width = '0%';
  }

  function uploadFile() {
    const file = fileInput.files[0];
    
    if (!file) {
      showErrorMessage('Please select a file to upload');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    
    // Show progress
    progressContainer.classList.remove('hidden');
    uploadButton.disabled = true;
    uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    // Add animation to dropzone
    dropZone.classList.add('uploading');
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        uploadProgress.style.width = percent + '%';
      }
    });
    
    xhr.addEventListener('load', () => {
      // Remove animation regardless of result
      dropZone.classList.remove('uploading');
      
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        showResults(response);
      } else {
        let errorMsg = 'Upload failed';
        try {
          const response = JSON.parse(xhr.responseText);
          errorMsg = response.error || errorMsg;
        } catch (e) {}
        
        showErrorMessage(errorMsg);
        uploadButton.disabled = false;
        uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload File';
      }
    });
    
    xhr.addEventListener('error', () => {
      dropZone.classList.remove('uploading');
      showErrorMessage('Connection error occurred during the upload');
      uploadButton.disabled = false;
      uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload File';
    });
    
    xhr.open('POST', '/upload', true);
    xhr.send(formData);
  }
  
  function showErrorMessage(message) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification error';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }

  function showResults(fileData) {
    // Hide upload container and show results
    fileInfo.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    
    // Set QR code image
    qrCode.src = fileData.qrCodeUrl;
    
    // Set download link
    downloadLink.value = fileData.downloadUrl;
    
    // Set expiry date
    const expiryDateElement = document.getElementById('expiryDate');
    if (expiryDateElement && fileData.expiryDate) {
      const expDate = new Date(fileData.expiryDate);
      const formattedDate = new Intl.DateTimeFormat('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
      }).format(expDate);
      
      expiryDateElement.textContent = formattedDate;
    }
  }

  function resetUpload() {
    // Reset form and show upload container
    fileInput.value = '';
    fileName.textContent = '';
    fileSize.textContent = '';
    fileInfo.classList.add('hidden');
    resultContainer.classList.add('hidden');
    uploadButton.disabled = false;
    uploadButton.innerHTML = '<i class="fas fa-upload"></i> Upload File';
  }
  
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const iconElement = themeToggle.querySelector('i');
    iconElement.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
  
  function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      
      // Update icon
      const iconElement = themeToggle.querySelector('i');
      iconElement.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Use system preference if no saved theme
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.querySelector('i').className = 'fas fa-sun';
    }
  }
  
  // Handle file deletion
  function handleFileDelete(e) {
    const button = e.currentTarget;
    const fileId = button.getAttribute('data-file-id');
    
    if (!fileId) return;
    
    // Confirm deletion
    if (!confirm('Flag this file for deletion? It will be automatically deleted after 5 minutes.')) {
      return;
    }
    
    // Change button appearance
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    
    // Call the API
    fetch(`/api/delete-file/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to flag file for deletion');
      }
      return response.json();
    })
    .then(data => {
      console.log('File flagged for deletion:', data);
      
      // Update UI to show countdown
      const listItem = button.closest('.recent-file-item');
      if (listItem) {
        // Add a deletion indicator
        const deletionIndicator = document.createElement('div');
        deletionIndicator.className = 'deletion-countdown';
        deletionIndicator.innerHTML = `
          <i class="fas fa-clock"></i>
          <span class="countdown-text">Deleting in <span class="countdown-timer">5:00</span></span>
        `;
        
        // Insert after file info
        const fileInfo = listItem.querySelector('.file-info-compact');
        fileInfo.parentNode.insertBefore(deletionIndicator, fileInfo.nextSibling);
        
        // Add flagged-for-deletion class to list item
        listItem.classList.add('flagged-for-deletion');
        
        // Replace delete button with cancellation notice
        button.innerHTML = '<i class="fas fa-trash-alt"></i>';
        button.classList.add('deleting');
        button.disabled = true;
        button.title = 'Deleting soon';
        
        // Start countdown
        startDeleteCountdown(deletionIndicator.querySelector('.countdown-timer'), data.deletionDate);
      }
      
      // Show success notification
      showSuccessMessage('File flagged for deletion. It will be removed in 5 minutes.');
    })
    .catch(error => {
      console.error('Error flagging file for deletion:', error);
      button.innerHTML = '<i class="fas fa-trash-alt"></i>';
      button.disabled = false;
      showErrorMessage('Error flagging file for deletion. Please try again.');
    });
  }
  
  // Start countdown timer
  function startDeleteCountdown(timerElement, deletionDateString) {
    if (!timerElement) return;
    
    const deletionDate = new Date(deletionDateString);
    
    // Update every second
    const interval = setInterval(() => {
      const now = new Date();
      const timeLeft = deletionDate - now;
      
      if (timeLeft <= 0) {
        clearInterval(interval);
        timerElement.textContent = 'Deleted';
        // Optionally remove element from list or add "deleted" styling
        const listItem = timerElement.closest('.recent-file-item');
        if (listItem) {
          // Add fade-out animation
          listItem.classList.add('file-deleted');
          // Remove after animation
          setTimeout(() => {
            listItem.remove();
          }, 1000);
        }
        return;
      }
      
      // Calculate minutes and seconds
      const minutes = Math.floor(timeLeft / 60000);
      const seconds = Math.floor((timeLeft % 60000) / 1000);
      
      // Update timer display
      timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }
  
  // Show success message
  function showSuccessMessage(message) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification';
      notification.className = 'notification';
      document.body.appendChild(notification);
    }
    
    notification.className = 'notification success';
    notification.textContent = message;
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }
  
  // Refresh file list periodically to update deletion status
  function refreshFileList() {
    const recentFilesContainer = document.getElementById('recentFiles');
    if (!recentFilesContainer) return;
    
    fetch('/api/recent-files')
      .then(response => response.json())
      .then(files => {
        // Check if we need to update any deletion statuses
        if (document.querySelector('.recent-file-item')) {
          files.forEach(file => {
            if (file.flaggedForDeletion) {
              const listItem = document.querySelector(`.recent-file-item [data-file-id="${file.id}"]`)?.closest('.recent-file-item');
              
              if (listItem && !listItem.classList.contains('flagged-for-deletion')) {
                listItem.classList.add('flagged-for-deletion');
                
                // Add countdown if not already present
                if (!listItem.querySelector('.deletion-countdown')) {
                  const deletionIndicator = document.createElement('div');
                  deletionIndicator.className = 'deletion-countdown';
                  deletionIndicator.innerHTML = `
                    <i class="fas fa-clock"></i>
                    <span class="countdown-text">Deleting soon...</span>
                  `;
                  
                  const fileInfo = listItem.querySelector('.file-info-compact');
                  fileInfo.parentNode.insertBefore(deletionIndicator, fileInfo.nextSibling);
                  
                  // Update button
                  const button = listItem.querySelector('.delete-button');
                  if (button) {
                    button.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    button.classList.add('deleting');
                    button.disabled = true;
                    button.title = 'Deleting soon';
                  }
                }
              }
            }
          });
          
          // Check for deleted files that are still in the UI
          const currentFileIds = files.map(file => file.id);
          document.querySelectorAll('.recent-file-item').forEach(item => {
            const fileButton = item.querySelector('.delete-button');
            if (fileButton) {
              const fileId = fileButton.getAttribute('data-file-id');
              if (fileId && !currentFileIds.includes(fileId)) {
                // File was deleted from server, animate removal
                item.classList.add('file-deleted');
                setTimeout(() => {
                  item.remove();
                }, 1000);
              }
            }
          });
        }
      })
      .catch(err => console.error('Error refreshing file list:', err));
  }
});
