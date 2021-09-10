const { Schema, model } = require('mongoose');

const Character = Schema({
    "apiVersion": {
        "type": "String",
        index: true,
        default: Config.dndBeyondCharServiceUrl
    },
    "guildUser": {
        "type": "String",
        index: true
    },
    "guildID": {
        "type": "String",
        index: true
    },
    "id": {
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
    "readonlyUrl": {
        "type": "String"
    },
    "avatarUrl": {
        "type": "String"
    },
    "frameAvatarUrl": {
        "type": "String"
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
    "frameAvatarId": {
        "type": "Number"
    },
    "backdropAvatarId": {
        "type": "Mixed"
    },
    "smallBackdropAvatarId": {
        "type": "Mixed"
    },
    "largeBackdropAvatarId": {
        "type": "Mixed"
    },
    "thumbnailBackdropAvatarId": {
        "type": "Mixed"
    },
    "themeColorId": {
        "type": "Mixed"
    },
    "themeColor": {
        "type": "Mixed"
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
        "customBackground": {
            "backgroundType": {
                "type": "Mixed"
            },
            "characteristicsBackground": {
                "type": "Mixed"
            },
            "characteristicsBackgroundDefinitionId": {
                "type": "Mixed"
            },
            "description": {
                "type": "Mixed"
            },
            "entityTypeId": {
                "type": "Number"
            },
            "featuresBackground": {
                "type": "Mixed"
            },
            "featuresBackgroundDefinitionId": {
                "type": "Mixed"
            },
            "id": {
                "type": "Number"
            },
            "name": {
                "type": "Mixed"
            }
        },
        "definition": {
            "avatarUrl": {
                "type": "Mixed"
            },
            "bonds": {
                "type": [
                    "Mixed"
                ]
            },
            "contractsDescription": {
                "type": "String"
            },
            "description": {
                "type": "String"
            },
            "entityTypeId": {
                "type": "Number"
            },
            "equipmentDescription": {
                "type": "String"
            },
            "featureDescription": {
                "type": "String"
            },
            "featureName": {
                "type": "String"
            },
            "flaws": {
                "type": [
                    "Mixed"
                ]
            },
            "id": {
                "type": "Number"
            },
            "ideals": {
                "type": [
                    "Mixed"
                ]
            },
            "languagesDescription": {
                "type": "String"
            },
            "largeAvatarUrl": {
                "type": "Mixed"
            },
            "name": {
                "type": "String"
            },
            "organization": {
                "type": "Mixed"
            },
            "personalityTraits": {
                "type": [
                    "Mixed"
                ]
            },
            "shortDescription": {
                "type": "String"
            },
            "skillProficienciesDescription": {
                "type": "String"
            },
            "snippet": {
                "type": "String"
            },
            "spellsPostDescription": {
                "type": "String"
            },
            "spellsPreDescription": {
                "type": "String"
            },
            "suggestedCharacteristicsDescription": {
                "type": "String"
            },
            "suggestedLanguages": {
                "type": "Mixed"
            },
            "suggestedProficiencies": {
                "type": "Mixed"
            },
            "toolProficienciesDescription": {
                "type": "String"
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
        "hasCustomBackground": {
            "type": "Boolean"
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
            "type": "Mixed"
        },
        "largeAvatarUrl": {
            "type": "Mixed"
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
        "sourceIds": {
            "type": "Array"
        },
        "groupIds": {
            "type": [
                "Number"
            ]
        },
        "type": {
            "type": "Number"
        },
        "subRaceShortName": {
            "type": "String"
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
            "encumbered": {
                "type": "Mixed"
            },
            "heavilyEncumbered": {
                "type": "Mixed"
            },
            "normal": {
                "burrow": {
                    "type": "Number"
                },
                "climb": {
                    "type": "Number"
                },
                "fly": {
                    "type": "Number"
                },
                "swim": {
                    "type": "Number"
                },
                "walk": {
                    "type": "Number"
                }
            },
            "override": {
                "type": "Mixed"
            },
            "pushDragLift": {
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
        "supportsSubrace": {
            "type": "Mixed"
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
        "backstory": {
            "type": "String"
        },
        "enemies": {
            "type": "Mixed"
        },
        "organizations": {
            "type": "Mixed"
        },
        "otherHoldings": {
            "type": "Mixed"
        },
        "otherNotes": {
            "type": "Mixed"
        },
        "personalPossessions": {
            "type": "String"
        }
    },
    "traits": {
        "appearance": {
            "type": "Mixed"
        },
        "bonds": {
            "type": "String"
        },
        "flaws": {
            "type": "String"
        },
        "ideals": {
            "type": "String"
        },
        "personalityTraits": {
            "type": "String"
        }
    },
    "preferences": {
        "abilityScoreDisplayType": {
            "type": "Number"
        },
        "encumbranceType": {
            "type": "Number"
        },
        "enforceFeatRules": {
            "type": "Boolean"
        },
        "enforceMulticlassRules": {
            "type": "Boolean"
        },
        "showScaledSpells": {
            "type": "Boolean"
        },
        "hitPointType": {
            "type": "Number"
        },
        "ignoreCoinWeight": {
            "type": "Boolean"
        },
        "primaryMovement": {
            "type": "Number"
        },
        "primarySense": {
            "type": "Number"
        },
        "privacyType": {
            "type": "Number"
        },
        "progressionType": {
            "type": "Number"
        },
        "sharingType": {
            "type": "Number"
        },
        "showUnarmedStrike": {
            "type": "Boolean"
        },
        "useHomebrewContent": {
            "type": "Boolean"
        },
        "enableOptionalClassFeatures": {
            "type": "Boolean"
        },
        "enableOptionalOrigins": {
            "type": "Boolean"
        }
    },
    "configuration": {
        "abilityScoreType": {
            "type": "Number"
        },
        "showHelpText": {
            "type": "Boolean"
        },
        "startingEquipmentType": {
            "type": "Number"
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
        "ep": {
            "type": "Number"
        },
        "gp": {
            "type": "Number"
        },
        "pp": {
            "type": "Number"
        },
        "sp": {
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
    "spellDefenses": {
        "type": "Mixed"
    },
    "customActions": {
        "type": "Array"
    },
    "characterValues": {
        "type": "Array"
    },
    "conditions": {
        "type": "Array"
    },
    "deathSaves": {
        "failCount": {
            "type": "Mixed"
        },
        "isStabilized": {
            "type": "Boolean"
        },
        "successCount": {
            "type": "Mixed"
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
        "background": {
            "type": "Mixed"
        },
        "class": {
            "type": [
                "Mixed"
            ]
        },
        "feat": {
            "type": "Array"
        },
        "item": {
            "type": "Array"
        },
        "race": {
            "type": "Array"
        }
    },
    "options": {
        "background": {
            "type": "Mixed"
        },
        "class": {
            "type": "Array"
        },
        "feat": {
            "type": "Array"
        },
        "item": {
            "type": "Mixed"
        },
        "race": {
            "type": "Array"
        }
    },
    "choices": {
        "background": {
            "type": [
                "Mixed"
            ]
        },
        "class": {
            "type": [
                "Mixed"
            ]
        },
        "feat": {
            "type": "Array"
        },
        "item": {
            "type": "Mixed"
        },
        "race": {
            "type": [
                "Mixed"
            ]
        }
    },
    "actions": {
        "background": {
            "type": "Mixed"
        },
        "class": {
            "type": "Array"
        },
        "feat": {
            "type": "Array"
        },
        "item": {
            "type": "Mixed"
        },
        "race": {
            "type": "Array"
        }
    },
    "modifiers": {
        "background": {
            "type": [
                "Mixed"
            ]
        },
        "class": {
            "type": [
                "Mixed"
            ]
        },
        "condition": {
            "type": "Array"
        },
        "feat": {
            "type": "Array"
        },
        "item": {
            "type": "Array"
        },
        "race": {
            "type": [
                "Mixed"
            ]
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
            "type": "String",
            index: true
        },
        "characters": {
            "type": [
                "Mixed"
            ]
        },
        "description": {
            "type": "String"
        },
        "dmUserId": {
            "type": "Number"
        },
        "dmUsername": {
            "type": "String"
        },
        "link": {
            "type": "String"
        },
        "name": {
            "type": "String"
        },
        "publicNotes": {
            "type": "String"
        }
    },
    "creatures": {
        "type": "Array"
    },
    "optionalOrigins": {
        "type": "Array"
    },
    "optionalClassFeatures": {
        "type": "Array"
    }
})
module.exports = model('Character', Character);