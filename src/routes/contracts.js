const express = require("express");
const { Op } = require("sequelize");

const { getProfile } = require('../middleware/getProfile');

const router = express.Router();

/**
 * Returns the contract for the ID provided.
 * 
 * Returns 404 Not Found if the contract could not be found.
 * Returns 404 Not Found if the contract does not belong to the profile making the request.
 */
router.get('/:id', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const { id } = req.params;
  const profileId = req.profile.id;

  const contract = await Contract.findOne({ where: {
    [Op.and]: [
      { id },
      { [Op.or]: {
          ContractorId: profileId,
          ClientId: profileId,
      }}
    ]}});

  if(contract) {
    return res.json(contract);
  }

  return res.status(404).end();
});

/**
 * Returns non-terminated contracts for the profile making the request.
 */
 router.get('/', getProfile, async (req, res) => {
  const { Contract } = req.app.get('models');
  const profileId = req.profile.id;

  const contracts = await Contract.findAll({ where: {
    [Op.and]: [
      { [Op.or]: { ContractorId: profileId, ClientId: profileId } },
      { status: {[Op.ne]: 'terminated'} },
    ]}});

  return res.json(contracts);
});

module.exports = router;