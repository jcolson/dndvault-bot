/**
 * credit for insults to:
 * https://github.com/davidawad/insult-generator/blob/master/insults.yml
 */

const utils = require('../utils/utils.js');

const COLUMN_1 = ['artless',
    'bawdy',
    'beslubbering',
    'bootless',
    'churlish',
    'cockered',
    'cockered',
    'cockered',
    'clouted',
    'craven',
    'currish',
    'dankish',
    'dissembling',
    'droning',
    'errant',
    'fawning',
    'fobbing',
    'froward',
    'frothy',
    'gleeking',
    'goatish',
    'gorbellied',
    'gorbellied',
    'impertinent',
    'infectious',
    'jarring',
    'loggerheaded',
    'lumpish',
    'mammering',
    'mangled',
    'mewling',
    'paunchy',
    'pribbling',
    'puking',
    'puny',
    'qualling',
    'rank',
    'reeky',
    'roguish',
    'ruttish',
    'saucy',
    'spleeny',
    'spongy',
    'surly',
    'tottering',
    'unmuzzled',
    'vain',
    'venomed',
    'villainous',
    'warped',
    'wayward',
    'weedy',
    'yeasty'
];

const COLUMN_2 = [
    'base-court',
    'bat-fowling',
    'beef-witted',
    'beetle-headed',
    'boil-brained',
    'clapper-clawed',
    'clay-brained',
    'common-kissing',
    'crook-pated',
    'dismal-dreaming',
    'dizzy-eyed',
    'doghearted',
    'dread-bolted',
    'earth-vexing',
    'elf-skinned',
    'fat-kidneyed',
    'fen-sucked',
    'flap-mouthed',
    'fly-bitten',
    'folly-fallen',
    'fool-born',
    'full-gorged',
    'guts-griping',
    'half-faced',
    'hasty-witted',
    'hedge-born',
    'hell-hated',
    'idle-headed',
    'ill-breeding',
    'ill-nurtured',
    'knotty-pated',
    'milk-livered',
    'motley-minded',
    'onion-eyed',
    'plume-plucked',
    'pottle-deep',
    'pox-marked',
    'reeling-ripe',
    'rough-hewn',
    'rude-growing',
    'rump-fed',
    'shard-borne',
    'sheep-biting',
    'spur-galled',
    'swag-bellied',
    'tardy-gaited',
    'tickle-brained',
    'toad-spotted',
    'unchin-snouted',
    'weather-bitten'
];

const COLUMN_3 = [
    'apple-john',
    'baggage',
    'barnacle',
    'bladder',
    'boar-pig',
    'bugbear',
    'bum-bailey',
    'canker-blossom',
    'clack-dish',
    'clotpole',
    'coxcomb',
    'codpiece',
    'death-token',
    'dewberry',
    'flap-dragon',
    'flax-wench',
    'flirt-gill',
    'foot-licker',
    'fustilarian',
    'giglet',
    'gudgeon',
    'haggard',
    'harpy',
    'hedge-pig',
    'horn-beast',
    'hugger-mugger',
    'joithead',
    'lewdster',
    'lout',
    'maggot-pie',
    'malt-worm',
    'mammet',
    'measle',
    'minnow',
    'miscreant',
    'moldwarp',
    'mumble-news',
    'nut-hook',
    'pigeon-egg',
    'pignut',
    'puttock',
    'pumpion',
    'ratsbane',
    'scut',
    'skainsmate',
    'strumpet',
    'varlot',
    'vassal',
    'whey-face',
    'wagtail'
];

/**
 * Generate a random insult for Vicious Mockery
 * @param {Message} msg
 * @param {Array} msgParms
 * @param {GuildModel} guildConfig
 */
async function handleInsult(msg, msgParms, guildConfig) {
    try {
        const insult = generateRandomInsult();
        await utils.sendDirectOrFallbackToChannel(
            [{ name: 'Vicious Mockery Suggestion', value: `${insult}` }],
            msg);
            if (msg.deletable) {
                try {
                    await msg.delete();
                } catch (error) {
                    console.error(`Could not delete ${msg.id}`, error);
                }
            }
    } catch (error) {
        console.error("handleConfig:", error);
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function generateRandomInsult() {
    const randCol1 = Math.floor(Math.random() * COLUMN_1.length);
    const randCol2 = Math.floor(Math.random() * COLUMN_2.length);
    const randCol3 = Math.floor(Math.random() * COLUMN_3.length);
    console.debug(`random numbers: ${randCol1}, ${randCol2}, ${randCol3}`);
    return `Thou ${COLUMN_1[randCol1]} ${COLUMN_2[randCol2]} ${COLUMN_3[randCol3]}!`;
}

exports.handleInsult = handleInsult;

exports.testables = {
    generateRandomInsult: generateRandomInsult
}
