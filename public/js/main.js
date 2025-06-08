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
});
