const ContactForm = require('../models/ContactForm');
const Admin = require('../models/Admin');
const SuperAdmin = require('../models/SuperAdmin');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

// Submit contact form
const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        status: 'failed',
        body: {},
        message: 'All fields are required'
      });
    }

    // Create new contact form submission
    const contactForm = new ContactForm({
      name,
      email,
      subject,
      message
    });

    await contactForm.save();

    // Send acknowledgment email to user
    const userAcknowledgmentHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50; margin: 0;">Thank You for Contacting Us!</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">We've received your message and will get back to you soon.</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #2c3e50; margin-top: 0;">Your Message Details:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-left: 4px solid #3498db; margin-top: 10px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #7f8c8d;">We typically respond within 24 hours during business days.</p>
            <p style="color: #7f8c8d; font-size: 14px;">If you have any urgent queries, please call us at +91 94939 29818</p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
          <div style="text-align: center;">
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              <strong>Fraction - Car Sharing Platform</strong><br>
              Bengaluru, Karnataka 560041<br>
              contact@fractioncar.com
            </p>
          </div>
        </div>
      </div>
    `;

    const userEmailResult = await sendEmail(
      email,
      'Thank You for Contacting Fraction - We\'ll Get Back to You Soon!',
      userAcknowledgmentHtml
    );

    // Send notification email to admins and super admins
    const admins = await Admin.find({});
    const superAdmins = await SuperAdmin.find({});
    const allAdmins = [...admins, ...superAdmins];

    const adminNotificationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #e74c3c; margin: 0;">New Contact Form Submission</h1>
            <p style="color: #7f8c8d; margin: 10px 0 0 0;">A new contact form has been submitted on the website.</p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
            <h3 style="color: #856404; margin-top: 0;">Submission Details:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Submitted At:</strong> ${new Date().toLocaleString('en-IN')}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.ADMIN_URL || 'http://localhost:4200/admin'}/contact-forms" 
               style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View in Admin Panel
            </a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ecf0f1;">
          <div style="text-align: center;">
            <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
              <strong>Fraction Admin Panel</strong><br>
              This is an automated notification
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email to all admins
    const adminEmailPromises = allAdmins.map(admin => 
      sendEmail(
        admin.email,
        `New Contact Form Submission - ${subject}`,
        adminNotificationHtml
      )
    );

    const adminEmailResults = await Promise.allSettled(adminEmailPromises);

    // Log any email failures
    adminEmailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger(`Failed to send admin notification email to ${allAdmins[index].email}: ${result.reason}`);
      }
    });

    res.status(201).json({
      status: 'success',
      body: {
        contactForm: {
          id: contactForm._id,
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject,
          status: contactForm.status,
          createdAt: contactForm.createdAt
        },
        userEmailSent: userEmailResult.success
      },
      message: 'Contact form submitted successfully. You will receive a confirmation email shortly.'
    });

  } catch (error) {
    logger(`Error in submitContactForm: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get all contact forms (admin only)
const getAllContactForms = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const contactForms = await ContactForm.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await ContactForm.countDocuments(filter);

    res.json({
      status: 'success',
      body: {
        contactForms,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      message: 'Contact forms retrieved successfully'
    });

  } catch (error) {
    logger(`Error in getAllContactForms: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get single contact form (admin only)
const getContactFormById = async (req, res) => {
  try {
    const { id } = req.params;

    const contactForm = await ContactForm.findById(id);
    if (!contactForm) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contact form not found'
      });
    }

    res.json({
      status: 'success',
      body: { contactForm },
      message: 'Contact form retrieved successfully'
    });

  } catch (error) {
    logger(`Error in getContactFormById: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Update contact form status (admin only)
const updateContactFormStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNote } = req.body;
    const admin = req.user;

    const contactForm = await ContactForm.findById(id);
    if (!contactForm) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contact form not found'
      });
    }

    // Update status
    if (status) {
      contactForm.status = status;
      
      // Set replied/closed by and timestamp
      if (status === 'replied') {
        contactForm.repliedBy = {
          id: admin.id,
          name: admin.name || 'Admin',
          role: admin.role
        };
        contactForm.repliedAt = new Date();
      } else if (status === 'closed') {
        contactForm.closedBy = {
          id: admin.id,
          name: admin.name || 'Admin',
          role: admin.role
        };
        contactForm.closedAt = new Date();
      }
    }

    // Update priority
    if (priority) {
      contactForm.priority = priority;
    }

    // Add admin note
    if (adminNote) {
      contactForm.adminNotes.push({
        note: adminNote,
        addedBy: {
          id: admin.id,
          name: admin.name || 'Admin',
          role: admin.role
        }
      });
    }

    await contactForm.save();

    res.json({
      status: 'success',
      body: { contactForm },
      message: 'Contact form updated successfully'
    });

  } catch (error) {
    logger(`Error in updateContactFormStatus: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Delete contact form (admin only)
const deleteContactForm = async (req, res) => {
  try {
    const { id } = req.params;

    const contactForm = await ContactForm.findByIdAndDelete(id);
    if (!contactForm) {
      return res.status(404).json({
        status: 'failed',
        body: {},
        message: 'Contact form not found'
      });
    }

    res.json({
      status: 'success',
      body: {},
      message: 'Contact form deleted successfully'
    });

  } catch (error) {
    logger(`Error in deleteContactForm: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

// Get contact form statistics (admin only)
const getContactFormStats = async (req, res) => {
  try {
    const total = await ContactForm.countDocuments();
    const newCount = await ContactForm.countDocuments({ status: 'new' });
    const readCount = await ContactForm.countDocuments({ status: 'read' });
    const repliedCount = await ContactForm.countDocuments({ status: 'replied' });
    const closedCount = await ContactForm.countDocuments({ status: 'closed' });
    
    const highPriorityCount = await ContactForm.countDocuments({ priority: 'high' });
    const mediumPriorityCount = await ContactForm.countDocuments({ priority: 'medium' });
    const lowPriorityCount = await ContactForm.countDocuments({ priority: 'low' });

    // Get recent submissions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCount = await ContactForm.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    res.json({
      status: 'success',
      body: {
        stats: {
          total,
          byStatus: {
            new: newCount,
            read: readCount,
            replied: repliedCount,
            closed: closedCount
          },
          byPriority: {
            high: highPriorityCount,
            medium: mediumPriorityCount,
            low: lowPriorityCount
          },
          recent: recentCount
        }
      },
      message: 'Contact form statistics retrieved successfully'
    });

  } catch (error) {
    logger(`Error in getContactFormStats: ${error.message}`);
    res.status(500).json({
      status: 'failed',
      body: {},
      message: 'Internal server error'
    });
  }
};

module.exports = {
  submitContactForm,
  getAllContactForms,
  getContactFormById,
  updateContactFormStatus,
  deleteContactForm,
  getContactFormStats
};
