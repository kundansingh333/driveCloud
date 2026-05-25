const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { search, suggestions } = require('../controllers/searchController');

router.use(auth);

router.get('/', search);
router.get('/suggestions', suggestions);

module.exports = router;
