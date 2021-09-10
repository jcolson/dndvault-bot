const path = require('path');
global.Config = require(path.resolve(process.env.CONFIGDIR || __dirname, '../../config_example.json'));
const Character = require('../../models/Character.js');

test('Verify default Character constructor', () => {
    const character = new Character();

    console.log('character-->' + character);

    expect(character.apiVersion).toBe(Config.dndBeyondCharServiceUrl);

    expect(character.guildUser).toBe(undefined);

    expect(character.guildID).toBe(undefined);
    expect(character.id).toBe(undefined);
    expect(character.approvalStatus).toBe(false);
    expect(character.isUpdate).toBe(false);
    expect(character.campaignOverride).toBe(undefined);

    expect(character.approvedBy).toBe(undefined);
    expect(character.luckPoints).toBe(undefined);
    expect(character.treasurePoints).toBe(undefined);
    expect(character.readonlyUrl).toBe(undefined);
    expect(character.avatarUrl).toBe(undefined);

    expect(character.backdropAvatarUrl).toBe(undefined);
    expect(character.smallBackdropAvatarUrl).toBe(undefined);
    expect(character.largeBackdropAvatarUrl).toBe(undefined);
    expect(character.thumbnailBackdropAvatarUrl).toBe(undefined);

    //Check defaultBackdrop initial definition
    expect(typeof character.defaultBackdrop).not.toBe(undefined);
    expect(Object.entries(character.defaultBackdrop).length).toBe(4); //Subobject have not been initialized
    expect(character.defaultBackdrop.backdropAvatarUrl).toBe(undefined);
    expect(character.defaultBackdrop.smallBackdropAvatarUrl).toBe(undefined);
    expect(character.defaultBackdrop.largeBackdropAvatarUrl).toBe(undefined);
    expect(character.defaultBackdrop.thumbnailBackdropAvatarUrl).toBe(undefined);

    expect(character.avatarId).toBe(undefined);
    expect(character.frameAvatarId).toBe(undefined);
    expect(character.backdropAvatarId).toBe(undefined);
    expect(character.smallBackdropAvatarId).toBe(undefined);
    expect(character.largeBackdropAvatarId).toBe(undefined);
    expect(character.thumbnailBackdropAvatarId).toBe(undefined);
    expect(character.themeColorId).toBe(undefined);
    expect(character.themeColor).toBe(undefined);
    expect(character.name).toBe(undefined);
    expect(character.socialName).toBe(undefined);
    expect(character.gender).toBe(undefined);
    expect(character.faith).toBe(undefined);
    expect(character.age).toBe(undefined);
    expect(character.hair).toBe(undefined);
    expect(character.eyes).toBe(undefined);
    expect(character.skin).toBe(undefined);
    expect(character.height).toBe(undefined);
    expect(character.weight).toBe(undefined);
    expect(character.inspiration).toBe(undefined);
    expect(character.baseHitPoints).toBe(undefined);
    expect(character.bonusHitPoints).toBe(undefined);
    expect(character.overrideHitPoints).toBe(undefined);
    expect(character.removedHitPoints).toBe(undefined);
    expect(character.temporaryHitPoints).toBe(undefined);
    expect(character.currentXp).toBe(undefined);
    expect(character.alignmentId).toBe(undefined);
    expect(character.lifestyleId).toBe(undefined);

    expect(typeof character.stats).not.toBe(undefined);
    expect(Object.entries(character.stats).length).toBe(0); //Subobject have not been initialized

    expect(typeof character.bonusStats).not.toBe(undefined);
    expect(Object.entries(character.bonusStats).length).toBe(0); //Subobject have not been initialized

    expect(typeof character.overrideStats).not.toBe(undefined);
    expect(Object.entries(character.overrideStats).length).toBe(0); //Subobject have not been initialized

    expect(typeof character.background).not.toBe(undefined);
    expect(Object.entries(character.background).length).toBe(4); //Subobject have not been initialized

    expect(typeof character.background.customBackground).not.toBe(undefined);
    expect(Object.entries(character.background.customBackground).length).toBe(9); //Subobject have not been initialized
    expect(character.background.customBackground.backgroundType).toBe(undefined);
    expect(character.background.customBackground.characteristicsBackground).toBe(undefined);
    expect(character.background.customBackground.characteristicsBackgroundDefinitionId).toBe(undefined);
    expect(character.background.customBackground.description).toBe(undefined);
    expect(character.background.customBackground.entityTypeId).toBe(undefined);
    expect(character.background.customBackground.featuresBackground).toBe(undefined);
    expect(character.background.customBackground.featuresBackgroundDefinitionId).toBe(undefined);
    expect(character.background.customBackground.id).toBe(undefined);
    expect(character.background.customBackground.name).toBe(undefined);


    expect(typeof character.background.definition).not.toBe(undefined);
    expect(Object.entries(character.background.definition).length).toBe(28); //Subobject have not been initialized

    expect(character.background.definition.avatarUrl).toBe(undefined);

    expect(typeof character.background.definition.bonds).not.toBe(undefined);
    expect(Object.entries(character.background.definition.bonds).length).toBe(0);

    expect(character.background.definition.contractsDescription).toBe(undefined);
    expect(character.background.definition.description).toBe(undefined);
    expect(character.background.definition.entityTypeId).toBe(undefined);
    expect(character.background.definition.equipmentDescription).toBe(undefined);
    expect(character.background.definition.featureDescription).toBe(undefined);
    expect(character.background.definition.featureName).toBe(undefined);

    expect(typeof character.background.definition.flaws).not.toBe(undefined);
    expect(Object.entries(character.background.definition.flaws).length).toBe(0);

    expect(character.background.definition.id).toBe(undefined);

    expect(typeof character.background.definition.ideals).not.toBe(undefined);
    expect(Object.entries(character.background.definition.ideals).length).toBe(0);

    expect(character.background.definition.languagesDescription).toBe(undefined);
    expect(character.background.definition.largeAvatarUrl).toBe(undefined);
    expect(character.background.definition.name).toBe(undefined);
    expect(character.background.definition.organization).toBe(undefined);

    expect(typeof character.background.definition.personalityTraits).not.toBe(undefined);
    expect(Object.entries(character.background.definition.personalityTraits).length).toBe(0);

    expect(character.background.definition.shortDescription).toBe(undefined);
    expect(character.background.definition.skillProficienciesDescription).toBe(undefined);
    expect(character.background.definition.snippet).toBe(undefined);
    expect(character.background.definition.spellsPostDescription).toBe(undefined);
    expect(character.background.definition.spellsPreDescription).toBe(undefined);
    expect(character.background.definition.suggestedCharacteristicsDescription).toBe(undefined);
    expect(character.background.definition.suggestedLanguages).toBe(undefined);
    expect(character.background.definition.suggestedProficiencies).toBe(undefined);

    expect(character.background.definition.toolProficienciesDescription).toBe(undefined);
    expect(character.background.definition.isHomebrew).toBe(undefined);

    expect(typeof character.background.definition.sources).not.toBe(undefined);
    expect(Object.entries(character.background.definition.sources).length).toBe(0);

    expect(typeof character.background.definition.spellListIds).not.toBe(undefined);
    expect(Object.entries(character.background.definition.spellListIds).length).toBe(0);

    expect(character.background.definitionId).toBe(undefined);
    expect(character.background.hasCustomBackground).toBe(undefined);

    /////////////////////////

    //TODO: Complete if needed...

    /////////////////////////
    expect(typeof character.classSpells).not.toBe(undefined);
    expect(Object.entries(character.classSpells).length).toBe(0);

    expect(typeof character.customItems).not.toBe(undefined);
    expect(Object.entries(character.customItems).length).toBe(0);

    expect(typeof character.campaign).not.toBe(undefined);
    expect(Object.entries(character.campaign).length).toBe(8);

    expect(character.campaign.id).toBe(undefined);

    expect(typeof character.campaign.characters).not.toBe(undefined);
    expect(Object.entries(character.campaign.characters).length).toBe(0);

    expect(character.campaign.description).toBe(undefined);
    expect(character.campaign.dmUserId).toBe(undefined);
    expect(character.campaign.dmUsername).toBe(undefined);
    expect(character.campaign.link).toBe(undefined);
    expect(character.campaign.id).toBe(undefined);
    expect(character.campaign.name).toBe(undefined);
    expect(character.campaign.publicNotes).toBe(undefined);

    expect(character.background.hasCustomBackground).toBe(undefined);

    expect(typeof character.creatures).not.toBe(undefined);
    expect(Object.entries(character.creatures).length).toBe(0);

    expect(typeof character.optionalOrigins).not.toBe(undefined);
    expect(Object.entries(character.optionalOrigins).length).toBe(0);

    expect(typeof character.optionalClassFeatures).not.toBe(undefined);
    expect(Object.entries(character.optionalClassFeatures).length).toBe(0);

});