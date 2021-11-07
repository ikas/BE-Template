const express = require("express");
const { Op } = require("sequelize");

const { sequelize } = require('../model');
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
          status: 'in progress',
        }
      }
    ]
  });

  return res.json(jobs);
});

/**
 * Pay for the job with id provided.
 */
 router.post('/:id/pay', getProfile, async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const profileId = req.profile.id;
  const id = req.params.id;

  // Find job on contract owned by profile as a client
  const job = await Job.findOne({ 
    where: { id },
    include: [
      { 
        model: Contract,
        required: true, 
        where: { ClientId: profileId },
      }
    ]
  });

  // Job does not exist
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Job is already paid
  if (job.paid) {
    return res.status(400).json({ error: 'Job already paid' });
  }

  // Profile does not have enough balance
  if (job.price >= req.profile.balance) {
    return res.status(400).json({ error: 'Not enough funds' });
  }

  // Pay job - use transaction to ensure atomicity
  const t = await sequelize.transaction();

  try {
    // Subtract job price from client balance
    const client = await Profile.findOne({ where: { id: job.Contract.ClientId }});
    client.balance -= job.price;
    await client.save({ transaction: t });

    // Add job price to contractor balance
    const contractor = await Profile.findOne({ where: { id: job.Contract.ContractorId }});
    contractor.balance += job.price;
    await contractor.save({ transaction: t });

    // Update job to paid
    job.paid = true;
    job.paymentDate = new Date();
    await job.save({ transaction: t });

    await t.commit();
    const updatedJob = await Job.findOne({ where: { id }});
    return res.json(updatedJob);
  } catch (error) {
    console.log(error);
    // In case of error, rollback the transaction.
    await t.rollback();
    return res.status(500).json({ error });
  }
});

module.exports = router;