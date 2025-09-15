const HeroContent = require('../models/HeroContent');
const Brands = require('../models/Brands');
const SimpleSteps = require('../models/SimpleSteps');
const FAQ = require('../models/FAQ');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const logger = require('../utils/logger');

// ==================== HERO CONTENT CRUD ====================

// Create a new Hero Content
const createHeroContent = async (req, res) => {
  try {
    const { heroText, subText } = req.body;
    let bgImage = req.body.bgImage; // Default to provided URL

    // Handle image upload if file is provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        bgImage = result.secure_url;
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

    const heroContent = new HeroContent({ 
      bgImage, 
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
    let bgImage = req.body.bgImage; // Default to provided URL

    // Handle image upload if file is provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        bgImage = result.secure_url;
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

    const updatedHeroContent = await HeroContent.findByIdAndUpdate(
      req.params.id,
      { bgImage, heroText, subText },
      { new: true }
    ).populate('createdBy', 'name email');
    if (!updatedHeroContent) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Hero content not found'
      });
    }
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
      brandName, 
      brandLogo, 
      subText, 
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
      { brandName, brandLogo, subText },
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

// Create a new Simple Step
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

// Update Simple Step by ID
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
  
  // FAQ CRUD
  createFaq,
  getFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  
  // Public APIs
  getPublicHeroContent,
  getPublicBrands,
  getPublicSimpleSteps,
  getPublicFaqs
};
