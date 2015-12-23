var expect = require('chai').expect;
var http = require('http');
var Proxy = require('../lib/proxy');
var supertest = require('supertest')

describe('proxy', function() {
    it('should pass remote user', function(done) {
        var backend = http.createServer();

        backend.on('request', function(req, res) {
            expect(req.headers).to.have.property('x-remote-user');
            expect(req.headers['x-remote-user']).to.equal('username');
            backend.close();
            done();
        });
        backend.on('error', function(err) {
            backend.close();
            done(err);
        });
        backend.listen(8080, function() {

            var proxy = new Proxy('localhost', 8080);
            var protagonist = proxy.middleware();

            var frontend = http.createServer(
                function(req, res, next) {
                    req.username = 'username';
                    return protagonist(req, res, next);
                });
            supertest(frontend).get('/foo')
            .expect(200)
            .then(function(res) {
                // Just to provoke call
            });

        });
    })
})
