const express = require("express");
const { Op } = require("sequelize");

const { sequelize } = require('../model');
const { getProfile } = require('../middleware/getProfile');

const router = express.Router();

/**
* Returns the profession that earned the most money (sum of jobs paid) 
* for any contactor that worked in the query time range.
*/
router.get('/best-profession', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const { start, end } = req.query;
    
    const startDate = new Date(start);
    if(!start || isNaN(startDate.getTime())) {
        return res.status(400).json({ error: 'Start date not provided or invalid' });
    }
    
    const endDate = new Date(end);
    if(!end || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'End date not provided or invalid' });
    }
    
    const results = await Job.findAll({ 
        where: {
            paid: true,
            paymentDate: {
                [Op.and]: [
                    { [Op.gte]: startDate },
                    { [Op.lte]: endDate },
                ]
            },
        },
        include: [
            { model: Contract, include: [{ 
                model: Profile, 
                required: true, 
                as: 'Contractor', 
                attributes: ['profession']}] },
        ],
        attributes: [
            'Contract->Contractor.profession',
            [sequelize.fn('sum', sequelize.col('price')), 'total_earnings'],
        ],
        group: 'Contract->Contractor.profession',
        order: [['price', 'DESC']]
    });

    return res.json(results.map(el => ({ 
        profession: el.Contract.Contractor.profession,
        total_earnings: el.get('total_earnings'), 
    })));
});

module.exports = router;