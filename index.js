const { ShardingManager } = require('discord.js');
const path = require('path');
const DEFAULT_CONFIGDIR = __dirname;
const Config = require(path.resolve(process.env.CONFIGDIR || DEFAULT_CONFIGDIR, './config.json'));
const manager = new ShardingManager('./bot.js', { token: Config.token });

manager.on('shardCreate', shard => console.log(`Launched shard ${shard.id}`));
manager.spawn();
