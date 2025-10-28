const cloudinary = require('../config/cloudinary');
const logger = require('./logger');

/**
 * Delete images from Cloudinary
 * @param {string[]} imageUrls - Array of image URLs to delete
 * @returns {Promise<{success: string[], failed: string[]}>} - Results of deletion
 */
const deleteImagesFromCloudinary = async (imageUrls) => {
  const results = {
    success: [],
    failed: []
  };

  if (!imageUrls || imageUrls.length === 0) {
    return results;
  }

  for (const url of imageUrls) {
    if (url && url.includes('cloudinary.com')) {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/public_id.jpg
        const urlParts = url.split('/');
        const publicIdWithVersion = urlParts[urlParts.length - 1]; // Get the last part (version/public_id.jpg)
        const publicId = publicIdWithVersion.split('.')[0]; // Remove file extension
        
        // If the public_id includes version (v1234567890), we need to extract just the public_id
        const publicIdParts = publicId.split('/');
        const actualPublicId = publicIdParts.length > 1 ? publicIdParts[1] : publicIdParts[0];
        
        await cloudinary.uploader.destroy(actualPublicId);
        results.success.push(url);
        logger(`Successfully deleted image from Cloudinary: ${actualPublicId}`);
      } catch (error) {
        results.failed.push(url);
        logger(`Error deleting image from Cloudinary: ${error.message} for URL: ${url}`);
      }
    } else {
      // Not a Cloudinary URL, skip
      results.failed.push(url);
      logger(`Skipping non-Cloudinary URL: ${url}`);
    }
  }

  return results;
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Public ID or null if not a valid Cloudinary URL
 */
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) {
    return null;
  }

  try {
    const urlParts = url.split('/');
    const publicIdWithVersion = urlParts[urlParts.length - 1];
    const publicId = publicIdWithVersion.split('.')[0];
    
    const publicIdParts = publicId.split('/');
    return publicIdParts.length > 1 ? publicIdParts[1] : publicIdParts[0];
  } catch (error) {
    logger(`Error extracting public ID from URL: ${url}, Error: ${error.message}`);
    return null;
  }
};

module.exports = {
  deleteImagesFromCloudinary,
  extractPublicId
};
