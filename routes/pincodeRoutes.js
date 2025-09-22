const express = require('express');
const router = express.Router();
const axios = require('axios');

// Get location by pincode
router.get('/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;
    
    // Validate pincode format
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return res.status(400).json({ 
        error: 'Invalid pincode format. Please provide a 6-digit pincode.' 
      });
    }

    // Call the Indian Postal API
    const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`);
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      const data = response.data[0];
      
      if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
        const postOffice = data.PostOffice[0];
        const location = {
          city: postOffice.District || postOffice.Name || '',
          state: postOffice.State || '',
          district: postOffice.District || '',
          formattedLocation: `${postOffice.District || postOffice.Name || ''}, ${postOffice.State || ''}`
        };
        
        return res.json(location);
      } else {
        return res.status(404).json({ 
          error: 'Pincode not found. Please check and try again.' 
        });
      }
    } else {
      return res.status(404).json({ 
        error: 'Pincode not found. Please check and try again.' 
      });
    }
  } catch (error) {
    console.error('Error fetching pincode data:', error);
    return res.status(500).json({ 
      error: 'Unable to fetch location data. Please try again later.' 
    });
  }
});

module.exports = router;
