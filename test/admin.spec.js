const chai = require('chai');

const { createProfile, createContract, createJob } = require('./factory');
const { getTestServer, cleanDatabase } = require('./utils');

chai.should();

let requester;

describe('Admin API', () => {
    before(async () => {
        requester = await getTestServer();
    });

    beforeEach(async () => { await cleanDatabase(); });
    afterEach(async () => { await cleanDatabase(); });

    describe('Get best professions', () => {
        it('Getting best professions without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.get(`/admin/best-profession`);
            response.status.should.equal(401);
        });

        it('Getting best professions without providing start date returns 400 Bad Request', async () => {
            const user1 = await createProfile();

            const response = await requester
                .get(`/admin/best-profession`)
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'Start date not provided or invalid');
        });
        
        it('Getting best professions without providing end date returns 400 Bad Request', async () => {
            const user1 = await createProfile();

            const response = await requester
                .get(`/admin/best-profession`)
                .query({ start: '2020-08-15T00:00:00.000Z' })
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'End date not provided or invalid');
        });
    
        it('(Happy path) Getting best professions considers only paid jobs inside time range', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();
            const contract = await createContract(user1.id, user2.id);
            await createJob(contract.id, true, 100);
            await createJob(contract.id, false, 100);
            await createJob(contract.id, true, 100, '2021-01-01T00:00:00.000Z');

            const response = await requester
                .get(`/admin/best-profession`)
                .query({ start: '2020-08-15T00:00:00.000Z', end: '2020-08-31T00:00:00.000Z' })
                .set('profile_id', user1.id);

            response.status.should.equal(200);
            response.body.should.be.an('array').and.have.length(1);
            response.body[0].should.have.property('profession', user1.profession);
            response.body[0].should.have.property('total_earnings', 100);
        });
    });
});