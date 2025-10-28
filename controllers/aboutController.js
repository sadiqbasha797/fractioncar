const About = require('../models/About');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const logger = require('../utils/logger');

// ==================== ABOUT CRUD ====================

// Create a new About content
const createAbout = async (req, res) => {
  try {
    const { aboutherotext, aboutherosubtext } = req.body;
    let aboutheroimage = req.body.aboutheroimage; // Default to provided URL

    // Handle image upload if file is provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        aboutheroimage = result.secure_url;
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        logger(`Error uploading image to Cloudinary: ${uploadError.message}`);
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Error uploading image'
        });
      }
    }

    const about = new About({ 
      aboutheroimage, 
      aboutherotext, 
      aboutherosubtext, 
      createdBy: req.user.id 
    });
    await about.save();
    res.status(201).json({
      status: 'success',
      body: { about },
      message: 'About content created successfully'
    });
  } catch (error) {
    logger(`Error in createAbout: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all About content
const getAbout = async (req, res) => {
  try {
    const about = await About.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { about },
      message: 'About content retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAbout: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get About content by ID
const getAboutById = async (req, res) => {
  try {
    const about = await About.findById(req.params.id).populate('createdBy', 'name email');
    if (!about) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'About content not found'
      });
    }
    res.json({
      status: 'success',
      body: { about },
      message: 'About content retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAboutById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update About content by ID
const updateAbout = async (req, res) => {
  try {
    const { aboutherotext, aboutherosubtext } = req.body;
    let aboutheroimage = req.body.aboutheroimage; // Default to provided URL

    // Handle image upload if file is provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        aboutheroimage = result.secure_url;
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        logger(`Error uploading image to Cloudinary: ${uploadError.message}`);
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Error uploading image'
        });
      }
    }

    const updatedAbout = await About.findByIdAndUpdate(
      req.params.id,
      { aboutheroimage, aboutherotext, aboutherosubtext },
      { new: true }
    ).populate('createdBy', 'name email');
    if (!updatedAbout) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'About content not found'
      });
    }
    res.json({
      status: 'success',
      body: { about: updatedAbout },
      message: 'About content updated successfully'
    });
  } catch (error) {
    logger(`Error in updateAbout: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete About content by ID
const deleteAbout = async (req, res) => {
  try {
    const deletedAbout = await About.findByIdAndDelete(req.params.id);
    if (!deletedAbout) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'About content not found'
      });
    }
    res.json({
      status: 'success',
      body: {},
      message: 'About content deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteAbout: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// ==================== PUBLIC API ====================

// Get all About content (Public)
const getPublicAbout = async (req, res) => {
  try {
    const about = await About.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { about },
      message: 'About content retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicAbout: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  // About CRUD
  createAbout,
  getAbout,
  getAboutById,
  updateAbout,
  deleteAbout,
  
  // Public API
  getPublicAbout
};
