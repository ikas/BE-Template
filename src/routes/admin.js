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

/**
* Returns the clients the paid the most for jobs in the query time period. 
* Limit query parameter should be applied, default limit is 2.
*/
router.get('/best-clients', getProfile, async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const { start, end, limit } = req.query;
    
    const startDate = new Date(start);
    if(!start || isNaN(startDate.getTime())) {
        return res.status(400).json({ error: 'Start date not provided or invalid' });
    }
    
    const endDate = new Date(end);
    if(!end || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'End date not provided or invalid' });
    }
    
    const results = await Profile.findAll({ 
        include: [
            { 
                model: Contract, 
                required: true,
                as: 'Client',
                include: [{ 
                    model: Job, 
                    required: true, 
                    where: { 
                        paid: true,
                        paymentDate: {
                            [Op.and]: [
                                { [Op.gte]: startDate },
                                { [Op.lte]: endDate },
                            ]
                        },
                    },
                }], 
            },
        ],
        attributes: {
            include: [
                [sequelize.fn('sum', sequelize.col('Client.Jobs.price')), 'total_paid'],
                [sequelize.literal("firstName || ' ' || lastName"), 'fullName'],
            ],
        },
        group: 'Profile.id',
        order: [[sequelize.col('total_paid'), 'DESC']],
        limit: limit || 2,
        // There's a bug with limits in queries with includes
        // https://github.com/sequelize/sequelize/issues/7344#issuecomment-307390689
        // adding subQuery: false is the recommended workaround
        subQuery: false,
    });

    return res.json(results.map(el => ({ 
        id: el.get('id'),
        fullName: el.get('fullName'),
        paid: el.get('total_paid'), 
    })));
});

module.exports = router;