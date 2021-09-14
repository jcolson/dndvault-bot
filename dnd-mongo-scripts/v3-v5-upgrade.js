//docker stop dnd-mongo && rm -Rf dnd-mongo && cp -rp ../dnd-mongo.bak dnd-mongo && docker start dnd-mongo
//load('/Users/jcolson/src/personal/dndvault/dnd-mongo-scripts/v3-v5-upgrade.js')
db.characters.updateMany({
    $and: [
        { 'apiVersion': { $exists: false } },
        { 'decorations': { $exists: false } }
    ]
},
    {
        $rename:
        {
            'avatarUrl': 'decorations.avatarUrl',
            'frameAvatarUrl': 'decorations.frameAvatarUrl',
            'backdropAvatarUrl': 'decorations.backdropAvatarUrl',
            'smallBackdropAvatarUrl': 'decorations.smallBackdropAvatarUrl',
            'largeBackdropAvatarUrl': 'decorations.largeBackdropAvatarUrl',
            'thumbnailBackdropAvatarUrl': 'decorations.thumbnailBackdropAvatarUrl',
            'defaultBackdrop': 'decorations.defaultBackdrop',
            'avatarId': 'decorations.avatarId',
            'frameAvatarId': 'decorations.frameAvatarId',
            'backdropAvatarId': 'decorations.backdropAvatarId',
            'smallBackdropAvatarId': 'decorations.smallBackdropAvatarId',
            'largeBackdropAvatarId': 'decorations.largeBackdropAvatarId',
            'thumbnailBackdropAvatarId': 'decorations.thumbnailBackdropAvatarId',
            'themeColorId': 'decorations.themeColorId',
            'themeColor': 'decorations.themeColor'
        }
    }
);
db.characters.updateMany({
    $and: [
        { 'apiVersion': { $exists: false } },
        { 'decorations': { $exists: true } }
    ]
}, [
    {
        $set:
        {
            'apiVersion': '5',
            'choices.class': {
                $map: {
                    input: "$choices.class",
                    as: "class",
                    in: {
                        $mergeObjects: [
                            "$$class",
                            {
                                'optionIds': {
                                    $map: {
                                        input: "$$class.options", as: "option", in: "$$option.id"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
    }
]);
