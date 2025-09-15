const mongoose = require('mongoose');
const Contract = require('../models/contract');
const logger = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const upload = require('../config/contractMulter');

// Create a new contract (Admin/SuperAdmin)
const createContract = async (req, res) => {
  try {
    const { carid, userid, ticketid, contract_docs } = req.body;

    // Validate required fields
    if (!carid || !userid || !ticketid) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'carid, userid, and ticketid are required fields'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(carid) || 
        !mongoose.Types.ObjectId.isValid(userid) || 
        !mongoose.Types.ObjectId.isValid(ticketid)) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Invalid ObjectId format for carid, userid, or ticketid'
      });
    }

    let uploadedUrls = [];

    // Handle file uploads if files are present
    if (req.files && req.files.length > 0) {
      logger(`Processing ${req.files.length} files for contract creation`);
      
      // Upload each file to Cloudinary
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            {
              folder: 'contract-documents',
              resource_type: 'raw',
              public_id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              format: 'pdf'
            }
          );
          uploadedUrls.push(result.secure_url);
        } catch (uploadError) {
          logger(`Error uploading file to Cloudinary: ${uploadError.message}`);
          return res.status(500).json({
            status: 'failed',
            body: {},
            message: 'Error uploading files to cloud storage'
          });
        }
      }
    }

    // Combine uploaded files with any existing contract_docs from body
    const allContractDocs = [...uploadedUrls, ...(contract_docs || [])];

    const contract = new Contract({
      carid,
      userid,
      ticketid,
      contract_docs: allContractDocs,
      createdby: req.user.id,
      createdByModel: req.user.role === 'superadmin' ? 'SuperAdmin' : 'Admin'
    });

    await contract.save();
    
    const populatedContract = await Contract.findById(contract._id)
      .populate('carid userid ticketid');

    res.status(201).json({
      status: 'success',
      body: { 
        contract: populatedContract,
        uploadedDocuments: uploadedUrls
      },
      message: `Contract created successfully${uploadedUrls.length > 0 ? ` with ${uploadedUrls.length} document(s)` : ''}`
    });
  } catch (error) {
    logger(`Error in createContract: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all contracts (Admin/SuperAdmin)
const getContracts = async (req, res) => {
  try {
    const contracts = await Contract.find()
      .populate('carid userid ticketid');
      
    res.json({
      status: 'success',
      body: { contracts },
      message: 'Contracts retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getContracts: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get a contract by ID (Admin/SuperAdmin)
const getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('carid userid ticketid');
      
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }
    
    res.json({
      status: 'success',
      body: { contract },
      message: 'Contract retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getContractById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update a contract by ID (Admin/SuperAdmin)
const updateContract = async (req, res) => {
  try {
    const { contract_docs } = req.body;
    
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }
    
    // Check if user is authorized to update this contract
    if (contract.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this contract'
      });
    }
    
    const updatedContract = await Contract.findByIdAndUpdate(
      req.params.id,
      { contract_docs },
      { new: true }
    ).populate('carid userid ticketid');
    
    res.json({
      status: 'success',
      body: { contract: updatedContract },
      message: 'Contract updated successfully'
    });
  } catch (error) {
    logger(`Error in updateContract: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete a contract by ID (Admin/SuperAdmin)
const deleteContract = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }
    
    // Check if user is authorized to delete this contract
    if (contract.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to delete this contract'
      });
    }
    
    await Contract.findByIdAndDelete(req.params.id);
    res.json({
      status: 'success',
      body: {},
      message: 'Contract deleted successfully'
    });
  } catch (error) {
    logger(`Error in deleteContract: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get user's contract documents (User)
const getUserContractDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // First, let's get the raw contracts without populate to see what's actually stored
    const rawContracts = await Contract.find({ userid: userId }).sort({ createdat: -1 });
    
    logger(`Raw contracts found: ${rawContracts.length}`);
    for (const contract of rawContracts) {
      logger(`Contract ${contract._id}: carid=${contract.carid}, ticketid=${contract.ticketid}, carid type=${typeof contract.carid}, ticketid type=${typeof contract.ticketid}`);
    }
    
    // Now try to populate
    const contracts = await Contract.find({ userid: userId })
      .populate({
        path: 'ticketid',
        select: 'ticketcustomid ticketprice pricepaid pendingamount ticketexpiry ticketbroughtdate ticketstatus'
      })
      .populate({
        path: 'carid',
        select: 'carname brandname color images'
      })
      .sort({ createdat: -1 });
    
    logger(`After populate - contracts found: ${contracts.length}`);
    for (const contract of contracts) {
      logger(`After populate - Contract ${contract._id}: carid=${contract.carid}, ticketid=${contract.ticketid}`);
    }
    
    // Filter out contracts without documents and log any null references
    const contractsWithDocs = contracts.filter(contract => {
      if (!contract.contract_docs || contract.contract_docs.length === 0) {
        return false;
      }
      
      // Log if carid or ticketid are null for debugging
      if (!contract.carid) {
        logger(`Warning: Contract ${contract._id} has null carid after populate`);
      }
      if (!contract.ticketid) {
        logger(`Warning: Contract ${contract._id} has null ticketid after populate`);
      }
      
      return true;
    });
    
    res.json({
      status: 'success',
      body: { contracts: contractsWithDocs },
      message: 'User contract documents retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getUserContractDocuments: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Download contract document (User/Admin/SuperAdmin)
const downloadContractDocument = async (req, res) => {
  try {
    const { contractId, docIndex } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find the contract and verify ownership
    const contract = await Contract.findById(contractId)
      .populate('ticketid', 'ticketcustomid')
      .populate('carid', 'carname brandname');
    
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }
    
    // Check if user is authorized to access this contract
    // Users can only access their own contracts, but admin/superadmin can access any
    if (userRole === 'user' && contract.userid.toString() !== userId) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access this contract'
      });
    }
    
    // Check if document exists
    if (!contract.contract_docs || !contract.contract_docs[docIndex]) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Document not found'
      });
    }
    
    const documentUrl = contract.contract_docs[docIndex];
    const fileName = `contract_${contract.ticketid.ticketcustomid}_${contract.carid.carname.replace(/\s+/g, '_')}_${docIndex + 1}.pdf`;
    
    // If it's a Cloudinary URL, redirect to it
    if (documentUrl.includes('cloudinary.com')) {
      res.redirect(documentUrl);
    } else {
      // Fallback for local files (if any exist)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Send the file
      res.sendFile(documentUrl, { root: '.' }, (err) => {
        if (err) {
          logger(`Error sending file: ${err.message}`);
          if (!res.headersSent) {
            res.status(500).json({
              status: 'failed',
              body: {},
              message: 'Error downloading document'
            });
          }
        }
      });
    }
  } catch (error) {
    logger(`Error in downloadContractDocument: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Upload contract documents (Admin/SuperAdmin)
const uploadContractDocuments = async (req, res) => {
  try {
    const { contractId } = req.params;
    
    logger(`Upload request received for contractId: ${contractId}`);
    logger(`Files received: ${req.files ? req.files.length : 0}`);
    
    if (!req.files || req.files.length === 0) {
      logger('No files uploaded');
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No files uploaded'
      });
    }

    // Find the contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }

    // Check if user is authorized to update this contract
    if (contract.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this contract'
      });
    }

    const uploadedUrls = [];

    // Upload each file to Cloudinary
    for (const file of req.files) {
      try {
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          {
            folder: 'contract-documents',
            resource_type: 'raw',
            public_id: `contract_${contractId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            format: 'pdf'
          }
        );
        uploadedUrls.push(result.secure_url);
      } catch (uploadError) {
        logger(`Error uploading file to Cloudinary: ${uploadError.message}`);
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Error uploading files to cloud storage'
        });
      }
    }

    // Update contract with new document URLs
    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      { 
        $push: { 
          contract_docs: { $each: uploadedUrls }
        }
      },
      { new: true }
    ).populate('carid userid ticketid');

    res.json({
      status: 'success',
      body: { 
        contract: updatedContract,
        uploadedDocuments: uploadedUrls
      },
      message: `${uploadedUrls.length} contract document(s) uploaded successfully`
    });
  } catch (error) {
    logger(`Error in uploadContractDocuments: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get contract document URL (User/Admin/SuperAdmin) - for testing purposes
const getContractDocumentUrl = async (req, res) => {
  try {
    const { contractId, docIndex } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find the contract and verify ownership
    const contract = await Contract.findById(contractId)
      .populate('ticketid', 'ticketcustomid')
      .populate('carid', 'carname brandname');
    
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }
    
    // Check if user is authorized to access this contract
    // Users can only access their own contracts, but admin/superadmin can access any
    if (userRole === 'user' && contract.userid.toString() !== userId) {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to access this contract'
      });
    }
    
    // Check if document exists
    if (!contract.contract_docs || !contract.contract_docs[docIndex]) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Document not found'
      });
    }
    
    const documentUrl = contract.contract_docs[docIndex];
    
    res.json({
      status: 'success',
      body: { 
        documentUrl,
        contractId,
        docIndex: parseInt(docIndex)
      },
      message: 'Document URL retrieved successfully'
    });
  } catch (error) {
    logger(`Error in getContractDocumentUrl: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Helper function to check and fix contracts with null references (Admin/SuperAdmin)
const checkAndFixContractReferences = async (req, res) => {
  try {
    const Car = require('../models/Car');
    const Ticket = require('../models/Ticket');
    
    // Find all contracts with null carid or ticketid
    const contractsWithNullRefs = await Contract.find({
      $or: [
        { carid: null },
        { ticketid: null }
      ]
    });

    logger(`Found ${contractsWithNullRefs.length} contracts with null references`);

    const results = [];
    
    for (const contract of contractsWithNullRefs) {
      const result = {
        contractId: contract._id,
        issues: [],
        fixed: false,
        rawData: {
          carid: contract.carid,
          ticketid: contract.ticketid,
          caridType: typeof contract.carid,
          ticketidType: typeof contract.ticketid
        }
      };

      // Check if carid is null
      if (!contract.carid) {
        result.issues.push('carid is null');
      } else {
        // Check if the referenced car exists
        const carExists = await Car.findById(contract.carid);
        if (!carExists) {
          result.issues.push(`carid ${contract.carid} references non-existent car`);
        } else {
          result.issues.push(`carid ${contract.carid} references existing car: ${carExists.carname}`);
        }
      }

      // Check if ticketid is null
      if (!contract.ticketid) {
        result.issues.push('ticketid is null');
      } else {
        // Check if the referenced ticket exists
        const ticketExists = await Ticket.findById(contract.ticketid);
        if (!ticketExists) {
          result.issues.push(`ticketid ${contract.ticketid} references non-existent ticket`);
        } else {
          result.issues.push(`ticketid ${contract.ticketid} references existing ticket: ${ticketExists.ticketcustomid}`);
        }
      }

      results.push(result);
    }

    res.json({
      status: 'success',
      body: { 
        contractsWithIssues: results,
        totalContractsChecked: contractsWithNullRefs.length
      },
      message: 'Contract reference check completed'
    });
  } catch (error) {
    logger(`Error in checkAndFixContractReferences: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete contract documents (Admin/SuperAdmin)
const deleteContractDocs = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { docIndexes } = req.body; // Array of document indexes to delete

    if (!docIndexes || !Array.isArray(docIndexes) || docIndexes.length === 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'docIndexes array is required and must not be empty'
      });
    }

    // Find the contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }

    // Check if user is authorized to update this contract
    if (contract.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this contract'
      });
    }

    // Validate document indexes
    const validIndexes = docIndexes.filter(index => 
      Number.isInteger(index) && index >= 0 && index < contract.contract_docs.length
    );

    if (validIndexes.length === 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No valid document indexes provided'
      });
    }

    // Get URLs of documents to be deleted for Cloudinary cleanup
    const urlsToDelete = validIndexes.map(index => contract.contract_docs[index]);

    // Delete documents from Cloudinary
    for (const url of urlsToDelete) {
      if (url.includes('cloudinary.com')) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`contract-documents/${publicId}`, {
            resource_type: 'raw'
          });
          logger(`Deleted document from Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          logger(`Error deleting document from Cloudinary: ${cloudinaryError.message}`);
          // Continue with database update even if Cloudinary deletion fails
        }
      }
    }

    // Remove documents from contract_docs array (in reverse order to maintain indexes)
    const sortedIndexes = validIndexes.sort((a, b) => b - a);
    const updatedContractDocs = [...contract.contract_docs];
    
    for (const index of sortedIndexes) {
      updatedContractDocs.splice(index, 1);
    }

    // Update contract with remaining documents
    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      { contract_docs: updatedContractDocs },
      { new: true }
    ).populate('carid userid ticketid');

    res.json({
      status: 'success',
      body: { 
        contract: updatedContract,
        deletedDocuments: urlsToDelete,
        deletedCount: validIndexes.length
      },
      message: `${validIndexes.length} contract document(s) deleted successfully`
    });
  } catch (error) {
    logger(`Error in deleteContractDocs: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update contract documents (Admin/SuperAdmin) - replaces existing documents
const updateContractDocs = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { docIndexes } = req.body; // Array of document indexes to replace

    if (!docIndexes || !Array.isArray(docIndexes) || docIndexes.length === 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'docIndexes array is required and must not be empty'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No files uploaded for replacement'
      });
    }

    if (req.files.length !== docIndexes.length) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'Number of files must match number of document indexes to replace'
      });
    }

    // Find the contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contract not found'
      });
    }

    // Check if user is authorized to update this contract
    if (contract.createdby.toString() !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({
        status: 'failed',
        body: {},
        message: 'Not authorized to update this contract'
      });
    }

    // Validate document indexes
    const validIndexes = docIndexes.filter(index => 
      Number.isInteger(index) && index >= 0 && index < contract.contract_docs.length
    );

    if (validIndexes.length === 0) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'No valid document indexes provided'
      });
    }

    // Get URLs of documents to be replaced for Cloudinary cleanup
    const urlsToDelete = validIndexes.map(index => contract.contract_docs[index]);

    // Upload new files to Cloudinary
    const uploadedUrls = [];
    for (const file of req.files) {
      try {
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          {
            folder: 'contract-documents',
            resource_type: 'raw',
            public_id: `contract_${contractId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            format: 'pdf'
          }
        );
        uploadedUrls.push(result.secure_url);
      } catch (uploadError) {
        logger(`Error uploading file to Cloudinary: ${uploadError.message}`);
        return res.status(500).json({
          status: 'failed',
          body: {},
          message: 'Error uploading files to cloud storage'
        });
      }
    }

    // Delete old documents from Cloudinary
    for (const url of urlsToDelete) {
      if (url.includes('cloudinary.com')) {
        try {
          // Extract public_id from Cloudinary URL
          const publicId = url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`contract-documents/${publicId}`, {
            resource_type: 'raw'
          });
          logger(`Deleted old document from Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          logger(`Error deleting old document from Cloudinary: ${cloudinaryError.message}`);
          // Continue with database update even if Cloudinary deletion fails
        }
      }
    }

    // Replace documents in contract_docs array
    const updatedContractDocs = [...contract.contract_docs];
    for (let i = 0; i < validIndexes.length; i++) {
      updatedContractDocs[validIndexes[i]] = uploadedUrls[i];
    }

    // Update contract with new documents
    const updatedContract = await Contract.findByIdAndUpdate(
      contractId,
      { contract_docs: updatedContractDocs },
      { new: true }
    ).populate('carid userid ticketid');

    res.json({
      status: 'success',
      body: { 
        contract: updatedContract,
        replacedDocuments: {
          old: urlsToDelete,
          new: uploadedUrls
        },
        replacedCount: validIndexes.length
      },
      message: `${validIndexes.length} contract document(s) updated successfully`
    });
  } catch (error) {
    logger(`Error in updateContractDocs: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Helper function to handle multiple file uploads
const uploadMultiple = (req, res, next) => {
  logger('Multer middleware called');
  logger(`Request method: ${req.method}`);
  logger(`Request URL: ${req.url}`);
  logger(`Request body keys: ${Object.keys(req.body || {})}`);
  
  upload.array('contract_docs', 5)(req, res, (err) => {
    if (err) {
      logger(`Multer error: ${err.message}`);
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: `File upload error: ${err.message}`
      });
    }
    
    logger(`Multer processed files: ${req.files ? req.files.length : 0}`);
    next();
  });
};

module.exports = {
  createContract,
  getContracts,
  getContractById,
  updateContract,
  deleteContract,
  getUserContractDocuments,
  downloadContractDocument,
  uploadContractDocuments,
  deleteContractDocs,
  updateContractDocs,
  uploadMultiple,
  getContractDocumentUrl,
  checkAndFixContractReferences
};