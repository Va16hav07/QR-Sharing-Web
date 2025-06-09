/**
 * Enhanced file upload handler
 * This script provides better handling for file uploads with a single click
 */

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get the drop zone and file input elements
  const dropZone = document.querySelector('.drop-zone');
  const fileInput = document.getElementById('fileInput');
  
  if (!dropZone || !fileInput) return;
  
  // Fix for the double-click issue
  // This code ensures that clicking anywhere in the drop zone will open the file selector
  dropZone.addEventListener('mousedown', function(e) {
    // Don't do anything if clicking on the input itself
    if (e.target === fileInput) return;
    
    // If we click on any other element in the drop zone, trigger the file input
    e.preventDefault();
    
    // Create a short timeout to avoid instant focus issues
    setTimeout(() => {
      fileInput.click();
    }, 10);
  });
});
