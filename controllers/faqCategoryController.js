const FAQCategory = require('../models/FAQCategory');
const logger = require('../utils/logger');

// Create a new FAQ Category
const createFaqCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Check if category already exists
    const existingCategory = await FAQCategory.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Category with this name already exists'
      });
    }

    const faqCategory = new FAQCategory({ name: name.trim(), description: description?.trim() });
    await faqCategory.save();
    
    res.status(201).json({
      status: 'success',
      body: { faqCategory },
      message: 'FAQ Category created successfully'
    });
  } catch (error) {
    logger(`Error in createFaqCategory: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all FAQ Categories
const getFaqCategories = async (req, res) => {
  try {
    const categories = await FAQCategory.find({ isActive: true }).sort({ name: 1 });
    res.json({
      status: 'success',
      body: { categories },
      message: 'FAQ Categories retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getFaqCategories: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all FAQ Categories (including inactive for admin)
const getAllFaqCategories = async (req, res) => {
  try {
    const categories = await FAQCategory.find().sort({ name: 1 });
    res.json({
      status: 'success',
      body: { categories },
      message: 'All FAQ Categories retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getAllFaqCategories: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get FAQ Category by ID
const getFaqCategoryById = async (req, res) => {
  try {
    const category = await FAQCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ Category not found'
      });
    }
    res.json({
      status: 'success',
      body: { category },
      message: 'FAQ Category retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getFaqCategoryById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update FAQ Category by ID
const updateFaqCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    // Check if category name already exists (excluding current category)
    if (name) {
      const existingCategory = await FAQCategory.findOne({ 
        name: name.trim(), 
        _id: { $ne: req.params.id } 
      });
      if (existingCategory) {
        return res.status(400).json({
          status: 'failed',
          body: {},
          message: 'Category with this name already exists'
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCategory = await FAQCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ Category not found'
      });
    }

    res.json({
      status: 'success',
      body: { category: updatedCategory },
      message: 'FAQ Category updated successfully'
    });
  } catch (error) {
    logger(`Error in updateFaqCategory: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete FAQ Category by ID (soft delete by setting isActive to false)
const deleteFaqCategory = async (req, res) => {
  try {
    const category = await FAQCategory.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ Category not found'
      });
    }

    res.json({
      status: 'success',
      body: { category },
      message: 'FAQ Category deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteFaqCategory: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Hard delete FAQ Category by ID (permanent deletion)
const hardDeleteFaqCategory = async (req, res) => {
  try {
    const category = await FAQCategory.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'FAQ Category not found'
      });
    }

    res.json({
      status: 'success',
      body: {},
      message: 'FAQ Category permanently deleted'
    });
  } catch (error) {
    logger(`Error in hardDeleteFaqCategory: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  createFaqCategory,
  getFaqCategories,
  getAllFaqCategories,
  getFaqCategoryById,
  updateFaqCategory,
  deleteFaqCategory,
  hardDeleteFaqCategory
};
