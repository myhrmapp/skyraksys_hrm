const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Protect all client routes
router.use(authenticateToken);

// Allow Admin, HR, Manager to access client routes
router.use(authorize('admin', 'hr', 'manager'));

router.route('/')
  .post(clientController.createClient)
  .get(clientController.getAllClients);

router.route('/:id')
  .get(clientController.getClientById)
  .put(clientController.updateClient)
  .delete(authorize('admin', 'hr'), clientController.deleteClient);

module.exports = router;
