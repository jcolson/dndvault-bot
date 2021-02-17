require('log-timestamp')(function () { return `[${new Date().toISOString()}] [mngr] %s` });
const { ShardingManager } = require('discord.js');
const path = require('path');
const { promisify } = require('util')
const { connect, disconnect } = require('mongoose');

const DEFAULT_CONFIGDIR = __dirname;
global.Config = require(path.resolve(process.env.CONFIGDIR || DEFAULT_CONFIGDIR, './config.json'));

const timezones = require('./handlers/timezones.js');
const calendar = require('./handlers/calendar.js');

const express = require('express');
const session = require('express-session');
const Grant = require('grant').express();
const grant = new Grant(Config);

// const grant = require('grant').express();

let shutdown = false;

/**
 * connect to the mongodb
 */
(async () => {
    console.log('mongo user: %s ... connecting', Config.mongoUser);
    await connect('mongodb://' + Config.mongoUser + ':' + Config.mongoPass + '@' + Config.mongoServer + ':' + Config.mongoPort + '/' + Config.mongoSchema + '?authSource=' + Config.mongoSchema, {
        useNewUrlParser: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
        useCreateIndex: true
    });
    console.log('Manager connected to mongo.');
})();

/**
 * invoke shardingmanager
 */
const manager = new ShardingManager('./bot.js', { token: Config.token, respawn: false });

manager.on('shardCreate', (shard) => {
    console.log(`===== Launched shard ${shard.id} =====`);
    shard.on('death', (process) => {
        console.log(`===== Shard ${shard.id} died with exitcode ${process.exitCode}; shutdown status is ${shutdown} =====`);
        if (!shutdown) {
            console.error(`Shard ${shard.id} should not have shutdown, something is awry, shutting down server completely.`);
            cleanShutdown(true);
        }
    });
});
manager.spawn();

let server = express()
    .use(session({ secret: 'grant', saveUninitialized: true, resave: false, maxAge: Date.now() + (7 * 86400 * 1000) }))
    .use(grant)
    .use('/', express.static(Config.httpStaticDir))
    .get('/timezones', async (request, response) => {
        try {
            let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            if (!request.session.grant || !request.session.grant.response) {
                // console.log('grant config', grant.config.discord.prefix);
                response.redirect(grant.config.discord.prefix + "/discord");
            } else {
                // console.log(`oauth2 grant response info`, request.session.grant);
                // response.end(JSON.stringify(req.session.grant.response, null, 2));

                let responseContent = await timezones.handleTimezonesRequest(requestUrl);
                response.setHeader('Content-Type', 'text/html');
                response.end(responseContent);
            }
        } catch (error) {
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    .get('/calendar', async (request, response) => {
        try {
            let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            let responseContent = await calendar.handleCalendarRequest(requestUrl);
            response.setHeader('Content-Type', 'text/calendar');
            response.end(responseContent);
        } catch (error) {
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    .listen(Config.httpServerPort);

console.log('http server listening on: %s', Config.httpServerPort);
// process.on('exit', () => {
//     console.info('exit signal received.');
//     cleanShutdown(false);
// });

process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received.');
    await cleanShutdown(true);
});

process.on('SIGINT', async () => {
    console.info('SIGINT signal received.');
    await cleanShutdown(true);
});

process.on('SIGUSR1', async () => {
    console.info('SIGUSR1 signal received.');
    await cleanShutdown(true);
});

process.on('SIGUSR2', async () => {
    console.info('SIGUSR2 signal received.');
    await cleanShutdown(true);
});

process.on('uncaughtException', async (error) => {
    console.info('uncaughtException signal received.', error);
    await cleanShutdown(true);
});

/**
 *
 * @param {boolean} callProcessExit
 */
async function cleanShutdown(callProcessExit) {
    shutdown = true;
    try {
        console.log('Closing out manager resources...');
        await server.close();
        console.log('Http server closed.');
        for ([number, shard] of manager.shards) {
            if (manager.mode == 'process') {
                let count = 0;
                while (shard.process && shard.process.exitCode === null) {
                    if (++count > 5) {
                        shard.kill();
                    }
                    console.log(`awaiting shard ${number} to exit`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // } else if (manager.mode == 'worker') {
            } else {
                console.error(`unknown sharding manager mode: ${manager.mode}`);
            }
        }
        console.log('All shards shutdown.');
        await disconnect();
        console.log('MongoDb connection closed.');
    } catch (error) {
        console.error("caught error shutting down shardmanager", error);
    }
    if (callProcessExit) {
        console.log('Exiting.');
        process.exit(0);
    }
}