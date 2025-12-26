require('dotenv').config();
const express = require('express');
const axios = require('axios');
const https = require('https');
const path = require('path');

const app = express();
const APP_PORT = process.env.APP_PORT || 3000;
const PIHOLE_API_URL = process.env.PIHOLE_API_URL || 'http://localhost:3001/api';
const BACK_END_URL = process.env.BACK_END_URL || '';

// Configure axios to ignore SSL certificate validation for HTTPS requests
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// Create axios instance with HTTPS agent configured
const axiosInstance = axios.create({
  httpsAgent: httpsAgent
});

// Global variable to store indexed result - accessible by all functions
let indexedResult = {};

// Middleware - CORS headers to allow requests from any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(express.static('public'));

// API Routes

// Config endpoint for front-end to get environment variables
app.get('/api/config', (req, res) => {
  res.json({
    BACK_END_URL: BACK_END_URL,
    APP_PORT: APP_PORT,
    PIHOLE_API_URL: PIHOLE_API_URL
  });
});

app.post('/api/setDomainStatus', async (req, res) => {
  try {
    // check to see if an id was provided in the request body and that enabled is not null
    if (req.body.id && req.body.enabled !== null) {

      const domain = indexedResult[req.body.id].domain;
      const comment = indexedResult[req.body.id].comment;
      // const enabledIndexed = indexedResult[req.body.id].enabled;

      // console.log("original domain:", domain);
      // console.log("domain type:", typeof domain);
      
      // make an HTTP URL safe string from the domain
      // encodeURIComponent properly encodes parentheses as %28 and %29
      const urlSafeDomain = encodeURIComponent(domain);
      // console.log("urlSafeDomain:", urlSafeDomain);

      // console.log("incoming req.body:", req.body);

      const body = {
        enabled: req.body.enabled,
        comment: indexedResult[req.body.id].comment
      };

      // console.log("body:", JSON.stringify(body));

      //make a call to the PIHOLE_API_URL/domains/deny/regex/{domain} 
      const url = `${PIHOLE_API_URL}/domains/deny/regex/${urlSafeDomain}`;
      const response = await axiosInstance.put(url, body);
      //output the URL and the body and the response to the console
      // console.log("url:", url);
      // console.log("request body:", JSON.stringify(body));
      // console.log("response:", JSON.stringify(response.data));

      // call the /api/getDomainStatusAll ffrom this file, server.js
      // await axios.get(`/api/getDomainStatusAll`);

      res.json(response.data);
    } 


  } catch (error) {
    console.error('Error setting domain status:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to set domain status',
      message: error.message
    });
  }
});

app.get('/api/getDomainStatusAll', async (req, res) => {
  try {
    const response = await axiosInstance.get(`${PIHOLE_API_URL}/domains/deny/regex`, {});
    // Update the global indexedResult variable
    indexedResult = response.data.domains.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    
    // Get num parameter from query, default to 5
    const num = parseInt(req.query.num) || 5;
    
    // Limit the result to first N items
    const items = Object.values(indexedResult).slice(0, num);
    const limitedResult = items.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    
    // Output to console
    // console.log(JSON.stringify(indexedResult));

    res.json(limitedResult);
  } catch (error) {
    console.error('Error getting domain status all:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to get domain status all',
      message: error.message
    });
  }
});

// Serve front-end
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Startup check: verify API connection before starting server
async function startupCheck() {
  try {
    console.log('Checking API connection...');
    const response = await axiosInstance.get(`${PIHOLE_API_URL}/info/client`);
    
    // Verify we got a valid JSON response
    if (response.data && typeof response.data === 'object') {
      console.log('PIHOLE API connection verified. Starting server...');
      return true;
    } else {
      console.error('Error: Invalid JSON response from API');
      return false;
    }
  } catch (error) {
    console.error('Error: Failed to connect to PIHOLE API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Start server after API check
startupCheck().then((success) => {
  if (success) {
    app.listen(APP_PORT, () => {
      console.log(`Server running on http://localhost:${APP_PORT}`);
      console.log(`PIHOLE API URL: ${PIHOLE_API_URL}`);
    });
  } else {
    console.error('Startup check failed. Exiting...');
    process.exit(1);
  }
});

