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

    describe('Get best clients', () => {
        it('Getting best clients without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.get(`/admin/best-clients`);
            response.status.should.equal(401);
        });

        it('Getting best clients without providing start date returns 400 Bad Request', async () => {
            const user1 = await createProfile();

            const response = await requester
                .get(`/admin/best-clients`)
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'Start date not provided or invalid');
        });
        
        it('Getting best clients without providing end date returns 400 Bad Request', async () => {
            const user1 = await createProfile();

            const response = await requester
                .get(`/admin/best-clients`)
                .query({ start: '2020-08-15T00:00:00.000Z' })
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'End date not provided or invalid');
        });
    
        it('(Happy path) Getting best clients considers only paid jobs inside time range', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();

            const contract1 = await createContract(user1.id, user2.id);
            const contract2 = await createContract(user2.id, user1.id);

            await createJob(contract1.id, true, 100);
            await createJob(contract1.id, false, 100);
            await createJob(contract1.id, true, 100, '2021-01-01T00:00:00.000Z');
            
            await createJob(contract2.id, true, 200);
            await createJob(contract2.id, false, 200);
            await createJob(contract2.id, true, 200, '2021-01-01T00:00:00.000Z');

            const response = await requester
                .get(`/admin/best-clients`)
                .query({ start: '2020-08-15T00:00:00.000Z', end: '2020-08-31T00:00:00.000Z' })
                .set('profile_id', user1.id);

            response.status.should.equal(200);
            response.body.should.be.an('array').and.have.length(2);
            
            response.body[0].should.have.property('id', user2.id);
            response.body[0].should.have.property('fullName', `${user2.firstName} ${user2.lastName}`);
            response.body[0].should.have.property('paid', 200);
            
            response.body[1].should.have.property('id', user1.id);
            response.body[1].should.have.property('fullName', `${user1.firstName} ${user1.lastName}`);
            response.body[1].should.have.property('paid', 100);
        });

        it('(Happy path) Getting best clients takes provided limit into account', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();

            const contract1 = await createContract(user1.id, user2.id);
            const contract2 = await createContract(user2.id, user1.id);

            await createJob(contract1.id, true, 100);
            await createJob(contract1.id, false, 100);
            await createJob(contract1.id, true, 100, '2021-01-01T00:00:00.000Z');
            
            await createJob(contract2.id, true, 200);
            await createJob(contract2.id, false, 200);
            await createJob(contract2.id, true, 200, '2021-01-01T00:00:00.000Z');

            const response = await requester
                .get(`/admin/best-clients`)
                .query({ start: '2020-08-15T00:00:00.000Z', end: '2020-08-31T00:00:00.000Z', limit: 1 })
                .set('profile_id', user1.id);

            response.status.should.equal(200);
            response.body.should.be.an('array').and.have.length(1);
            
            response.body[0].should.have.property('id', user2.id);
            response.body[0].should.have.property('fullName', `${user2.firstName} ${user2.lastName}`);
            response.body[0].should.have.property('paid', 200);
        });
    });
});