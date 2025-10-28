const HeroContent = require('../models/HeroContent');
const Brands = require('../models/Brands');
const SimpleSteps = require('../models/SimpleSteps');
const SimpleStepsVideo = require('../models/SimpleStepsVideo'); // Added SimpleStepsVideo model
// Removed SimpleStepsSection model and related APIs
const FAQ = require('../models/FAQ');
const FeaturedCars = require('../models/FeaturedCars');
const Car = require('../models/Car');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const logger = require('../utils/logger');

// ==================== HERO CONTENT CRUD ====================

// Create a new Hero Content
const createHeroContent = async (req, res) => {
  try {
    const { heroText, subText } = req.body;
    let bgImage1 = req.body.bgImage1 || '';
    let bgImage2 = req.body.bgImage2 || '';
    let bgImage3 = req.body.bgImage3 || '';

    // Handle image uploads if files are provided
    if (req.files && req.files.bgImage1) {
      const bgImage1File = Array.isArray(req.files.bgImage1) ? req.files.bgImage1[0] : req.files.bgImage1;
      if (bgImage1File) {
        try {
          const result1 = await cloudinary.uploader.upload(bgImage1File.path);
          bgImage1 = result1.secure_url;
          fs.unlinkSync(bgImage1File.path);
        } catch (uploadError) {
          logger(`Error uploading bgImage1 to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading bgImage1' });
        }
      }
    }

    if (req.files && req.files.bgImage2) {
      const bgImage2File = Array.isArray(req.files.bgImage2) ? req.files.bgImage2[0] : req.files.bgImage2;
      if (bgImage2File) {
        try {
          const result2 = await cloudinary.uploader.upload(bgImage2File.path);
          bgImage2 = result2.secure_url;
          fs.unlinkSync(bgImage2File.path);
        } catch (uploadError) {
          logger(`Error uploading bgImage2 to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading bgImage2' });
        }
      }
    }

    if (req.files && req.files.bgImage3) {
      const bgImage3File = Array.isArray(req.files.bgImage3) ? req.files.bgImage3[0] : req.files.bgImage3;
      if (bgImage3File) {
        try {
          const result3 = await cloudinary.uploader.upload(bgImage3File.path);
          bgImage3 = result3.secure_url;
          fs.unlinkSync(bgImage3File.path);
        } catch (uploadError) {
          logger(`Error uploading bgImage3 to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading bgImage3' });
        }
      }
    }

    const heroContent = new HeroContent({ 
      bgImage1,
      bgImage2,
      bgImage3,
      heroText, 
      subText, 
      createdBy: req.user.id 
    });
    await heroContent.save();
    res.status(201).json({
      status: 'success',
      body: { heroContent },
      message: 'Hero content created successfully'
    });
  } catch (error) {
    logger(`Error in createHeroContent: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Hero Content
const getHeroContent = async (req, res) => {
  try {
    const heroContent = await HeroContent.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { heroContent },
      message: 'Hero content retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getHeroContent: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get Hero Content by ID
const getHeroContentById = async (req, res) => {
  try {
    const heroContent = await HeroContent.findById(req.params.id).populate('createdBy', 'name email');
    if (!heroContent) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Hero content not found'
      });
    }
    res.json({
      status: 'success',
      body: { heroContent },
      message: 'Hero content retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getHeroContentById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update Hero Content by ID
const updateHeroContent = async (req, res) => {
  try {
    const { heroText, subText } = req.body;
    const existing = await HeroContent.findById(req.params.id);
    
    if (!existing) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Hero content not found'
      });
    }

    // Start with existing values, then override with provided URLs or uploads
    let bgImage1 = typeof req.body.bgImage1 === 'string' ? req.body.bgImage1 : existing.bgImage1 || '';
    let bgImage2 = typeof req.body.bgImage2 === 'string' ? req.body.bgImage2 : existing.bgImage2 || '';
    let bgImage3 = typeof req.body.bgImage3 === 'string' ? req.body.bgImage3 : existing.bgImage3 || '';

    // Handle image uploads if files are provided
    if (req.files && req.files.bgImage1) {
      const bgImage1File = Array.isArray(req.files.bgImage1) ? req.files.bgImage1[0] : req.files.bgImage1;
      if (bgImage1File) {
        try {
          const result1 = await cloudinary.uploader.upload(bgImage1File.path);
          bgImage1 = result1.secure_url;
          fs.unlinkSync(bgImage1File.path);
        } catch (uploadError) {
          logger(`Error uploading bgImage1 to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading bgImage1' });
        }
      }
    }

    if (req.files && req.files.bgImage2) {
      const bgImage2File = Array.isArray(req.files.bgImage2) ? req.files.bgImage2[0] : req.files.bgImage2;
      if (bgImage2File) {
        try {
          const result2 = await cloudinary.uploader.upload(bgImage2File.path);
          bgImage2 = result2.secure_url;
          fs.unlinkSync(bgImage2File.path);
        } catch (uploadError) {
          logger(`Error uploading bgImage2 to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading bgImage2' });
        }
      }
    }

    if (req.files && req.files.bgImage3) {
      const bgImage3File = Array.isArray(req.files.bgImage3) ? req.files.bgImage3[0] : req.files.bgImage3;
      if (bgImage3File) {
        try {
          const result3 = await cloudinary.uploader.upload(bgImage3File.path);
          bgImage3 = result3.secure_url;
          fs.unlinkSync(bgImage3File.path);
        } catch (uploadError) {
          logger(`Error uploading bgImage3 to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading bgImage3' });
        }
      }
    }

    const updatedHeroContent = await HeroContent.findByIdAndUpdate(
      req.params.id,
      { bgImage1, bgImage2, bgImage3, heroText, subText },
      { new: true }
    ).populate('createdBy', 'name email');
    
    res.json({
      status: 'success',
      body: { heroContent: updatedHeroContent },
      message: 'Hero content updated successfully'
    });
  } catch (error) {
    logger(`Error in updateHeroContent: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete Hero Content by ID
const deleteHeroContent = async (req, res) => {
  try {
    const deletedHeroContent = await HeroContent.findByIdAndDelete(req.params.id);
    if (!deletedHeroContent) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Hero content not found'
      });
    }
    res.json({
      status: 'success',
      body: {},
      message: 'Hero content deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteHeroContent: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// ==================== BRANDS CRUD ====================

// Create a new Brand
const createBrand = async (req, res) => {
  try {
    const { brandName, subText } = req.body;
    let brandLogo = req.body.brandLogo; // Default to provided URL

    // Trim string fields to prevent duplicate entries
    const trimmedBrandName = brandName?.trim();
    const trimmedSubText = subText?.trim();

    // Handle logo upload if file is provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        brandLogo = result.secure_url;
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        logger(`Error uploading logo to Cloudinary: ${uploadError.message}`);
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Error uploading logo'
        });
      }
    }

    const brand = new Brands({ 
      brandName: trimmedBrandName, 
      brandLogo, 
      subText: trimmedSubText, 
      createdBy: req.user.id 
    });
    await brand.save();
    res.status(201).json({
      status: 'success',
      body: { brand },
      message: 'Brand created successfully'
    });
  } catch (error) {
    logger(`Error in createBrand: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Brands
const getBrands = async (req, res) => {
  try {
    const brands = await Brands.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { brands },
      message: 'Brands retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBrands: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get Brand by ID
const getBrandById = async (req, res) => {
  try {
    const brand = await Brands.findById(req.params.id).populate('createdBy', 'name email');
    if (!brand) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Brand not found'
      });
    }
    res.json({
      status: 'success',
      body: { brand },
      message: 'Brand retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getBrandById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update Brand by ID
const updateBrand = async (req, res) => {
  try {
    const { brandName, subText } = req.body;
    let brandLogo = req.body.brandLogo; // Default to provided URL

    // Trim string fields to prevent duplicate entries
    const trimmedBrandName = brandName?.trim();
    const trimmedSubText = subText?.trim();

    // Handle logo upload if file is provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        brandLogo = result.secure_url;
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
      } catch (uploadError) {
        logger(`Error uploading logo to Cloudinary: ${uploadError.message}`);
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Error uploading logo'
        });
      }
    }

    const updatedBrand = await Brands.findByIdAndUpdate(
      req.params.id,
      { brandName: trimmedBrandName, brandLogo, subText: trimmedSubText },
      { new: true }
    ).populate('createdBy', 'name email');
    if (!updatedBrand) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Brand not found'
      });
    }
    res.json({
      status: 'success',
      body: { brand: updatedBrand },
      message: 'Brand updated successfully'
    });
  } catch (error) {
    logger(`Error in updateBrand: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete Brand by ID
const deleteBrand = async (req, res) => {
  try {
    const deletedBrand = await Brands.findByIdAndDelete(req.params.id);
    if (!deletedBrand) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Brand not found'
      });
    }
    res.json({
      status: 'success',
      body: {},
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteBrand: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// ==================== SIMPLE STEPS CRUD ====================

// Create a new Simple Step (without video support now)
const createSimpleStep = async (req, res) => {
  try {
    const { stepTitle, stepName } = req.body;

    const simpleStep = new SimpleSteps({ 
      stepTitle, 
      stepName, 
      createdBy: req.user.id 
    });
    await simpleStep.save();
    res.status(201).json({
      status: 'success',
      body: { simpleStep },
      message: 'Simple step created successfully'
    });
  } catch (error) {
    logger(`Error in createSimpleStep: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Simple Steps
const getSimpleSteps = async (req, res) => {
  try {
    const simpleSteps = await SimpleSteps.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { simpleSteps },
      message: 'Simple steps retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSimpleSteps: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get Simple Step by ID
const getSimpleStepById = async (req, res) => {
  try {
    const simpleStep = await SimpleSteps.findById(req.params.id).populate('createdBy', 'name email');
    if (!simpleStep) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Simple step not found'
      });
    }
    res.json({
      status: 'success',
      body: { simpleStep },
      message: 'Simple step retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSimpleStepById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update Simple Step by ID (without video support now)
const updateSimpleStep = async (req, res) => {
  try {
    const { stepTitle, stepName } = req.body;

    const updatedSimpleStep = await SimpleSteps.findByIdAndUpdate(
      req.params.id,
      { stepTitle, stepName },
      { new: true }
    ).populate('createdBy', 'name email');
    
    if (!updatedSimpleStep) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Simple step not found'
      });
    }
    
    res.json({
      status: 'success',
      body: { simpleStep: updatedSimpleStep },
      message: 'Simple step updated successfully'
    });
  } catch (error) {
    logger(`Error in updateSimpleStep: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete Simple Step by ID
const deleteSimpleStep = async (req, res) => {
  try {
    const deletedSimpleStep = await SimpleSteps.findByIdAndDelete(req.params.id);
    if (!deletedSimpleStep) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Simple step not found'
      });
    }
    res.json({
      status: 'success',
      body: {},
      message: 'Simple step deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteSimpleStep: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// SimpleStepsSection APIs removed

// ==================== SIMPLE STEPS VIDEO CRUD ====================

// Create a new Simple Steps Video
const createSimpleStepsVideo = async (req, res) => {
  try {
    let video1 = req.body.video1 || '';
    let video2 = req.body.video2 || '';

    // Handle uploaded files (if any). Expect fields: video1, video2
    if (req.files && req.files.video1) {
      const video1File = Array.isArray(req.files.video1) ? req.files.video1[0] : req.files.video1;
      if (video1File) {
        try {
          const result1 = await cloudinary.uploader.upload(video1File.path, { resource_type: 'video' });
          video1 = result1.secure_url;
          fs.unlinkSync(video1File.path);
        } catch (uploadErr1) {
          logger(`Error uploading video1: ${uploadErr1.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading video1' });
        }
      }
    }

    if (req.files && req.files.video2) {
      const video2File = Array.isArray(req.files.video2) ? req.files.video2[0] : req.files.video2;
      if (video2File) {
        try {
          const result2 = await cloudinary.uploader.upload(video2File.path, { resource_type: 'video' });
          video2 = result2.secure_url;
          fs.unlinkSync(video2File.path);
        } catch (uploadErr2) {
          logger(`Error uploading video2: ${uploadErr2.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading video2' });
        }
      }
    }
    
    const simpleStepsVideo = new SimpleStepsVideo({ 
      video1,
      video2,
      createdBy: req.user ? req.user.id : null 
    });
    
    await simpleStepsVideo.save();
    
    res.status(201).json({
      status: 'success',
      body: { simpleStepsVideo },
      message: 'Simple steps video created successfully'
    });
  } catch (error) {
    logger(`Error in createSimpleStepsVideo: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Simple Steps Videos
const getSimpleStepsVideos = async (req, res) => {
  try {
    const simpleStepsVideos = await SimpleStepsVideo.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { simpleStepsVideos },
      message: 'Simple steps videos retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSimpleStepsVideos: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get Simple Steps Video by ID
const getSimpleStepsVideoById = async (req, res) => {
  try {
    const simpleStepsVideo = await SimpleStepsVideo.findById(req.params.id).populate('createdBy', 'name email');
    if (!simpleStepsVideo) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Simple steps video not found'
      });
    }
    res.json({
      status: 'success',
      body: { simpleStepsVideo },
      message: 'Simple steps video retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getSimpleStepsVideoById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update Simple Steps Video by ID
const updateSimpleStepsVideo = async (req, res) => {
  try {
    const existing = await SimpleStepsVideo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ status: 'failed', body: {}, message: 'Simple steps video not found' });
    }

    // Start with current values, override with provided URLs, and then with uploads
    let video1 = typeof req.body.video1 === 'string' ? req.body.video1 : existing.video1;
    let video2 = typeof req.body.video2 === 'string' ? req.body.video2 : existing.video2;

    if (req.files && req.files.video1) {
      const video1File = Array.isArray(req.files.video1) ? req.files.video1[0] : req.files.video1;
      if (video1File) {
        try {
          const result1 = await cloudinary.uploader.upload(video1File.path, { resource_type: 'video' });
          video1 = result1.secure_url;
          fs.unlinkSync(video1File.path);
        } catch (uploadErr1) {
          logger(`Error uploading video1: ${uploadErr1.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading video1' });
        }
      }
    }

    if (req.files && req.files.video2) {
      const video2File = Array.isArray(req.files.video2) ? req.files.video2[0] : req.files.video2;
      if (video2File) {
        try {
          const result2 = await cloudinary.uploader.upload(video2File.path, { resource_type: 'video' });
          video2 = result2.secure_url;
          fs.unlinkSync(video2File.path);
        } catch (uploadErr2) {
          logger(`Error uploading video2: ${uploadErr2.message}`);
          return res.status(500).json({ status: 'failed', body: {}, message: 'Error uploading video2' });
        }
      }
    }

    existing.video1 = video1;
    existing.video2 = video2;
    await existing.save();

    const updatedSimpleStepsVideo = await SimpleStepsVideo.findById(existing._id).populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { simpleStepsVideo: updatedSimpleStepsVideo },
      message: 'Simple steps video updated successfully'
    });
  } catch (error) {
    logger(`Error in updateSimpleStepsVideo: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete Simple Steps Video by ID
const deleteSimpleStepsVideo = async (req, res) => {
  try {
    const deletedSimpleStepsVideo = await SimpleStepsVideo.findByIdAndDelete(req.params.id);
    if (!deletedSimpleStepsVideo) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Simple steps video not found'
      });
    }
    res.json({
      status: 'success',
      body: {},
      message: 'Simple steps video deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteSimpleStepsVideo: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Simple Steps Videos (Public)
const getPublicSimpleStepsVideos = async (req, res) => {
  try {
    const simpleStepsVideos = await SimpleStepsVideo.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { simpleStepsVideos },
      message: 'Simple steps videos retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicSimpleStepsVideos: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Simple Steps Videos (Absolutely Public - no authentication required)
const getAbsolutelyPublicSimpleStepsVideos = async (req, res) => {
  try {
    const simpleStepsVideos = await SimpleStepsVideo.find(); // No .populate('createdBy')
    res.json({
      status: 'success',
      body: { simpleStepsVideos },
      message: 'Simple steps videos retrieved successfully for public view'
    });
  } catch (error) {
    logger(`Error in getAbsolutelyPublicSimpleStepsVideos: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// ==================== FAQ CRUD (MOVED FROM FAQ CONTROLLER) ====================

// Create a new FAQ
const createFaq = async (req, res) => {
  try {
    const { question, category, answer } = req.body;
    const faq = new FAQ({ question, category, answer });
    await faq.save();
    res.status(201).json({
      status: 'success',
      body: { faq },
      message: 'FAQ created successfully'
    });
  } catch (error) {
    logger(`Error in createFaq: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all FAQs
const getFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.json({
      status: 'success',
      body: { faqs },
      message: 'FAQs retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getFaqs: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a single FAQ by ID
const getFaqById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ not found'
      });
    }
    res.json({
      status: 'success',
      body: { faq },
      message: 'FAQ retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getFaqById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update an FAQ by ID
const updateFaq = async (req, res) => {
  try {
    const { question, category, answer } = req.body;
    const updatedFaq = await FAQ.findByIdAndUpdate(
      req.params.id,
      { question, category, answer },
      { new: true }
    );
    if (!updatedFaq) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ not found'
      });
    }
    res.json({
      status: 'success',
      body: { faq: updatedFaq },
      message: 'FAQ updated successfully'
    });
  } catch (error) {
    logger(`Error in updateFaq: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete an FAQ by ID
const deleteFaq = async (req, res) => {
  try {
    const deletedFaq = await FAQ.findByIdAndDelete(req.params.id);
    if (!deletedFaq) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ not found'
      });
    }
    res.json({
      status: 'success',
      body: {},
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteFaq: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// ==================== PUBLIC APIs ====================

// Get all Hero Content (Public)
const getPublicHeroContent = async (req, res) => {
  try {
    const heroContent = await HeroContent.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { heroContent },
      message: 'Hero content retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicHeroContent: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Brands (Public)
const getPublicBrands = async (req, res) => {
  try {
    const brands = await Brands.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { brands },
      message: 'Brands retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicBrands: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all Simple Steps (Public)
const getPublicSimpleSteps = async (req, res) => {
  try {
    const simpleSteps = await SimpleSteps.find().populate('createdBy', 'name email');
    res.json({
      status: 'success',
      body: { simpleSteps },
      message: 'Simple steps retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicSimpleSteps: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all FAQs (Public)
const getPublicFaqs = async (req, res) => {
  try {
    const faqs = await FAQ.find();
    res.json({
      status: 'success',
      body: { faqs },
      message: 'FAQs retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicFaqs: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// ==================== FEATURED CARS CRUD ====================

// Add a car to featured cars
const addFeaturedCar = async (req, res) => {
  try {
    const { carId } = req.body;

    // Validate carId
    if (!carId) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Car ID is required'
      });
    }

    // Check if car exists
    const car = await Car.findById(carId);
    if (!car) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Car not found'
      });
    }

    // Check if car is already featured
    const existingFeaturedCar = await FeaturedCars.findOne({ carId });
    if (existingFeaturedCar) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Car is already featured'
      });
    }

    // Add car to featured cars
    const featuredCar = new FeaturedCars({
      carId,
      createdBy: req.user.id,
      createdByModel: req.user.role === 'SuperAdmin' ? 'SuperAdmin' : 'Admin'
    });

    await featuredCar.save();

    // Populate the car details
    await featuredCar.populate('carId');

    res.status(201).json({
      status: 'success',
      body: { featuredCar },
      message: 'Car added to featured cars successfully'
    });
  } catch (error) {
    logger(`Error in addFeaturedCar: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Remove a car from featured cars
const removeFeaturedCar = async (req, res) => {
  try {
    const { carId } = req.params;

    // Find and delete the featured car
    const featuredCar = await FeaturedCars.findOneAndDelete({ carId });
    
    if (!featuredCar) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Featured car not found'
      });
    }

    res.json({
      status: 'success',
      body: {},
      message: 'Car removed from featured cars successfully'
    });
  } catch (error) {
    logger(`Error in removeFeaturedCar: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all featured cars
const getFeaturedCars = async (req, res) => {
  try {
    const featuredCars = await FeaturedCars.find()
      .populate('carId')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      body: { featuredCars },
      message: 'Featured cars retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getFeaturedCars: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get featured cars (Public)
const getPublicFeaturedCars = async (req, res) => {
  try {
    const featuredCars = await FeaturedCars.find()
      .populate('carId')
      .sort({ createdAt: -1 });

    res.json({
      status: 'success',
      body: { featuredCars },
      message: 'Featured cars retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getPublicFeaturedCars: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  // Hero Content CRUD
  createHeroContent,
  getHeroContent,
  getHeroContentById,
  updateHeroContent,
  deleteHeroContent,
  
  // Brands CRUD
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  
  // Simple Steps CRUD
  createSimpleStep,
  getSimpleSteps,
  getSimpleStepById,
  updateSimpleStep,
  deleteSimpleStep,
  
  // Simple Steps Video CRUD
  createSimpleStepsVideo,
  getSimpleStepsVideos,
  getSimpleStepsVideoById,
  updateSimpleStepsVideo,
  deleteSimpleStepsVideo,
  
  // FAQ CRUD
  createFaq,
  getFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  
  // Featured Cars CRUD
  addFeaturedCar,
  removeFeaturedCar,
  getFeaturedCars,
  
  // Public APIs
  getPublicHeroContent,
  getPublicBrands,
  getPublicSimpleSteps,
  getPublicFaqs,
  getPublicFeaturedCars,
  getPublicSimpleStepsVideos, // Added public API for simple steps videos
  getAbsolutelyPublicSimpleStepsVideos // Added absolutely public API for simple steps videos
};
