const chai = require('chai');

const { getTestServer } = require('./utils');

chai.should();

let requester;

describe('Contracts', () => {
    before(async () => {
        requester = await getTestServer();
    });

    it('Getting a contract without providing authentication returns 401 Unauthorized', async () => {
        const response = await requester.get(`/contracts/1`);
        response.status.should.equal(401);
    });

    it('Getting a contract that is not owned by the profile making the request returns 404 Not Found', async () => {
        const response = await requester
            .get(`/contracts/1`)
            .set('profile_id', '3');

        response.status.should.equal(404);
    });

    it('Getting a contract owned by the profile making the request returns 200 OK', async () => {
        const response = await requester
            .get(`/contracts/1`)
            .set('profile_id', '1');

        response.status.should.equal(200);
        response.body.should.be.an('object');
    });

    afterEach(async () => {});
});