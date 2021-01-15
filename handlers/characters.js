
const { Client, MessageEmbed, Role } = require('discord.js');
const fetch = require('node-fetch');
const CharModel = require('../models/Character');
const UserModel = require('../models/User');
const users = require('../handlers/users.js');
const utils = require('../utils/utils.js');
const { Types, Mongoose } = require('mongoose');

const StatLookup = { 1: 'Strength', 2: 'Dexterity', 3: 'Constitution', 4: 'Intelligence', 5: 'Wisdom', 6: 'Charisma' };
const SkillLookup = {
    '3': 'acrobatics', '11': 'animalHandling', '6': 'arcana', '2': 'athletics', '16': 'deception', '7': 'history',
    '12': 'insight', '17': 'intimidation', '8': 'investigation', '13': 'medicine', '9': 'nature', '14': 'perception',
    '18': 'performance', '19': 'persuasion', '10': 'religion', '4': 'sleightOfHand', '5': 'stealth', '15': 'survival'
}
const RacialBonusLookup = {
    1: { 'Mountain Dwarf': 2, 'Dragonborn': 2, 'Half-Orc': 2, 'Human': 1 },
    2: { 'Elf': 2, 'Halfling': 2, 'Forest Gnome': 1, 'Human': 1 },
    3: { 'Dwarf': 2, 'Stout halfling': 1, 'Rock Gnome': 1, 'Half-Orc': 1, 'Human': 1 },
    4: { 'High Elf': 1, 'Gnome': 2, 'Tiefling': 1, 'Human': 1 },
    5: { 'Hill Dwarf': 1, 'Wood Elf': 1, 'Human': 1 },
    6: { 'Half-Elf': 2, 'Drow': 1, 'Lightfoot Halfling': 1, 'Dragonborn': 1, 'Tiefling': 2, 'Human': 1 }
};

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRegister(msg, guildConfig) {
    try {
        const charID = parseCharIdFromURL(msg.content, 'register', guildConfig.prefix);
        const settings = { method: "Get" };
        let response = await fetch(Config.dndBeyondCharServiceUrl + charID, settings);
        let charJSON = await response.json();
        if (response.status != 200 || charJSON.success == false) {
            throw new Error('Sorry, that URL or dndbeyond-id contains no character data');
        };
        let charData = Object.assign({}, charJSON.data);
        const req = await CharModel.findOne({ id: charData.id, isUpdate: false, guildID: msg.guild.id });
        if (req) {
            // console.log(req);
            throw new Error('Sorry, this character has already been registered, use `update` command instead.');
        }
        let char = new CharModel(charData);
        char.guildUser = msg.member.id;
        char.guildID = msg.guild.id;
        if (guildConfig.requireCharacterApproval) {
            char.approvalStatus = false;
        } else {
            char.approvalStatus = true;
            char.approvedBy = msg.guild.me.id;
        }
        await char.save();
        await utils.sendDirectOrFallbackToChannel({ name: 'Register', value: `<@${msg.member.id}>, ${char.name} / ${char.race.fullName} / ${char.classes[0].definition.name} is now registered` }, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * create a stub character with params [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN}
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRegisterManual(msg, guildConfig) {
    try {
        const parameters = msg.content.substring((guildConfig.prefix + 'register manual').length + 1);
        const paramArray = parameters.split(' ');
        if (paramArray.length < 4) {
            throw new Error('Not enough parameters passed.');
        }
        let char = new CharModel();
        char.id = Types.ObjectId();
        char.name = paramArray[0];
        char.classes = [];
        char.classes[0] = { definition: { name: paramArray[1] }, level: paramArray[2] };
        char.race.fullName = paramArray[3];
        if (paramArray.length > 4) {
            char.campaignOverride = '';
            for (let i = 4; i < paramArray.length; i++) {
                char.campaignOverride += paramArray[i] + ' ';
            }
            char.campaignOverride = char.campaignOverride.substring(0, char.campaignOverride.length - 1);
        }
        char.guildUser = msg.member.id;
        char.guildID = msg.guild.id;
        if (guildConfig.requireCharacterApproval) {
            char.approvalStatus = false;
        } else {
            char.approvalStatus = true;
        }
        await char.save();
        await utils.sendDirectOrFallbackToChannel({ name: 'Register Manual', value: `<@${msg.member.id}>, ${char.name} / ${char.race.fullName} / ${char.classes[0].definition.name} is now registered` }, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * 
 * @param {String} commandStringWithURL 
 * @param {String} command 
 * @param {String} prefix 
 * @returns {String}
 */
function parseCharIdFromURL(commandStringWithURL, command, prefix) {
    let charID;
    try {
        const charURL = commandStringWithURL.substring((prefix + command).length + 1);
        console.log('char url: ' + charURL);
        let urlSplitArray = charURL.split('/');
        charID = urlSplitArray.pop();
        console.log('char id: "' + charID + '"');
        if (isNaN(charID) || isNaN(parseInt(charID))) {
            charID = urlSplitArray.pop();
            console.log('char id: "' + charID + '"');
            if (isNaN(charID) || isNaN(parseInt(charID))) {
                throw new Error("Invalid URL passed for your registration, it needs to be a dndbeyond character URL.");
            }
        }
    } catch (error) {
        throw new Error('Could not locate character id in url');
    }
    return charID;
}

/**
 * Parse the incoming url for the character id and then use
 * https://character-service.dndbeyond.com/character/v3/character/xxxxxx
 * to retrieve the json
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleUpdate(msg, guildConfig) {
    try {
        const charID = parseCharIdFromURL(msg.content, 'update', guildConfig.prefix);
        const settings = { method: "Get" };
        let response = await fetch(Config.dndBeyondCharServiceUrl + charID, settings);
        let charJSON = await response.json();
        if (response.status != 200 || charJSON.success == false) {
            throw new Error('Sorry, that URL or dndbeyond-id contains no character data');
        };
        let charData = Object.assign({}, charJSON.data);
        const checkRegisterStatus = await CharModel.findOne({ id: charData.id, isUpdate: false, guildID: msg.guild.id, guildUser: msg.member.id });
        if (!checkRegisterStatus) {
            throw new Error('Sorry, this character has not been registered and approved yet.  `register ' + charData.id + '` it first.');
        } else if (checkRegisterStatus.approvalStatus == false) {
            throw new Error('Sorry, this character is currently pending register approval.  `remove ' + charData.id + '` and then re-register if you would like to replace the `register` request');
        }
        // charData.id = charData.id + '_update';
        const req = await CharModel.findOne({ id: charData.id, guildUser: msg.member.id, isUpdate: true, guildID: msg.guild.id });
        if (req) {
            throw new Error('Sorry, this character has already has an update pending.  `remove ' + charData.id + '` if you would like to replace the update request');
        }
        let char = checkRegisterStatus;
        if (guildConfig.requireCharacterApproval) {
            char = new CharModel(charData);
            char.approvalStatus = false;
            char.isUpdate = true;
            char.guildUser = msg.member.id;
            char.guildID = msg.guild.id;
            char.campaignOverride = checkRegisterStatus.campaignOverride;
            char.approvedBy = checkRegisterStatus.approvedBy;
        } else {
            char.overwrite(charData);
            char.approvalStatus = true;
            char.isUpdate = false;
            char.guildUser = msg.member.id;
            char.guildID = msg.guild.id;
            char.campaignOverride = checkRegisterStatus.campaignOverride;
            char.approvedBy = msg.guild.me.id;
        }
        await char.save();
        await utils.sendDirectOrFallbackToChannel({ name: 'Update', value: `<@${msg.member.id}>, ${stringForCharacter(char)} now has been updated.` }, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * update a stub character with params [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN}
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleUpdateManual(msg, guildConfig) {
    try {
        const parameters = msg.content.substring((guildConfig.prefix + 'update manual').length + 1);
        const paramArray = parameters.split(' ');
        if (paramArray.length < 5) {
            throw new Error('Not enough parameters passed.');
        }
        console.log('guildid %s, userid %s, id %s, isUpdate false', msg.guild.id, msg.member.id, paramArray[0]);
        let checkRegisterStatus = await CharModel.findOne({ guildID: msg.guild.id, guildUser: msg.member.id, id: paramArray[0], isUpdate: false });
        if (!checkRegisterStatus) {
            throw new Error('Sorry, this character has not been registered and approved yet.  `register` and `approve` it first.');
        } else if (checkRegisterStatus.approvalStatus == false) {
            throw new Error('Sorry, this character is currently pending register approval.  `remove ' + paramArray[0] + '` and then re-register if you would like to replace the `register` request');
        }
        const req = await CharModel.findOne({ id: paramArray[0], isUpdate: true, guildID: msg.guild.id, guildUser: msg.member.id });
        if (req) {
            throw new Error('Sorry, this character has already has an update pending.  `remove ' + paramArray[0] + '` if you would like to replace the update request');
        }
        let char = checkRegisterStatus;
        if (guildConfig.requireCharacterApproval) {
            char = new CharModel({
                id: paramArray[0],
                name: paramArray[1],
                classes: [{ definition: { name: paramArray[2] }, level: paramArray[3] }],
                "race.fullName": paramArray[4],
            });
            if (paramArray.length > 5) {
                char.campaignOverride = '';
                for (let i = 5; i < paramArray.length; i++) {
                    char.campaignOverride += paramArray[i] + ' ';
                }
                char.campaignOverride = char.campaignOverride.substring(0, char.campaignOverride.length - 1);
            }
            char.approvalStatus = false;
            char.isUpdate = true;
            char.guildUser = msg.member.id;
            char.guildID = msg.guild.id;
            char.campaignOverride = checkRegisterStatus.campaignOverride;
            char.approvedBy = checkRegisterStatus.approvedBy;
        } else {
            char.overwrite({
                id: paramArray[0],
                name: paramArray[1],
                classes: [{ definition: { name: paramArray[2] }, level: paramArray[3] }],
                "race.fullName": paramArray[4],
            });
            if (paramArray.length > 5) {
                char.campaignOverride = '';
                for (let i = 5; i < paramArray.length; i++) {
                    char.campaignOverride += paramArray[i] + ' ';
                }
                char.campaignOverride = char.campaignOverride.substring(0, char.campaignOverride.length - 1);
            }
            char.approvalStatus = true;
            char.isUpdate = false;
            char.guildUser = msg.member.id;
            char.guildID = msg.guild.id;
            char.campaignOverride = checkRegisterStatus.campaignOverride;
            char.approvedBy = msg.guild.me.id;
        }
        await char.save();
        await utils.sendDirectOrFallbackToChannel({ name: 'Update Manual', value: `<@${msg.member.id}>, ${stringForCharacter(char)} now has been updated.` }, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * Handler for displaying character changes
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleChanges(msg, guildConfig) {
    try {
        const charId = msg.content.substring((guildConfig.prefix + 'changes').length + 1);
        let updatedChar = await CharModel.findOne({ id: charId, guildID: msg.guild.id, approvalStatus: false });
        let approvedChar = await CharModel.findOne({ id: charId, guildID: msg.guild.id, approvalStatus: true });
        if (typeof updatedChar === 'undefined' || !updatedChar || typeof approvedChar === 'undefined' || !approvedChar) {
            await msg.channel.send(`<@${msg.member.id}>, an updated character for id "${charId}" could not be located.`);
            await msg.delete();
        } else {
            const changesEmbed = embedForChanges(msg, approvedChar, updatedChar);
            // console.log(changesEmbed);
            await utils.sendDirectOrFallbackToChannelEmbeds(changesEmbed, msg);
            await msg.delete();
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * Create a rich embedded message with all the character changes between two characters
 * @param {Message} msg 
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {MessageEmbed}
 */
function embedForChanges(msg, approvedChar, updatedChar) {
    const changesEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(`Review Changes for Character: ${approvedChar.name}`)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let changes = [];
    changes.push(utils.appendStringsForEmbedChanges(['CHAR FIELD', 'OLD VALUE', 'NEW VALUE']));
    let change = stringForNameChange(approvedChar, updatedChar);
    if (change) changes.push(change);
    change = stringForRaceChange(approvedChar, updatedChar);
    if (change) changes.push(change);
    changes = changes.concat(arrayForClassChange(approvedChar, updatedChar));
    changesEmbed.addFields({ name: 'Core Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    changes = arrayForAbilitiesChange(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Abilities Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForBackgroundModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Background Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForClassModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Class Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForConditionModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Condition Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForFeatModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Feat Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForItemModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Item Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForRaceModifiersChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Race Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForTraitsChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Traits Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForInventoryChanges(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Inventory Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    changes = arrayForCurrenciesChange(approvedChar, updatedChar);
    if (changes && changes.length > 0) {
        changesEmbed.addFields({ name: 'Currency Changes', value: trimAndElipsiseStringArray(changes, 1024) });
    }
    return changesEmbed;
}

function trimAndElipsiseStringArray(strArrayToTrim, totalFinalLength) {
    let elipses = '\n...';
    let buffer = elipses.length;
    totalFinalLength = totalFinalLength - buffer;
    let stringToReturn = strArrayToTrim.join('\n');
    while (stringToReturn.length >= totalFinalLength) {
        let lastIndex = stringToReturn.lastIndexOf('\n');
        if (lastIndex == -1) {
            stringToReturn = stringToReturn.substring(0, totalFinalLength - buffer) + elipses;
        } else {
            stringToReturn = stringToReturn.substring(0, lastIndex);
            if (stringToReturn.length <= totalFinalLength - buffer) {
                stringToReturn += elipses;
            }
        }
    }
    return stringToReturn;
}


/**
 * returns an array of currency changes between characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForCurrenciesChange(approvedChar, updatedChar) {
    let currenciesChanges = [];
    if (approvedChar.currencies.cp != updatedChar.currencies.cp) {
        currenciesChanges.push(utils.appendStringsForEmbedChanges(['CP', approvedChar.currencies.cp ? '' + approvedChar.currencies.cp : '0', updatedChar.currencies.cp ? '' + updatedChar.currencies.cp : '0']));
    }
    if (approvedChar.currencies.ep != updatedChar.currencies.ep) {
        currenciesChanges.push(utils.appendStringsForEmbedChanges(['EP', approvedChar.currencies.ep ? '' + approvedChar.currencies.ep : '0', updatedChar.currencies.ep ? '' + updatedChar.currencies.ep : '0']));
    }
    if (approvedChar.currencies.gp != updatedChar.currencies.gp) {
        currenciesChanges.push(utils.appendStringsForEmbedChanges(['GP', approvedChar.currencies.gp ? '' + approvedChar.currencies.gp : '0', updatedChar.currencies.gp ? '' + updatedChar.currencies.gp : '0']));
    }
    if (approvedChar.currencies.pp != updatedChar.currencies.pp) {
        currenciesChanges.push(utils.appendStringsForEmbedChanges(['PP', approvedChar.currencies.pp ? '' + approvedChar.currencies.pp : '0', updatedChar.currencies.pp ? '' + updatedChar.currencies.pp : '0']));
    }
    if (approvedChar.currencies.sp != updatedChar.currencies.sp) {
        currenciesChanges.push(utils.appendStringsForEmbedChanges(['SP', approvedChar.currencies.sp ? '' + approvedChar.currencies.sp : '0', updatedChar.currencies.sp ? '' + updatedChar.currencies.sp : '0']));
    }
    return currenciesChanges;
}

/**
 * returns an array of all the race modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForRaceModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.race, updatedChar.modifiers.race);
}

/**
 * returns an array of all the item modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForItemModifiersChanges(approvedChar, updatedChar) {
    // console.log(' app, upd: %j\n\n %j', approvedChar.modifiers.item, updatedChar.modifiers.item);
    return arrayForModifiersChanges(approvedChar.modifiers.item, updatedChar.modifiers.item);
}

/**
 * returns an array of all the feat modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForFeatModifiersChanges(approvedChar, updatedChar) {
    // console.log(' app, upd: %j, %j', approvedChar.modifiers.feat, updatedChar.modifiers.feat);
    return arrayForModifiersChanges(approvedChar.modifiers.feat, updatedChar.modifiers.feat);
}

/**
 * returns an array of all the condition modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForConditionModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.condition, updatedChar.modifiers.condition);
}

/**
 * returns an array of all the class modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForClassModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.class, updatedChar.modifiers.class);
}

/**
 * returns an array of all the background modifiers changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForBackgroundModifiersChanges(approvedChar, updatedChar) {
    return arrayForModifiersChanges(approvedChar.modifiers.background, updatedChar.modifiers.background);
}

/**
 * returns an array of all the modifier changes between two characters
 * @param {Array} approvedMod 
 * @param {Array} updatedMod 
 * @returns {Array}
 */
function arrayForModifiersChanges(approvedMod, updatedMod) {
    approvedMod = concatArrayOfArrays(approvedMod);
    updatedMod = concatArrayOfArrays(updatedMod);
    let modifiersChanges = [];
    // check to see if an array of arrays got passed somehow
    updatedMod.forEach((updTrait) => {
        let foundItem = false;
        approvedMod.forEach((appTrait) => {
            if (updTrait.id == appTrait.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('updated - did not find: ' + updTrait.id + ' | ' + updTrait.friendlySubtypeName + ' | ' + updTrait.friendlyTypeName);
            modifiersChanges.push(utils.appendStringsForEmbedChanges([updTrait.friendlySubtypeName, '', updTrait.friendlyTypeName + (updTrait.value ? '(' + updTrait.value + ')' : '')]));
        }

    });

    approvedMod.forEach((appTrait) => {
        let foundItem = false;
        updatedMod.forEach((updTrait) => {
            if (updTrait.id == appTrait.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('approved - did not find: ' + appTrait.id + ' | ' + appTrait.friendlySubtypeName + ' | ' + appTrait.friendlyTypeName);
            modifiersChanges.push(utils.appendStringsForEmbedChanges([appTrait.friendlySubtypeName, appTrait.friendlyTypeName + (appTrait.value ? '(' + appTrait.value + ')' : ''), '']));
        }
    });
    return modifiersChanges;
}

function concatArrayOfArrays(arrays) {
    let returnConcatArray = [];
    arrays.forEach((value) => {
        if (Array.isArray(value)) {
            returnConcatArray = returnConcatArray.concat(value);
        } else {
            returnConcatArray.push(value);
        }
    })
    return returnConcatArray;
}

/**
 * returns an array of all the racial traits changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForTraitsChanges(approvedChar, updatedChar) {
    let traitsChanges = [];
    updatedChar.race.racialTraits.forEach((updTrait) => {
        let foundItem = false;
        approvedChar.race.racialTraits.forEach((appTrait) => {
            if (updTrait.definition.id == appTrait.definition.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + updTrait.definition.name);
            traitsChanges.push(utils.appendStringsForEmbedChanges([updTrait.definition.snippet ? updTrait.definition.snippet : updTrait.definition.description, '', updTrait.definition.name]));
        }
    });
    approvedChar.race.racialTraits.forEach((appTrait) => {
        let foundItem = false;
        updatedChar.race.racialTraits.forEach((updTrait) => {
            if (updTrait.definition.id == appTrait.definition.id) {
                foundItem = true;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + appTrait.definition.name);
            traitsChanges.push(utils.appendStringsForEmbedChanges([appTrait.definition.snippet ? appTrait.definition.snippet : appTrait.definition.description, appTrait.definition.name, '']));
        }
    });
    return traitsChanges;
}

/**
 * returns an array of all the inventory changes between two characters
 * @param {CharModel} approvedChar 
 * @param {CharModel} updatedChar 
 * @returns {Array}
 */
function arrayForInventoryChanges(approvedChar, updatedChar) {
    let inventoryChanges = [];
    updatedChar.inventory.forEach((updInv) => {
        let foundItem = false;
        let wrongQty = 0;
        approvedChar.inventory.forEach((appInv) => {
            if (updInv.definition.id == appInv.definition.id && updInv.quantity == appInv.quantity) {
                foundItem = true;
            } else if (updInv.definition.id == appInv.definition.id && updInv.quantity != appInv.quantity) {
                wrongQty = appInv.quantity;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + updInv.definition.name);
            inventoryChanges.push(utils.appendStringsForEmbedChanges([updInv.definition.name, '' + wrongQty, '' + updInv.quantity]));
        }
    });
    approvedChar.inventory.forEach((appInv) => {
        let foundItem = false;
        let wrongQty = 0;
        updatedChar.inventory.forEach((updInv) => {
            if (updInv.definition.id == appInv.definition.id && updInv.quantity == appInv.quantity) {
                foundItem = true;
            } else if (updInv.definition.id == appInv.definition.id && updInv.quantity != appInv.quantity) {
                wrongQty = updInv.quantity;
            }
        });
        if (!foundItem) {
            // console.log('did not find: ' + appInv.definition.name);
            inventoryChanges.push(utils.appendStringsForEmbedChanges([appInv.definition.name, '' + appInv.quantity, '' + wrongQty]));
        }
    });
    return inventoryChanges;
}

function arrayForAbilitiesChange(approvedChar, updatedChar) {
    let abilitiesChanges = [];
    approvedChar.stats.forEach((approvedStat) => {
        updatedChar.stats.forEach((updatedStat) => {
            if (approvedStat.id == updatedStat.id) {
                if (approvedStat.value != updatedStat.value) {
                    // console.log('stat is different: ' + StatLookup[approvedStat.id] + ':' + approvedStat.value + '/' + updatedStat.value);
                    abilitiesChanges.push(utils.appendStringsForEmbedChanges([StatLookup[approvedStat.id], '' + approvedStat.value, '' + updatedStat.value]));
                }
            }
        })
    })
    return abilitiesChanges;
}

function arrayForClassChange(approvedChar, updatedChar) {
    let classChanges = [];
    let maxClassesLength = approvedChar.classes.length > updatedChar.classes.length ? approvedChar.classes.length : updatedChar.classes.length;
    for (let i = 0; i < maxClassesLength; i++) {
        // console.log('printing class: ' + stringForClass(approvedChar.classes[i]) + ' | ' + stringForClass(updatedChar.classes[i]));
        if (stringForClass(approvedChar.classes[i]) != stringForClass(updatedChar.classes[i])) {
            classChanges.push(utils.appendStringsForEmbedChanges(['Class', stringForClass(approvedChar.classes[i]), stringForClass(updatedChar.classes[i])]));
        }
    }
    return classChanges;
}

function stringForClass(charClass) {
    if (typeof charClass !== 'undefined' && charClass && charClass.definition) {
        return `${charClass.definition.name}(${charClass.level})` + (charClass.subclassDefinition ? '(' + charClass.subclassDefinition.name + ')' : '');
    } else {
        return '';
    }
}

function stringForClassShort(charClass) {
    if (typeof charClass !== 'undefined' && charClass && charClass.definition) {
        return `${charClass.definition.name}(${charClass.level})`;
    } else {
        return '';
    }
}

function stringForRaceChange(approvedChar, updatedChar) {
    if (approvedChar.race.fullName != updatedChar.race.fullName) {
        return utils.appendStringsForEmbedChanges(['Race', approvedChar.race.fullName, updatedChar.race.fullName]);
    }
}

function stringForNameChange(approvedChar, updatedChar) {
    if (approvedChar.name != updatedChar.name) {
        return utils.appendStringsForEmbedChanges(['Character Name', approvedChar.name, updatedChar.name]);
    }
}

/**
 * list all characters for the campaign requested
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleListCampaign(msg, guildConfig) {
    try {
        let campaignToList = msg.content.substring((guildConfig.prefix + 'list campaign').length + 1);
        let charArrayUpdates = await CharModel.find({ guildID: msg.guild.id, 'campaign.id': campaignToList, approvalStatus: false });

        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildID: msg.guild.id, 'campaign.id': campaignToList, approvalStatus: true, id: { $nin: notInIds } });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);

        notInIds = notInIds.concat(getIdsFromCharacterArray(charArrayNoUpdates));
        let charArrayOverrideUpdates = await CharModel.find({ guildID: msg.guild.id, campaignOverride: campaignToList, approvalStatus: false, id: { $nin: notInIds } });
        charArray = charArray.concat(charArrayOverrideUpdates);

        notInIds = notInIds.concat(getIdsFromCharacterArray(charArrayNoUpdates));
        let charArrayOverrideNoUpdates = await CharModel.find({ guildID: msg.guild.id, campaignOverride: campaignToList, approvalStatus: true, id: { $nin: notInIds } });
        charArray = charArray.concat(charArrayOverrideNoUpdates);

        if (charArray.length > 0) {
            const charEmbedArray = embedForCharacter(msg, charArray, `All Characters in campaign "${campaignToList}"`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
            await msg.delete();
        } else {
            throw new Error(`There are no registered characters for that campaign, \`register\` one!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

function getIdsFromCharacterArray(charArray) {
    let names = [];
    charArray.forEach((char) => {
        names.push(char.id);
    });
    return names;
}

async function handleListUser(msg, guildConfig) {
    try {
        let userToList = msg.content.substring((guildConfig.prefix + 'list user').length + 1);
        userToList = userToList.substring(3, userToList.length - 1);
        let memberToList = await msg.guild.members.fetch(userToList);
        let charArrayUpdates = await CharModel.find({ guildUser: userToList, guildID: msg.guild.id, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildUser: userToList, guildID: msg.guild.id, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            const charEmbedArray = embedForCharacter(msg, charArray, `All Characters for ${memberToList.displayName} in the Vault`, false);
            await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
            await msg.delete();
        } else {
            throw new Error(`I don't see any registered characters for ${userToList}`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * returns the MessageEmbed(s) for an array of characters passed
 * 
 * @param {Message} msg
 * @param {CharModel[]} charArray
 * @param {String} title
 * @param {Boolean} isShow
 * @param {UserModel} vaultUser
 * 
 * @returns {MessageEmbed[]}
 */
function embedForCharacter(msg, charArray, title, isShow, vaultUser) {
    let returnEmbeds = [];
    // return 3 characters for show and 8 characters for a list
    let charPerEmbed = isShow ? 3 : 8;
    let charEmbed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(title)
        // .setURL('https://discord.js.org/')
        .setAuthor('DND Vault', Config.dndVaultIcon, 'https://github.com/jcolson/dndvault-bot')
        // .setDescription(description)
        .setThumbnail(msg.guild.iconURL());
    let i = 0;
    charArray.forEach((char) => {
        if (i++ >= charPerEmbed) {
            returnEmbeds.push(charEmbed);
            charEmbed = new MessageEmbed()
                .setColor('#0099ff');
            i = 0;
        }
        // console.log('vaultuser', vaultUser);
        let defCharString = (vaultUser && vaultUser.defaultCharacter && vaultUser.defaultCharacter == char.id) ? `\:asterisk: ` : '';
        // console.log('defCharString "%s" and "%s"', defCharString, char.id);
        charEmbed.addFields(
            {
                name: `\:dagger: Name | ID | Status | Campaign \:shield:`,
                value: `${defCharString}[${char.name}](${char.readonlyUrl}) | ${char.id} | 
                    ${stringForApprovalsAndUpdates(char)} | ${stringForCampaign(char)}`
            }
        );
        // let campaignString = stringForCampaign(char);
        // if (campaignString) {
        //     charEmbed.addFields({ name: 'Campaign', value: campaignString, inline: true });
        // }
        if (isShow) {
            charEmbed.addFields(
                { name: 'User', value: `<@${char.guildUser}>`, inline: true },
                { name: 'Race', value: `[${char.race.fullName}](${Config.dndBeyondUrl}${char.race.moreDetailsUrl})`, inline: true },
                {
                    name: 'Class', value: char.classes.length > 0 ? stringForClass(char.classes[0]) :
                        // `[${char.classes[0].definition.name}](${Config.dndBeyondUrl}${char.classes[0].definition.moreDetailsUrl})` :
                        '?', inline: true
                },
                { name: 'Attributes*', value: stringForStats(char), inline: true }
            );
        }
    });
    charEmbed.addFields(
        { name: '\u200B', value: `Add this BOT to your server. [Click here](${Config.inviteURL})` },
    );
    returnEmbeds.push(charEmbed);
    return returnEmbeds;
}

function stringForCharacter(char) {
    let classes = '';
    char.classes.forEach((theClass) => {
        classes += stringForClass(theClass);
    });
    return `${char.name} / ${char.race.fullName} / ${classes}`;
}

function stringForCharacterShort(char) {
    let classes = '';
    char.classes.forEach((theClass) => {
        classes += stringForClassShort(theClass);
    });
    return `${char.name} the ${classes}`;
}

function stringForCampaign(char) {
    const dndCampaign = (char.campaign && char.campaign.name
        ? `DDB: [${char.campaign.name}](${Config.dndBeyondUrl}/campaigns/${char.campaign.id}) (${char.campaign.id})`
        : undefined);
    let returnCampaign = 'No Campaign Set';
    if (dndCampaign && char.campaignOverride) {
        returnCampaign = char.campaignOverride + '\n' + dndCampaign;
    } else if (char.campaignOverride) {
        returnCampaign = char.campaignOverride;
    } else if (dndCampaign) {
        returnCampaign = dndCampaign;
    }
    return returnCampaign;
}

/**
 * 
 * @param {CharModel} char 
 */
function stringForStats(char) {
    if (char.stats.length < 1) {
        return "N/A";
    }
    let charStatsString = '';
    char.stats.forEach((stat) => {
        let bonus = RacialBonusLookup[stat.id][char.race.baseRaceName] ? RacialBonusLookup[stat.id][char.race.baseRaceName] : 0;
        bonus += RacialBonusLookup[stat.id][char.race.fullName] ? RacialBonusLookup[stat.id][char.race.fullName] : 0;
        let indivStat = stat.value + bonus;
        let modifier = Math.floor((indivStat - 10) / 2);
        charStatsString = charStatsString + `${StatLookup[stat.id].substring(0, 3)}: ${indivStat}(${modifier}) | `;
    });
    return charStatsString.substring(0, charStatsString.length - 3);
}

/**
 * Return a string describing the current state of the character
 * @param {CharModel} char 
 * @returns {String}
 */
function stringForApprovalsAndUpdates(char) {
    if (char.approvalStatus && char.isUpdate) {
        return '`Invalid Status`';
    } else if (!char.approvalStatus && char.isUpdate) {
        return "`Update Pending Approval`";
    } else if (char.approvalStatus && !char.isUpdate) {
        return `Approved by <@${char.approvedBy}> `;
    } else if (!char.approvalStatus && !char.isUpdate) {
        return "`Register Pending Approval`";
    }
}

async function handleListAll(msg, guildConfig) {
    try {
        let charArrayUpdates = await CharModel.find({ guildID: msg.guild.id, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildID: msg.guild.id, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            const charEmbedArray = embedForCharacter(msg, charArray, 'All Characters in the Vault', false);
            await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
            await msg.delete();
        } else {
            throw new Error(`I don't see any registered characters \`register\` one!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleListQueued(msg, guildConfig) {
    try {
        const charArray = await CharModel.find({ guildID: msg.guild.id, approvalStatus: false });
        if (charArray.length > 0) {
            const charEmbedArray = embedForCharacter(msg, charArray, 'Characters pending approval');
            await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
            await msg.delete();
        } else {
            throw new Error(`I don't see any queued changes to characters awaiting approval right now ... go play some D&D!`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleList(msg, guildConfig) {
    try {
        let vaultUser = await UserModel.findOne({ guildID: msg.guild.id, userID: msg.member.id });
        // console.log('handlelist vaultuser', vaultUser);
        let charArrayUpdates = await CharModel.find({ guildUser: msg.member.id, guildID: msg.guild.id, isUpdate: true });
        let notInIds = getIdsFromCharacterArray(charArrayUpdates);
        let charArrayNoUpdates = await CharModel.find({ guildUser: msg.member.id, guildID: msg.guild.id, id: { $nin: notInIds }, isUpdate: false });
        let charArray = charArrayUpdates.concat(charArrayNoUpdates);
        if (charArray.length > 0) {
            const charEmbedArray = embedForCharacter(msg, charArray, `${msg.member.displayName}'s Characters in the Vault`, false, vaultUser);
            await utils.sendDirectOrFallbackToChannelEmbeds(charEmbedArray, msg);
            await msg.delete();
        } else {
            throw new Error(`There are no registered characters for you, \`register\` one`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleRemove(msg, guildConfig) {
    try {
        let typeOfRemoval = 'Character Update';
        const arguments = msg.content.substring((guildConfig.prefix + 'remove').length + 1);
        let charIdToDelete, forUser;
        let indexToSplit = arguments.indexOf(' ');
        if (indexToSplit != -1) {
            charIdToDelete = arguments.substring(0, indexToSplit);
            forUser = arguments.substring(indexToSplit + 4, arguments.length - 1);
        } else {
            charIdToDelete = arguments;
            forUser = msg.member.id;
        }
        console.log('about to remove charid %s for user %s', charIdToDelete, forUser);
        // we only want to remove one type of character, not every character (if there is an update pending).  so remove update, if it
        // doesn't exist, then remove the actual registered character
        let deleteResponse = await CharModel.deleteMany({ guildUser: forUser, id: charIdToDelete, guildID: msg.guild.id, isUpdate: true, approvalStatus: false });
        if (deleteResponse.deletedCount < 1) {
            typeOfRemoval = 'Unapproved Character';
            deleteResponse = await CharModel.deleteMany({ guildUser: forUser, id: charIdToDelete, guildID: msg.guild.id, isUpdate: false, approvalStatus: false });
            if (deleteResponse.deletedCount < 1) {
                typeOfRemoval = 'Approved Character';
                if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
                    deleteResponse = await CharModel.deleteMany({ guildUser: forUser, id: charIdToDelete, guildID: msg.guild.id, isUpdate: false, approvalStatus: true });
                } else {
                    msg.reply(`Please ask an <@&${guildConfig.arole}> to remove this character, as it has already been approved`);
                    return;
                }
            }
        }
        await utils.sendDirectOrFallbackToChannel({ name: 'Remove', value: `<@${msg.member.id}>, ${charIdToDelete} (${typeOfRemoval}) was removed (${deleteResponse.deletedCount} records) from vault.` }, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * 
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleApprove(msg, guildConfig) {
    try {
        if (await users.hasRoleOrIsAdmin(msg.member, guildConfig.arole)) {
            const charIdToApprove = msg.content.substr((guildConfig.prefix + 'approve').length + 1);
            // console.log('charid: ' + charIdToApprove);
            let charToApprove = await CharModel.findOne({ id: charIdToApprove, guildID: msg.guild.id, approvalStatus: false });
            if (typeof charToApprove === 'undefined' || !charToApprove) {
                await msg.channel.send(`<@${msg.member.id}>, an unapproved "${charIdToApprove}" could not be located.`);
                await msg.delete();
            } else {
                // console.log('char: ' + charToApprove);
                charToApprove.approvalStatus = true;
                charToApprove.approvedBy = msg.member.id;
                // if this is an update, then remove the original - this update will become the registered character
                if (charToApprove.isUpdate = true) {
                    charToApprove.isUpdate = false;
                    await CharModel.deleteMany({ id: charIdToApprove, guildID: msg.guild.id, isUpdate: false, approvalStatus: true });
                }
                await charToApprove.save();
                await utils.sendDirectOrFallbackToChannel({ name: 'Approve', value: `<@${msg.member.id}>, ${stringForCharacter(charToApprove)} was approved.` }, msg);
                await msg.delete();
            }
        } else {
            throw new Error(`please ask an \`approver role\` to approve.`);
        }
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * Show a character
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleShow(msg, guildConfig) {
    try {
        const charID = msg.content.substr((guildConfig.prefix + 'show').length + 1);
        const showUser = (await CharModel.find({ id: charID, guildID: msg.guild.id }).sort({ isUpdate: 'desc' }))[0];
        if (!showUser) {
            throw new Error(`That character (${charID}) doesn't exist`);
        }
        const embedsChar = embedForCharacter(msg, [showUser], 'Show Character', true);
        await utils.sendDirectOrFallbackToChannelEmbeds(embedsChar, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

/**
 * allow editing of campaign to override dndbeyond
 * @param {Message} msg 
 * @param {GuildModel} guildConfig 
 */
async function handleCampaign(msg, guildConfig) {
    try {
        const parameterString = msg.content.substr((guildConfig.prefix + 'campaign').length + 1);
        const charID = parameterString.substring(0, parameterString.indexOf(' '));
        const campaignID = parameterString.substring(parameterString.indexOf(' ') + 1);
        // console.log(`charid: ${charID} campaignID: ${campaignID}`);
        if (!charID || !campaignID) {
            throw new Error('Please pass the character id and the campaign id.');
        }
        const charToEdit = await CharModel.findOne({ guildUser: msg.member.id, id: charID, isUpdate: false, guildID: msg.guild.id });
        if (!charToEdit) {
            throw new Error(`No (approved) character (${charID}) found for your id.`);
        }
        charToEdit.campaignOverride = campaignID;
        await charToEdit.save();
        await utils.sendDirectOrFallbackToChannel({ name: 'Campaign', value: `Character ${charID} campaign changed to ${campaignID}` }, msg);
        await msg.delete();
    } catch (error) {
        await utils.sendDirectOrFallbackToChannelError(error, msg);
    }
}

exports.handleRegister = handleRegister;
exports.handleUpdate = handleUpdate;
exports.handleListCampaign = handleListCampaign;
exports.handleListUser = handleListUser;
exports.handleListAll = handleListAll;
exports.handleListQueued = handleListQueued;
exports.handleList = handleList;
exports.handleRemove = handleRemove;
exports.handleApprove = handleApprove;
exports.handleShow = handleShow;
exports.handleChanges = handleChanges;
exports.handleCampaign = handleCampaign;
exports.stringForCharacterShort = stringForCharacterShort;
exports.handleRegisterManual = handleRegisterManual;
exports.handleUpdateManual = handleUpdateManual;
