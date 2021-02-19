require('log-timestamp')(function () { return `[${new Date().toISOString()}] [mngr] %s` });
const { ShardingManager } = require('discord.js');
const path = require('path');
const fetch = require('node-fetch');
const url = require('url');
const GuildModel = require('./models/Guild');
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

const ROUTE_ROOT = "/";
const ROUTE_POSTOAUTH = "/postoauth";
const ROUTE_CALENDAR = "/calendar";
const ROUTE_TIMEZONES = "/timezones";

let app = express();

app.locals.pretty = true;
let server = app
    .set('views', Config.httpPugDir)
    .set('view engine', 'pug')
    .use(session({ secret: 'grant', saveUninitialized: true, resave: false, maxAge: Date.now() + (7 * 86400 * 1000) }))
    .use(grant)
    .use(ROUTE_ROOT, express.static(Config.httpStaticDir))
    .get(ROUTE_ROOT, function (request, response) {
        response.render('index', { title: 'Home', Config: Config, discordMe: request.session.discordMe })
    })
    .get(ROUTE_TIMEZONES, function (request, response) {
        try {
            console.log('serving ' + ROUTE_TIMEZONES);
            if (!request.session.discordMe) {
                request.query.destination = ROUTE_TIMEZONES;
                response.redirect(url.format({
                    pathname: grant.config.discord.prefix + "/discord",
                    query: request.query,
                }));
            } else {
                let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
                // console.log(request.session.discordMe);
                let responseData = timezones.handleTimezonesDataRequest(requestUrl);
                response.render('timezones', { title: 'Timezones', timezoneData: responseData, Config: Config, guildConfig: request.session.guildConfig, discordMe: request.session.discordMe })
            }
        } catch (error) {
            console.error(error.message);
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    .get(ROUTE_POSTOAUTH, async (request, response) => {
        try {
            console.log('serving ' + ROUTE_POSTOAUTH);
            // let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            if (!request.session.grant || !request.session.grant.response || !request.session.grant.response.raw) {
                // console.log('grant config', grant.config);
                response.redirect(grant.config.discord.prefix + "/discord");
            } else if (request.session.grant.response.error) {
                throw new Error(`Discord API error: ${request.session.grant.response.error.error}`);
            } else {
                // console.log(`oauth2 grant response info`, request.session.grant);
                if (!request.session.discordMe) {
                    console.log('Making discord.com/api/users/@me call');
                    let discordMeResponse = await fetch('https://discord.com/api/users/@me', {
                        headers: {
                            authorization: `${request.session.grant.response.raw.token_type} ${request.session.grant.response.access_token}`,
                        },
                    });
                    let discordMe = await discordMeResponse.json();
                    if (discordMeResponse.status != 200 || discordMe.error) {
                        throw new Error(`Discord response code; ${discordMeResponse.status} Discord API error: ${discordMe.error}`);
                    };
                    request.session.discordMe = discordMe;
                }
                if (!request.session.guildConfig) {
                    console.log(`Retrieving guild info for ${request.session.grant.dynamic.guildID}`);
                    if (request.session.grant.dynamic.guildID) {
                        let guildConfig = await GuildModel.findOne({ guildID: request.session.grant.dynamic.guildID });
                        request.session.guildConfig = guildConfig;
                    }
                }
                console.log(`redirect to actual page requested ${request.session.grant.dynamic.destination}`);
                response.redirect(url.format({
                    pathname: request.session.grant.dynamic.destination,
                    query: request.session.grant.dynamic,
                }));
            }
        } catch (error) {
            console.error(error.message);
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    .get(ROUTE_CALENDAR, async (request, response) => {
        try {
            console.log('serving ' + ROUTE_CALENDAR);
            let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            let responseContent = await calendar.handleCalendarRequest(requestUrl);
            response.setHeader('Content-Type', 'text/calendar');
            response.end(responseContent);
        } catch (error) {
            console.error(error.message);
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