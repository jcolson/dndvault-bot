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
- [x] register [DNDBEYOND_URL] - register a character in the vault from dndbeyond
- [ ] list
  - [x] {no args} - list YOUR registered characters within vault
  - [x] all - list all characters
  - [ ] approved - list all approved
  - [x] queued - list all characters queued for approval
  - [x] user [@USER_NAME] - list all characters by discord user
  - [x] campaign [CAMPAIGN_ID] - list all characters registered for a campaign
  - [ ] campaigns - list all campaigns for server
- [ ] show
  - [x] [CHAR_ID] - show a user's character from the vault
  - [ ] queued [CHAR_ID] - show a currently queued (changes not approved) character from the vault
- [x] update [DNDBEYOND_URL] - request an update a character from dndbeyond to the vault
- [x] remove [CHAR_ID] - remove a character (or pending update) from the vault
- [x] approve [CHAR_ID] - approve a new/updated character within vault
- [x] changes [CHAR_ID] - display changes for an unapproved character update
- [x] config - show BOT config
  - [x] {no args} - show config
  - [x] arole [NEW_ROLE] - modify approver role (allows user to approve characters)
  - [x] prole [NEW_ROLE] - modify player role (allows user to use bot)
  - [x] prefix [NEW_PREFIX] - modify the command prefix
- [ ] timezone
  - [ ] {no args} - view your timezone
  - [x] set [TIMEZONE] - set your timezone (required for interacting with events)
- [ ] event
  - [x] create [MISSION_TITLE] DMGM [@USER_NAME] at [TIME] for [DURATION_HOURS] on [DATE] with [NUMBER_PLAYER_SLOTS] {partof [CAMPAIGN]} desc [MISSION_DESC_REGION_PLAYSTYLE] - creates an event PROPOSAL that users can sign up for
  - [x] edit [MISSION_ID] [MISSION_TITLE] DMGM [@USER_NAME] at [TIME] for [DURATION_HOURS] on [DATE] with [NUMBER_PLAYER_SLOTS] {partof [CAMPAIGN]} desc [MISSION_DESC_REGION_PLAYSTYLE] - creates an event PROPOSAL that users can sign up for
  - [ ] show [MISSION_ID] - show a particular mission's information
  - [ ] remove [MISSION_ID] - removes mission event
  - [ ] deploy [MISSION_ID] [@USER_NAME] - mark an event as deployed, user will become 'DM' for event
  - [ ] list - list all future events (PROPOSed and DEPLOYed)
  - [ ] list proposed - list all future PROPOSED events
  - [ ] list deployed - list all future DEPLOYED events
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
