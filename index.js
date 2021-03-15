require('log-timestamp')(function () { return `[${new Date().toISOString()}] [mngr] %s` });
const { ShardingManager } = require('discord.js');
const path = require('path');
const fetch = require('node-fetch');
const url = require('url');
const users = require('./handlers/users.js');
const { connect, disconnect } = require('mongoose');

const GuildModel = require('./models/Guild');
const EventModel = require('./models/Event');
const UserModel = require('./models/User');

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
const ROUTE_TIMEZONESSET = "/timezones/set";
const ROUTE_EVENTS = "/events";
const ROUTE_EVENTSSET = "/events/set";

let app = express();

app.locals.pretty = true;
let server = app
    .set('views', Config.httpPugDir)
    .set('view engine', 'pug')
    .use(session({ secret: 'grant', saveUninitialized: true, resave: false, maxAge: Date.now() + (7 * 86400 * 1000) }))
    .use(grant)
    .use(ROUTE_ROOT, express.static(Config.httpStaticDir))
    .use(express.json())
    .use(async function (request, response, next) {
        console.log(`in middleware checking if I need to update guildID, guildID status: ${request.session.guildConfig ? true : false}`);
        const requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
        const guildID = requestUrl.searchParams.get('guildID');
        if (guildID) {
            if (!request.session.guildConfig || request.session.guildConfig.guildID != guildID) {
                console.log(`Retrieving guild info for ${guildID}`);
                const guildConfig = await GuildModel.findOne({ guildID: guildID });
                if (guildConfig) {
                    request.session.guildConfig = guildConfig;
                }
            }
        } else if (!request.session.guildConfig && request.session.discordMe) {
            console.log(`Retrieving any guild for user, ${request.session.discordMe.id}`);
            const userConfig = await UserModel.findOne({ userID: request.session.discordMe.id });
            const guildConfig = await GuildModel.findOne({ guildID: userConfig.guildID });
            if (guildConfig) {
                request.session.guildConfig = guildConfig;
            }
        } else {
            console.log(`Don't need to (or can't) retrieve a guild ...`);
        }
        next();
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
    .get(ROUTE_ROOT, function (request, response) {
        response.render('index', { title: 'Home', Config: Config, discordMe: request.session.discordMe });
    })
    .get(ROUTE_CALENDAR, async (request, response) => {
        try {
            console.log('serving ' + ROUTE_CALENDAR);
            const requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            let userID = requestUrl.searchParams.get('userID');
            const excludeGuild = requestUrl.searchParams.get('exclude') ? requestUrl.searchParams.get('exclude').split(',') : [];
            if (!userID && request.session.discordMe) {
                // console.log(`have discordMe, setting userID`);
                userID = request.session.discordMe.id;
            }
            if (!userID) {
                // console.log(`don't have userID, redirecting to discord to login`);
                request.query.destination = ROUTE_CALENDAR;
                response.redirect(url.format({
                    pathname: grant.config.discord.prefix + "/discord",
                    query: request.query,
                }));
            } else {
                // console.log(`have userid, heading to handleCalendarRequest`);
                let responseContent = await calendar.handleCalendarRequest(userID, excludeGuild);
                response.setHeader('Content-Type', 'text/calendar');
                response.end(responseContent);
            }
        } catch (error) {
            console.error(error.message);
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    // all routes past this point require authentication
    .use(async function (request, response, next) {
        const desiredDestination = request.path;
        console.log(`in middleware, ensuring user is logged in for ${desiredDestination}`);
        // console.log('desiredDestination ' + desiredDestination);
        if (!request.session.discordMe) {
            console.log(`user is _not_ logged in, redirecting`);
            request.query.destination = desiredDestination;
            response.redirect(url.format({
                pathname: grant.config.discord.prefix + "/discord",
                query: request.query,
            }));
        } else {
            console.log(`${request.session.discordMe.username} user is logged in`);
            next();
        }
    })
    .get(ROUTE_TIMEZONESSET, async function (request, response) {
        try {
            console.log('serving ' + ROUTE_TIMEZONESSET);
            if (request.session.guildConfig) {
                console.log('we know the guild so we can set the timezone for user.');
                let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
                // console.log(request.session.discordMe);
                // console.log(requestUrl);
                let status = await users.handleWebTimezone(
                    request.session.discordMe.id,
                    request.session.grant.dynamic.channel,
                    requestUrl.searchParams.get('timezone'),
                    request.session.guildConfig);
                response.json({ status: status });
            } else {
                console.log(`we don't know the guild so we will error and let the user copy/paste`);
                response.json({ status: 'false' });
            }
        } catch (error) {
            console.error(error.message);
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.json({ status: 'false' });
        }
    })
    .get(ROUTE_TIMEZONES, function (request, response) {
        try {
            console.log('serving ' + ROUTE_TIMEZONES);
            let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            // console.log(request.session.discordMe);
            let responseData = timezones.handleTimezonesDataRequest(requestUrl);
            response.render('timezones', { title: 'Timezones', timezoneData: responseData, Config: Config, guildConfig: request.session.guildConfig, discordMe: request.session.discordMe })
        } catch (error) {
            console.error(error.message);
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    .get(ROUTE_EVENTS, async function (request, response) {
        try {
            console.log('serving ' + ROUTE_EVENTS);
            let requestUrl = new URL(request.url, `${request.protocol}://${request.headers.host}`);
            // console.log(request.session.discordMe);
            let eventID = requestUrl.searchParams.get('eventID');
            let event = await EventModel.findById(eventID);
            if (event && event.userID != request.session.discordMe.id) {
                console.log(`event is not owned by current user, dereferencing`);
                event = undefined;
            }
            let userConfig = await UserModel.findOne({userID: request.session.discordMe.id, guildID: request.session.guildConfig.guildID});
            // console.log(userConfig);
            response.render('events', { title: 'Events', event: event, Config: Config, guildConfig: request.session.guildConfig, discordMe: request.session.discordMe, userConfig: userConfig })
        } catch (error) {
            console.error(error.message);
            response.setHeader('Content-Type', 'text/html');
            response.status(500);
            response.end(error.message);
        }
    })
    .post(ROUTE_EVENTSSET, async (request, response) => {
        try {
            console.log('serving ' + ROUTE_EVENTSSET);
            console.log(request.body);
            response.json({ status: 'false' });
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