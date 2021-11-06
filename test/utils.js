const chai = require('chai');
const chaiHttp = require('chai-http');

const { Profile, Contract, Job } = require('../src/model');

let requester;

chai.use(chaiHttp);

exports.getTestServer = async function getTestServer() {
    if (requester) {
        return requester;
    }

    requester = chai.request(require('../src/app')).keepOpen();

    return requester;
};

exports.cleanDatabase = async function cleanDatabase() {
    await Profile.sync({ force: true });
    await Contract.sync({ force: true });
    await Job.sync({ force: true });
}