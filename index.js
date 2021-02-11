require('log-timestamp')(function () { return `[${new Date().toISOString()}] [mngr] %s` });
const { ShardingManager } = require('discord.js');
const path = require('path');
const DEFAULT_CONFIGDIR = __dirname;
const Config = require(path.resolve(process.env.CONFIGDIR || DEFAULT_CONFIGDIR, './config.json'));
const manager = new ShardingManager('./bot.js', { token: Config.token, respawn: false });
const http = require('http');

const timezones = require('./handlers/timezones.js');
const calendar = require('./handlers/calendar.js');

let shutdown = false;

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

/**
 * http server used for calendar ics feeds and timezone lookups
 */
const server = http.createServer();

server.on('request', async (request, response) => {
    request.on('error', (error) => {
        console.error(error);
        response.statusCode = 400;
        response.end("400");
    });

    response.on('error', (error) => {
        console.error(error);
    });

    let requestUrl = new URL(request.url, `http://${request.headers.host}`);
    let body = [];

    request.on('data', async (chunk) => {
        body.push(chunk);
    });

    request.on('end', async () => {
        try {
            body = Buffer.concat(body).toString();
            // console.log('body: ' + body);
            if (request.method === 'GET' && requestUrl.pathname === '/calendar') {
                let responseContent = await calendar.handleCalendarRequest(requestUrl);
                response.setHeader('Content-Type', 'text/calendar');
                response.end(responseContent);
            } else if (request.method === 'GET' && requestUrl.pathname === '/timezones') {
                let responseContent = await timezones.handleTimezonesRequest(requestUrl);
                response.setHeader('Content-Type', 'text/html');
                response.end(responseContent);
            } else {
                console.error('404 request: ' + request.url);
                response.setHeader('Content-Type', 'text/html');
                response.statusCode = 404;
                response.end("404");
            }
        } catch (error) {
            console.error('400 request: ', error);
            response.setHeader('Content-Type', 'text/html');
            response.statusCode = 400;
            response.end("400");
        }
    });
});

server.listen(Config.httpServerPort);
console.log('ics http server listening on: %s', Config.httpServerPort);

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
                while (shard.process && shard.process.exitCode === null) {
                    console.log(`awaiting shard ${number} to exit`);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // } else if (manager.mode == 'worker') {
            } else {
                console.error(`unknown sharding manager mode: ${manager.mode}`);
            }
        }
    } catch (error) {
        console.error("caught error shutting down shardmanager", error);
    }
    if (callProcessExit) {
        console.log('Exiting.');
        process.exit(0);
    }
}