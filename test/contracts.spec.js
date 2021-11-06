const chai = require('chai');

const { createProfile, createContract } = require('./factory');
const { getTestServer, cleanDatabase } = require('./utils');

chai.should();

let requester;

describe('Contracts API', () => {
    before(async () => {
        requester = await getTestServer();
    });

    beforeEach(async () => { await cleanDatabase(); });
    afterEach(async () => { await cleanDatabase(); });

    describe('Get contracts by id', () => {
        it('Getting a contract without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.get(`/contracts/1`);
            response.status.should.equal(401);
        });
    
        it('Getting a contract that is not owned by the profile making the request returns 404 Not Found', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();
            const user3 = await createProfile();
            
            const contract = await createContract({
                ClientId: user2.id,
                ContractorId: user3.id,
            });

            const response = await requester
                .get(`/contracts/${contract.id}`)
                .set('profile_id', user1.id);
    
            response.status.should.equal(404);
        });
    
        it('Getting a contract owned by the profile making the request returns 200 OK', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();
            
            const contract = await createContract({
                ClientId: user1.id,
                ContractorId: user2.id,
            });

            const response = await requester
                .get(`/contracts/${contract.id}`)
                .set('profile_id', user1.id);
    
            response.status.should.equal(200);
            response.body.should.be.an('object');
            response.body.should.have.property('id', contract.id);
            response.body.should.have.property('terms', contract.terms);
            response.body.should.have.property('status', contract.status);
            response.body.should.have.property('ContractorId', contract.ContractorId);
            response.body.should.have.property('ClientId', contract.ClientId);
        });
    });

    describe('Get contracts', () => {
        it('Getting contracts without providing authentication returns 401 Unauthorized', async () => {
            const response = await requester.get(`/contracts`);
            response.status.should.equal(401);
        });
    
        it('Getting contracts returns 200 OK with all non-terminated contracts owned by the profile making the request', async () => {
            const user1 = await createProfile();
            const user2 = await createProfile();
            const user3 = await createProfile();

            const contract1 = await createContract({
                status: 'in progress',
                ClientId: user1.id,
                ContractorId: user2.id,
            });

            const contract2 = await createContract({
                status: 'in progress',
                ClientId: user3.id,
                ContractorId: user2.id,
            });

            const contract3 = await createContract({
                status: 'terminated',
                ClientId: user1.id,
                ContractorId: user2.id,
            });

            const contract4 = await createContract({
                status: 'terminated',
                ClientId: user3.id,
                ContractorId: user2.id,
            });

            const response = await requester
                .get(`/contracts`)
                .set('profile_id', user1.id);
    
            response.status.should.equal(200);
            response.body.should.be.an('array').and.have.length(1);
            response.body.map(el => el.id).should.include(contract1.id)
                .and.not.include(contract2.id)
                .and.not.include(contract3.id)
                .and.not.include(contract4.id);
        });
    });
});