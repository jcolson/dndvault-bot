<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [DND Vault Discord BOT](#dnd-vault-discord-bot)
  - [Invite the BOT to your server](#invite-the-bot-to-your-server)
  - [Example workflow with the BOT](#example-workflow-with-the-bot)
  - [Example usage](#example-usage)
  - [Commands](#commands)
  - [Screenshots](#screenshots)
    - [list](#list)
    - [changes](#changes)
    - [config](#config)
  - [Notes (can be safely ignored)](#notes-can-be-safely-ignored)
    - [Mongodb queries](#mongodb-queries)
    - [discordjs](#discordjs)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# DND Vault Discord BOT

This "vault bot" enables a party to enable an approval concept of Dungeons and Dragons characters from [DND Beyond](https://dndbeyond.com/my-characters) and the changes they make to them via [Discord](https://discordapp.com).  This allows a (multiple) DMs to ensure that the character changes that a user makes on [DND Beyond](https://dndbeyond.com/my-characters) are accurate for their campaigns.

## Invite the BOT to your server

[Invite the bot to your server](https://discord.com/api/oauth2/authorize?client_id=792843392664993833&permissions=92224&scope=bot)

## Example workflow with the BOT

Workflow would work something like this.

- Discord users join a server and decide to have a campaign.
- Server owner invites BOT
- Each user creates a character for campaign on [DND Beyond](https://dndbeyond.com/my-characters)
- Each user 'registers' character with BOT
- DM 'approves' each character
- Mission occurs
- Users update characters on [DND Beyond](https://dndbeyond.com/my-characters)
- Users request 'update' of character with BOT
- DM 'lists queued' character approvals
- DM reviews 'changes' of character
- DM 'approves' character changes

all the while anyone on the server can 'view' any user's character ...

## Example usage

```diff
!register https://www.dndbeyond.com/profile/BlacknTan/characters/41867999
!list queued
!changes 41867999
!approve 41867999
!update https://www.dndbeyond.com/profile/BlacknTan/characters/41867999
!list queued
!changes 41867999
!approve 41867999
```

## Commands

Not all commands are implemented, this is a list of commands that will **hopefully** be implemented in short order. IGNORE the brackets in the usage help below.

```fix
- [x] help
- [ ] register
    - [ ] manual [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN} - create a stub character, do not use spaces in any of the parameters except the campaign
    - [x] [DNDBEYOND_URL] - register a character in the vault from dndbeyond
- [ ] campaigns - list all campaigns for server
- [x] campaign [CHAR_ID] [CAMPAIGN_ID] - update character to use a campaign id other than dndbeyond's
- [x] default
  - [x] {no args} - show current default character
  - [x] [CHAR_ID] - set your default character id to be used for events/missions with no campaign
- [ ] list
  - [x] {no args} - list YOUR registered characters within vault
  - [x] all - list all characters
  - [ ] approved - list all approved
  - [x] queued - list all characters queued for approval
  - [x] user [@USER_NAME] - list all characters by discord user
  - [x] campaign [CAMPAIGN_ID] - list all characters registered for a campaign
- [ ] show
  - [x] [CHAR_ID] - show a user's character from the vault
  - [ ] queued [CHAR_ID] - show a currently queued (changes not approved) character from the vault
- [x] update [DNDBEYOND_URL] - request an update a character from dndbeyond to the vault
- [x] remove [CHAR_ID] {@USER_NAME} - remove a character (or pending update) from the vault, if username is passed, remove for that user
- [x] approve [CHAR_ID] - approve a new/updated character within vault
- [x] changes [CHAR_ID] - display changes for an unapproved character update
- [x] config - show BOT config
  - [x] {no args} - show config
  - [x] arole [NEW_ROLE] - modify approver role (allows user to approve characters)
  - [x] prole [NEW_ROLE] - modify player role (allows user to use bot)
  - [x] prefix [NEW_PREFIX] - modify the command prefix
  - [x] approval [BOOLEAN] - does character registration and updates require arole approval?
  - [ ] require [BOOLEAN] - require that a user have matching character for events
- [x] timezone
  - [x] {no args} - view your timezone
  - [x] set [TIMEZONE] - set your timezone (required for interacting with events)
- [ ] event
  - [x] create !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] {!campaign [CAMPAIGN]} !desc [MISSION_DESC_REGION_PLAYSTYLE] - creates an event PROPOSAL that users can sign up for
  - [x] edit [MISSION_ID] !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] !campaign [CAMPAIGN] !desc [MISSION_DESC_REGION_PLAYSTYLE] - edits an existing event PROPOSAL that users can sign up for - everything is optional for a partial edit
  - [x] show [MISSION_ID] - replace the posting for an event (for instance if it got deleted by accident)
  - [x] remove [MISSION_ID] - removes mission event
  - [x] list - list all future events (and events from the past few days) (PROPOSed and DEPLOYed)
  - [ ] list past [DAYS] - list past events for the last DAYS (PROPOSed and DEPLOYed)
  - [x] list proposed - list all future PROPOSED events
  - [x] list deployed - list all future DEPLOYED events
  - [ ] list campaign [CAMPAIGN_ID] - list all future events for a campaign
  - [ ] list campaign proposed [CAMPAIGN_ID] - list all future DEPLOYed events for a campaign
  - [ ] list campaign deployed [CAMPAIGN_ID] - list all future PROPOSEed events for a campaign
```

## Screenshots

### list

![list](docs/images/list.png)

### changes

![changes](docs/images/changes.png)

### config

![config](docs/images/config.png)

## Notes (can be safely ignored)

### Mongodb queries

```mongodb
{id: { $regex: /785567026512527390/i }}
#my test guild
{guildID: '785567026512527390'}
```

### discordjs

retrieve a guild member:

```nodejs
let memberGuild = await client.guilds.fetch(guildConfig.guildID);
let guildMember = await memberGuild.members.fetch(msg.member.id);
```

example urls that can be linked:

```html
https://discordapp.com/channels/745694606372503773/790521190032474112/795807490545549353

https://discordapp.com/channels/785567026512527390
```

```
!event create !title Let's Kill Kobols !DMGM @D&D Vault Test !at 9:00 pm !for 3.5 !on Feb 17 2021 !with 5 !campaign Kobol Killas !desc Starting Region # according to Region Map Mode (mandatory, can be more specific, bonus points for googling real life names, extra points if historic names): Christchurch

Mission Description/Goal: Your initiation. Are you ready?
OR
Harpy Rescue - https://discord.com/channels/787645782269624340/787645782832578576/796641944196349973
@Robin - Day 

Preferred Playstyle focus, if any (e.g. exploration, 50/50 rp/combat, intrigue): 50/50 Rp/Combat
@LVLone @LVL2 @LVL3 @LVL4 @LVL5
```