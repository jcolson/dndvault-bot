const { Schema, model } = require('mongoose');

const Character = Schema({
    "apiVersion": {
        "type": "String",
        index: true,
        default: '5'
    },
    "guildUser": {
        "type": "String",
        index: true
    },
    "guildID": {
        "type": "String",
        index: true
    },
    "approvalStatus": {
        "type": "Boolean",
        index: true,
        default: false
    },
    "isUpdate": {
        "type": "Boolean",
        index: true,
        default: false
    },
    "campaignOverride": {
        "type": "String",
        index: true
    },
    "approvedBy": {
        "type": "String"
    },
    "luckPoints": {
        "type": "Number"
    },
    "treasurePoints": {
        "type": "Number"
    },
    "id": {
        "type": "String",
        index: true
    },
    "userId": {
        "type": "Number"
    },
    "readonlyUrl": {
        "type": "String"
    },
    "decorations": {
        "avatarUrl": {
            "type": "String"
        },
        "frameAvatarUrl": {
            "type": "Mixed"
        },
        "backdropAvatarUrl": {
            "type": "Mixed"
        },
        "smallBackdropAvatarUrl": {
            "type": "Mixed"
        },
        "largeBackdropAvatarUrl": {
            "type": "Mixed"
        },
        "thumbnailBackdropAvatarUrl": {
            "type": "Mixed"
        },
        "defaultBackdrop": {
            "backdropAvatarUrl": {
                "type": "String"
            },
            "smallBackdropAvatarUrl": {
                "type": "String"
            },
            "largeBackdropAvatarUrl": {
                "type": "String"
            },
            "thumbnailBackdropAvatarUrl": {
                "type": "String"
            }
        },
        "avatarId": {
            "type": "Number"
        },
        "portraitDecorationKey": {
            "type": "Mixed"
        },
        "frameAvatarDecorationKey": {
            "type": "Mixed"
        },
        "frameAvatarId": {
            "type": "Mixed"
        },
        "backdropAvatarDecorationKey": {
            "type": "Mixed"
        },
        "backdropAvatarId": {
            "type": "Mixed"
        },
        "smallBackdropAvatarDecorationKey": {
            "type": "String"
        },
        "smallBackdropAvatarId": {
            "type": "Mixed"
        },
        "largeBackdropAvatarDecorationKey": {
            "type": "String"
        },
        "largeBackdropAvatarId": {
            "type": "Mixed"
        },
        "thumbnailBackdropAvatarDecorationKey": {
            "type": "String"
        },
        "thumbnailBackdropAvatarId": {
            "type": "Mixed"
        },
        "themeColor": {
            "type": "Mixed"
        }
    },
    "name": {
        "type": "String"
    },
    "socialName": {
        "type": "Mixed"
    },
    "gender": {
        "type": "String"
    },
    "faith": {
        "type": "String"
    },
    "age": {
        "type": "Number"
    },
    "hair": {
        "type": "String"
    },
    "eyes": {
        "type": "String"
    },
    "skin": {
        "type": "String"
    },
    "height": {
        "type": "String"
    },
    "weight": {
        "type": "Number"
    },
    "inspiration": {
        "type": "Boolean"
    },
    "baseHitPoints": {
        "type": "Number"
    },
    "bonusHitPoints": {
        "type": "Mixed"
    },
    "overrideHitPoints": {
        "type": "Mixed"
    },
    "removedHitPoints": {
        "type": "Number"
    },
    "temporaryHitPoints": {
        "type": "Number"
    },
    "currentXp": {
        "type": "Number"
    },
    "alignmentId": {
        "type": "Number"
    },
    "lifestyleId": {
        "type": "Number"
    },
    "stats": {
        "type": [
            "Mixed"
        ]
    },
    "bonusStats": {
        "type": [
            "Mixed"
        ]
    },
    "overrideStats": {
        "type": [
            "Mixed"
        ]
    },
    "background": {
        "hasCustomBackground": {
            "type": "Boolean"
        },
        "definition": {
            "id": {
                "type": "Number"
            },
            "entityTypeId": {
                "type": "Number"
            },
            "name": {
                "type": "String"
            },
            "description": {
                "type": "String"
            },
            "snippet": {
                "type": "String"
            },
            "shortDescription": {
                "type": "String"
            },
            "skillProficienciesDescription": {
                "type": "String"
            },
            "toolProficienciesDescription": {
                "type": "String"
            },
            "languagesDescription": {
                "type": "String"
            },
            "equipmentDescription": {
                "type": "String"
            },
            "featureName": {
                "type": "String"
            },
            "featureDescription": {
                "type": "String"
            },
            "avatarUrl": {
                "type": "Mixed"
            },
            "largeAvatarUrl": {
                "type": "Mixed"
            },
            "suggestedCharacteristicsDescription": {
                "type": "String"
            },
            "suggestedProficiencies": {
                "type": "Mixed"
            },
            "suggestedLanguages": {
                "type": "Mixed"
            },
            "organization": {
                "type": "Mixed"
            },
            "contractsDescription": {
                "type": "String"
            },
            "spellsPreDescription": {
                "type": "String"
            },
            "spellsPostDescription": {
                "type": "String"
            },
            "personalityTraits": {
                "type": [
                    "Mixed"
                ]
            },
            "ideals": {
                "type": [
                    "Mixed"
                ]
            },
            "bonds": {
                "type": [
                    "Mixed"
                ]
            },
            "flaws": {
                "type": [
                    "Mixed"
                ]
            },
            "isHomebrew": {
                "type": "Boolean"
            },
            "sources": {
                "type": [
                    "Mixed"
                ]
            },
            "spellListIds": {
                "type": "Array"
            }
        },
        "definitionId": {
            "type": "Mixed"
        },
        "customBackground": {
            "id": {
                "type": "Number"
            },
            "entityTypeId": {
                "type": "Number"
            },
            "name": {
                "type": "Mixed"
            },
            "description": {
                "type": "Mixed"
            },
            "featuresBackground": {
                "type": "Mixed"
            },
            "characteristicsBackground": {
                "type": "Mixed"
            },
            "featuresBackgroundDefinitionId": {
                "type": "Mixed"
            },
            "characteristicsBackgroundDefinitionId": {
                "type": "Mixed"
            },
            "backgroundType": {
                "type": "Mixed"
            }
        }
    },
    "race": {
        "isSubRace": {
            "type": "Boolean"
        },
        "baseRaceName": {
            "type": "String"
        },
        "entityRaceId": {
            "type": "Number"
        },
        "entityRaceTypeId": {
            "type": "Number"
        },
        "fullName": {
            "type": "String"
        },
        "baseRaceId": {
            "type": "Number"
        },
        "baseRaceTypeId": {
            "type": "Number"
        },
        "description": {
            "type": "String"
        },
        "avatarUrl": {
            "type": "String"
        },
        "largeAvatarUrl": {
            "type": "String"
        },
        "portraitAvatarUrl": {
            "type": "String"
        },
        "moreDetailsUrl": {
            "type": "String"
        },
        "isHomebrew": {
            "type": "Boolean"
        },
        "groupIds": {
            "type": [
                "Number"
            ]
        },
        "type": {
            "type": "Number"
        },
        "supportsSubrace": {
            "type": "Mixed"
        },
        "subRaceShortName": {
            "type": "Mixed"
        },
        "baseName": {
            "type": "String"
        },
        "racialTraits": {
            "type": [
                "Mixed"
            ]
        },
        "weightSpeeds": {
            "normal": {
                "walk": {
                    "type": "Number"
                },
                "fly": {
                    "type": "Number"
                },
                "burrow": {
                    "type": "Number"
                },
                "swim": {
                    "type": "Number"
                },
                "climb": {
                    "type": "Number"
                }
            },
            "encumbered": {
                "type": "Mixed"
            },
            "heavilyEncumbered": {
                "type": "Mixed"
            },
            "pushDragLift": {
                "type": "Mixed"
            },
            "override": {
                "type": "Mixed"
            }
        },
        "featIds": {
            "type": "Array"
        },
        "size": {
            "type": "Mixed"
        },
        "sizeId": {
            "type": "Number"
        },
        "sources": {
            "type": [
                "Mixed"
            ]
        }
    },
    "raceDefinitionId": {
        "type": "Mixed"
    },
    "raceDefinitionTypeId": {
        "type": "Mixed"
    },
    "notes": {
        "allies": {
            "type": "Mixed"
        },
        "personalPossessions": {
            "type": "String"
        },
        "otherHoldings": {
            "type": "Mixed"
        },
        "organizations": {
            "type": "Mixed"
        },
        "enemies": {
            "type": "Mixed"
        },
        "backstory": {
            "type": "Mixed"
        },
        "otherNotes": {
            "type": "String"
        }
    },
    "traits": {
        "personalityTraits": {
            "type": "String"
        },
        "ideals": {
            "type": "String"
        },
        "bonds": {
            "type": "String"
        },
        "flaws": {
            "type": "String"
        },
        "appearance": {
            "type": "Mixed"
        }
    },
    "preferences": {
        "useHomebrewContent": {
            "type": "Boolean"
        },
        "progressionType": {
            "type": "Number"
        },
        "encumbranceType": {
            "type": "Number"
        },
        "ignoreCoinWeight": {
            "type": "Boolean"
        },
        "hitPointType": {
            "type": "Number"
        },
        "showUnarmedStrike": {
            "type": "Boolean"
        },
        "showScaledSpells": {
            "type": "Boolean"
        },
        "primarySense": {
            "type": "Number"
        },
        "primaryMovement": {
            "type": "Number"
        },
        "privacyType": {
            "type": "Number"
        },
        "sharingType": {
            "type": "Number"
        },
        "abilityScoreDisplayType": {
            "type": "Number"
        },
        "enforceFeatRules": {
            "type": "Boolean"
        },
        "enforceMulticlassRules": {
            "type": "Boolean"
        },
        "enableOptionalClassFeatures": {
            "type": "Boolean"
        },
        "enableOptionalOrigins": {
            "type": "Boolean"
        },
        "enableDarkMode": {
            "type": "Boolean"
        }
    },
    "configuration": {
        "startingEquipmentType": {
            "type": "Number"
        },
        "abilityScoreType": {
            "type": "Number"
        },
        "showHelpText": {
            "type": "Boolean"
        }
    },
    "lifestyle": {
        "type": "Mixed"
    },
    "inventory": {
        "type": [
            "Mixed"
        ]
    },
    "currencies": {
        "cp": {
            "type": "Number"
        },
        "sp": {
            "type": "Number"
        },
        "gp": {
            "type": "Number"
        },
        "ep": {
            "type": "Number"
        },
        "pp": {
            "type": "Number"
        }
    },
    "classes": {
        "type": [
            "Mixed"
        ]
    },
    "feats": {
        "type": "Array"
    },
    "customDefenseAdjustments": {
        "type": "Array"
    },
    "customSenses": {
        "type": "Array"
    },
    "customSpeeds": {
        "type": "Array"
    },
    "customProficiencies": {
        "type": "Array"
    },
    "customActions": {
        "type": "Array"
    },
    "characterValues": {
        "type": [
            "Mixed"
        ]
    },
    "conditions": {
        "type": "Array"
    },
    "deathSaves": {
        "failCount": {
            "type": "Number"
        },
        "successCount": {
            "type": "Number"
        },
        "isStabilized": {
            "type": "Boolean"
        }
    },
    "adjustmentXp": {
        "type": "Mixed"
    },
    "spellSlots": {
        "type": [
            "Mixed"
        ]
    },
    "pactMagic": {
        "type": [
            "Mixed"
        ]
    },
    "activeSourceCategories": {
        "type": [
            "Number"
        ]
    },
    "spells": {
        "race": {
            "type": [
                "Mixed"
            ]
        },
        "class": {
            "type": "Array"
        },
        "background": {
            "type": "Mixed"
        },
        "item": {
            "type": "Array"
        },
        "feat": {
            "type": "Array"
        }
    },
    "options": {
        "race": {
            "type": "Array"
        },
        "class": {
            "type": "Array"
        },
        "background": {
            "type": "Mixed"
        },
        "item": {
            "type": "Mixed"
        },
        "feat": {
            "type": "Array"
        }
    },
    "choices": {
        "race": {
            "type": "Array"
        },
        "class": {
            "type": [
                "Mixed"
            ]
        },
        "background": {
            "type": [
                "Mixed"
            ]
        },
        "item": {
            "type": "Mixed"
        },
        "feat": {
            "type": "Array"
        },
        "choiceDefinitions": {
            "type": [
                "Mixed"
            ]
        }
    },
    "actions": {
        "race": {
            "type": [
                "Mixed"
            ]
        },
        "class": {
            "type": [
                "Mixed"
            ]
        },
        "background": {
            "type": "Mixed"
        },
        "item": {
            "type": "Mixed"
        },
        "feat": {
            "type": "Array"
        }
    },
    "modifiers": {
        "race": {
            "type": [
                "Mixed"
            ]
        },
        "class": {
            "type": [
                "Mixed"
            ]
        },
        "background": {
            "type": [
                "Mixed"
            ]
        },
        "item": {
            "type": [
                "Mixed"
            ]
        },
        "feat": {
            "type": "Array"
        },
        "condition": {
            "type": "Array"
        }
    },
    "classSpells": {
        "type": [
            "Mixed"
        ]
    },
    "customItems": {
        "type": "Array"
    },
    "campaign": {
        "id": {
            "type": "Number"
        },
        "name": {
            "type": "String"
        },
        "description": {
            "type": "String"
        },
        "link": {
            "type": "String"
        },
        "publicNotes": {
            "type": "String"
        },
        "dmUserId": {
            "type": "Number"
        },
        "dmUsername": {
            "type": "String"
        },
        "characters": {
            "type": [
                "Mixed"
            ]
        }
    },
    "creatures": {
        "type": [
            "Mixed"
        ]
    },
    "optionalOrigins": {
        "type": "Array"
    },
    "optionalClassFeatures": {
        "type": "Array"
    },
    "dateModified": {
        "type": "Date"
    },
    "providedFrom": {
        "type": "String"
    }
});
Character.index({apiVersion: 1});
Character.index({approvalStatus: 1});
Character.index({'campaign.id': 1});
Character.index({campaignOverride: 1});
Character.index({guildID: 1});
Character.index({guildUser: 1});
Character.index({id: 1});
Character.index({isUpdate: 1});
module.exports = model('Character', Character);