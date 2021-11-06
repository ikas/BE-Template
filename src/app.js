const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')

const contractsRouter = require('./routes/contracts');

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

app.use('/contracts', contractsRouter);

module.exports = app;
