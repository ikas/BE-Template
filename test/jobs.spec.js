const chai = require('chai');
const { Profile } = require('../src/model');

const { createProfile, createContract, createJob } = require('./factory');
const { getTestServer, cleanDatabase } = require('./utils');

chai.should();

let requester;

describe('Jobs API', () => {
    before(async () => {
        requester = await getTestServer();
    });

    beforeEach(async () => { await cleanDatabase(); });
    afterEach(async () => { await cleanDatabase(); });

    describe('Get unpaid jobs', () => {
        it('Getting unpaid jobs without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.get(`/jobs/unpaid`);
            response.status.should.equal(401);
        });
    
        it('Getting unpaid jobs returns 200 OK including jobs for all active contracts owned by the profile making the request', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();
            const user3 = await createProfile();
            
            const newContract1 = await createContract(user1.id, user2.id, 'new');
            const newContract2 = await createContract(user3.id, user2.id, 'new');
            const inProgContract1 = await createContract(user1.id, user2.id, 'in progress');
            const inProgContract2 = await createContract(user3.id, user2.id, 'in progress');
            const termContract1 = await createContract(user1.id, user2.id);
            const termContract2 = await createContract(user3.id, user2.id);

            const newJob1 = await createJob(newContract1.id, false);
            await createJob(newContract2.id, true);
            await createJob(inProgContract1.id, true);
            await createJob(inProgContract2.id, false);
            await createJob(termContract1.id, false);
            await createJob(termContract2.id, true);

            const response = await requester
                .get(`/jobs/unpaid`)
                .set('profile_id', user1.id);

            response.status.should.equal(200);
            response.body.should.be.an('array').and.have.length(1);
            response.body.map(el => el.id).should.deep.equal([newJob1.id]);
        });
    });

    describe('Pay job', () => {
        it('Paying jobs without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.post(`/jobs/1/pay`);
            response.status.should.equal(401);
        });
    
        it('Paying a job that does not exist returns 404 Not Found', async () => {
            const user1 = await createProfile();

            const response = await requester
                .post(`/jobs/1/pay`)
                .set('profile_id', user1.id);

            response.status.should.equal(404);
            response.body.should.be.an('object').and.have.property('error', 'Job not found');
        });

        it('Paying a job that does not belong to a contract owned by the profile calling returns 404 Not Found', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();
            const user3 = await createProfile();

            const contract = await createContract(user1.id, user2.id);
            const job = await createJob(contract.id, false);

            const response = await requester
                .post(`/jobs/${job.id}/pay`)
                .set('profile_id', user3.id);

            response.status.should.equal(404);
            response.body.should.be.an('object').and.have.property('error', 'Job not found');
        });

        it('Paying a job that is already paid returns 400 Bad Request', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();

            const contract = await createContract(user1.id, user2.id);
            const job = await createJob(contract.id, true);

            const response = await requester
                .post(`/jobs/${job.id}/pay`)
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'Job already paid');
        });
        
        it('Paying a job when the profile calling does not have enough balance returns 400 Bad Request', async () => {
            const user1 = await createProfile(0);
            const user2 = await createProfile();

            const contract = await createContract(user1.id, user2.id);
            const job = await createJob(contract.id, false, 2000);

            const response = await requester
                .post(`/jobs/${job.id}/pay`)
                .set('profile_id', user1.id);

            response.status.should.equal(400);
            response.body.should.be.an('object').and.have.property('error', 'Not enough funds');
        });

        it('(Happy case) Paying a job returns 200 OK with the updated job information', async () => {
            const user1 = await createProfile(1000);
            const user2 = await createProfile();

            const contract = await createContract(user1.id, user2.id);
            const job = await createJob(contract.id, false, 500);

            const response = await requester
                .post(`/jobs/${job.id}/pay`)
                .set('profile_id', user1.id);

            response.status.should.equal(200);
            response.body.should.be.an('object').and.have.property('paid', true);

            // Check balance of client - should have less money
            const client = await Profile.findOne({ where: { id: user1.id } });
            client.balance.should.equal(user1.balance - job.price);

            // Check balance of contractor - should have more money
            const contractor = await Profile.findOne({ where: { id: user2.id } });
            contractor.balance.should.equal(user1.balance + job.price);

        });
    });
});