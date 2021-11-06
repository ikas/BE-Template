const chai = require('chai');

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
});