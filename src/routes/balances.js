const express = require("express");
const { Op } = require("sequelize");

const { sequelize } = require('../model');
const { getProfile } = require('../middleware/getProfile');

const router = express.Router();

/**
 * Deposit money into the balance of a client.
 */
 router.post('/deposit/:id', getProfile, async (req, res) => {
  const { Job, Contract, Profile } = req.app.get('models');
  const profileId = req.profile.id;
  const targetId = req.params.id;
  const amount = req.body.amount;

  // Amount not provided
  if (!amount) {
    return res.status(400).json({ error: 'Amount not provided' });
  }

  // Find profile that will receive amount
  const target = await Profile.findOne({ where: { id: targetId } });

  // Profile does not exist
  if (!target) {
    return res.status(404).json({ error: 'Client not found' });
  }

  // Deposit amount - use transaction to ensure atomicity
  const t = await sequelize.transaction();

  try {
    // Check current amount of unpaid jobs
    const unpaidTotal = await Job.sum('price', { 
      where: { paid: { [Op.or]: [false, null] } },
      include: [{ 
        model: Contract,
        required: true, 
        where: { ClientId: profileId },
      }]
    });

    if (unpaidTotal > 0 && (amount > (0.25 * unpaidTotal))) {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot deposit more than 25% of unpaid jobs amount' });
    }

    const client = await Profile.findOne({ where: { id: profileId }});
    client.balance += amount;
    await client.save({ transaction: t });

    await t.commit();
    return res.json(await client.reload());
  } catch (error) {
    console.log('ERROR!!');
    console.log(error);
    // In case of error, rollback the transaction.
    await t.rollback();
    return res.status(500).json({ error });
  }
});

module.exports = router;