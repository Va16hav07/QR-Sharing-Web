/**
 * File type icons utility functions
 * This file contains functions to determine file type icons based on file extensions
 */

function getFileTypeIcon(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  
  // Image files
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(extension)) {
    return 'fas fa-file-image';
  }
  
  // Document files
  if (['doc', 'docx', 'odt', 'rtf', 'tex', 'txt', 'wpd'].includes(extension)) {
    return 'fas fa-file-word';
  }
  
  // PDF files
  if (extension === 'pdf') {
    return 'fas fa-file-pdf';
  }
  
  // Spreadsheet files
  if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) {
    return 'fas fa-file-excel';
  }
  
  // Presentation files
  if (['ppt', 'pptx', 'odp', 'key'].includes(extension)) {
    return 'fas fa-file-powerpoint';
  }
  
  // Archive files
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) {
    return 'fas fa-file-archive';
  }
  
  // Code files
  if (['html', 'css', 'js', 'ts', 'jsx', 'tsx', 'php', 'py', 'java', 'c', 'cpp', 'cs', 'swift', 'go', 'rb'].includes(extension)) {
    return 'fas fa-file-code';
  }
  
  // Audio files
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)) {
    return 'fas fa-file-audio';
  }
  
  // Video files
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
    return 'fas fa-file-video';
  }
  
  // Mobile app files
  if (['apk', 'aab', 'app', 'ipa'].includes(extension)) {
    return 'fas fa-mobile-alt';
  }
  
  // Default file icon
  return 'fas fa-file';
}
