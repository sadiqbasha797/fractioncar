const FAQ = require('../models/FAQ');
const logger = require('../utils/logger');

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

// Get all FAQs without authentication (public API)
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
  createFaq,
  getFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  getPublicFaqs
};