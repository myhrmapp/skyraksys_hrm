const clientDataService = require('../services/data/ClientDataService');

exports.createClient = async (req, res, next) => {
  try {
    const client = await clientDataService.create({
      ...req.body,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

exports.getAllClients = async (req, res, next) => {
  try {
    const result = await clientDataService.findAll({
      where: { isActive: true },
      order: [['companyName', 'ASC']]
    });
    // BaseService returns { data, pagination }, we just need data here for backward compatibility
    res.status(200).json({ success: true, data: result.data || result });
  } catch (error) {
    next(error);
  }
};

exports.getClientById = async (req, res, next) => {
  try {
    const client = await clientDataService.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

exports.updateClient = async (req, res, next) => {
  try {
    const client = await clientDataService.update(req.params.id, {
      ...req.body,
      updatedBy: req.user.id
    });
    res.status(200).json({ success: true, data: client });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    next(error);
  }
};

exports.deleteClient = async (req, res, next) => {
  try {
    await clientDataService.delete(req.params.id);
    res.status(200).json({ success: true, message: 'Client deleted' });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    next(error);
  }
};
