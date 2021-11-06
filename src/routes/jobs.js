const express = require("express");
const { Op } = require("sequelize");

const { getProfile } = require('../middleware/getProfile');

const router = express.Router();

/**
 * Returns all unpaid jobs for active contracts owned by the profile calling.
 */
router.get('/unpaid', getProfile, async (req, res) => {
  const { Job, Contract } = req.app.get('models');
  const profileId = req.profile.id;

  const jobs = await Job.findAll({ 
    where: { [Op.or]: { paid: false, paid: null } },
    include: [
      { 
        model: Contract,
        required: true, 
        where: { 
          [Op.or]: { ContractorId: profileId, ClientId: profileId },
          status: { [Op.ne]: 'terminated' },
        }
      }
    ]
  });

  return res.json(jobs);
});

module.exports = router;