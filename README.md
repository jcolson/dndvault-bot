<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
DND Vault Table of Contents

- [DND Vault Discord BOT](#dnd-vault-discord-bot)
  - [Current build status](#current-build-status)
  - [Character Vault](#character-vault)
  - [Events](#events)
    - [Subscribe to the calendar](#subscribe-to-the-calendar)
  - [Polling](#polling)
  - [Rolling dice](#rolling-dice)
    - [Die quantity](#die-quantity)
    - [Example usages](#example-usages)
  - [Feedback and Support Discord](#feedback-and-support-discord)
  - [Invite the BOT to your server](#invite-the-bot-to-your-server)
  - [Example character workflow with the BOT](#example-character-workflow-with-the-bot)
  - [Example character workflow usage with approvals 'true'](#example-character-workflow-usage-with-approvals-true)
  - [Commands](#commands)
  - [Screenshots](#screenshots)
    - [event list](#event-list)
    - [event](#event)
    - [poll](#poll)
    - [show character](#show-character)
    - [list characters](#list-characters)
    - [changes in character updates](#changes-in-character-updates)
    - [config of server for guild](#config-of-server-for-guild)
    - [permissions required for bot](#permissions-required-for-bot)
  - [Notes (can be safely ignored)](#notes-can-be-safely-ignored)
    - [Mongodb queries](#mongodb-queries)
    - [discordjs](#discordjs)
    - [Bot Commands for testing](#bot-commands-for-testing)
    - [Test Bot Invite](#test-bot-invite)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# DND Vault Discord BOT

The most complete Dungeons and Dragons Character Vault, Event Management, Polling and Dice Roller for your Discord server!

## Current build status

- Develop Branch
[![ci](https://github.com/jcolson/dndvault-bot/actions/workflows/main.yml/badge.svg?branch=develop)](https://github.com/jcolson/dndvault-bot/actions/workflows/main.yml)

- Docker Branch
[![ci](https://github.com/jcolson/dndvault-bot/actions/workflows/main.yml/badge.svg?branch=docker)](https://github.com/jcolson/dndvault-bot/actions/workflows/main.yml)

- Master Branch
[![ci](https://github.com/jcolson/dndvault-bot/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/jcolson/dndvault-bot/actions/workflows/main.yml)

## Character Vault

This "vault bot" enables a party to enable an approval concept of Dungeons and Dragons characters from [DND Beyond](https://dndbeyond.com/my-characters) (or 'stub' characters not on dndbeyond using the `!register manual` command) and the changes they make to them via [Discord](https://discordapp.com).  This allows a (or multiple) DMs to ensure that the character changes that a user makes on [DND Beyond](https://dndbeyond.com/my-characters) are accurate for their campaigns.

The primary driver for this functionality was watching so many DM/GMs trying to manage [West Marches](http://arsludi.lamemage.com/index.php/78/grand-experiments-west-marches/) type Discord servers using spreadsheets/etc.  The bot works great for "non" West Marches type campaigns as well!  This can make things a bit easier to maintain for online Dungeons and Dragons players and DMs.

Approval functionality is configured 'false' by default, enable it by running `!config approval true`.

## Events

The bot also offers the ability to schedule events (missions) and allow attendees (party members) to sign up for attendance, or remove themselves from attendance.  The bot will also convert the default time (GMT) to the user's local timezone upon request via the clock reaction on the event.  Events can be 'deployed' to show that they are 'approved' and have all the proper components (DM/GM, attendees, etc).

Event campaign enforcement is configured off ('false') by default.  Turning it on ensures that the players that sign up for an event have a 'character' in the vault that is also related to the event's campaign (if set) via `!campaign` or a dndbeyond's campaign).  Turn this on by issuing `!config campaign true`

Users have the ability to list events that are deployed or proposed (not yet approved/deployed).

### Subscribe to the calendar

Once a user signs up as an attendee, or creates an event, those events will show up in that user's ICS feed.  The user can subscribe to the ICS feed within Outlook, Google Calendar, iCal, etc.  When a user clicks on the 'Timezone' button, a message is sent to them with their local timezone as well as a link to their personalized ICS calendar link.

<style>
.responsive-wrap iframe{ max-width: 100%;}
</style>
<div class="responsive-wrap">
<iframe width="560" height="315" src="https://www.youtube.com/embed/CEnUVG9wGwQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>

## Polling

Users can create polls very simply by using the `poll` command.  `!poll "Do you like polling"` will create a default poll that has three options:  👍 (yes) 👎 (no) and 🤷 (I don't know).  A user can also create his own options, which will be automatically numbered by using this syntax: `!poll "Do you like polling" "hell no" "I LOVE polling" "What is polling?"`.

## Rolling dice

Users can roll dice by using the `roll` command.  The dice roller uses [notation](https://greenimp.github.io/rpg-dice-roller/guide/notation/).

### Die quantity

- A single die has a minimum quantity of 1, and a maximum quantity of 999.
- These are valid: d8, 1d10, 999d6, 20d4 + 999d10
- These are not: 0d10, 1000d6, -1d20

### Example usages

```diff
roll 2 20 sided dice
!roll 2d20

roll 8 20 sided dice and drop the lowest 1
!roll 8d20dl1

values less than 3 are treated as 3
!roll 4d6min3

values greater than 3 are treated as 3
!roll 4d6max3

reroll dice if a 1 is rolled
!roll 1d6r

reroll dice if one is less than 3
!roll 1d6r<3

roll 4 100 sided dice
!roll 4d100

above is the same as rolling percentile dice
!roll 4d%

roll 4 fudge dice
!roll 4dF

```

## Feedback and Support Discord

I'm looking for feedback, so please feel free to open bugs, feature requests, etc.  As well as hop on my discord for direct conversation.  [Join me on this discord for support](https://discord.gg/ueCkbQgxrF)

## Invite the BOT to your server

[Invite the bot to your server](https://discord.com/api/oauth2/authorize?client_id=792843392664993833&permissions=223296&scope=bot%20applications.commands)

## Example character workflow with the BOT

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

## Example character workflow usage with approvals 'true'

```diff
#player types
!register https://www.dndbeyond.com/profile/BlacknTan/characters/41867999
#approver role user types
!list queued
!changes 41867999
!approve 41867999
#player types, to update character
!update https://www.dndbeyond.com/profile/BlacknTan/characters/41867999
#approver role user types
!list queued
!changes 41867999
!approve 41867999
```

## Commands

Not all commands are implemented, this is a list of commands that will **hopefully** be implemented in short order. IGNORE the brackets in the usage help below.

```fix
- [x] help
- [x] register
    - [x] manual [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN} - create a stub character, do not use spaces in any of the parameters except the campaign
    - [x] [DNDBEYOND_URL] - register a character in the vault from dndbeyond
- [x] update
    - [x] manual [CHAR_ID] [CHARACTER_NAME] [CHARACTER_CLASS] [CHARACTER_LEVEL] [CHARACTER_RACE] {CAMPAIGN} - update a stub character, do not use spaces in any of the parameters except the campaign
    - [x] [DNDBEYOND_URL] - request an update a character from dndbeyond to the vault
- [x] remove [CHAR_ID] {@USER_NAME} - remove a character (or pending update) from the vault, if username is passed, remove for that user
- [x] approve [CHAR_ID] - approve a new/updated character within vault
- [x] changes [CHAR_ID] - display changes for an unapproved character update
- [ ] campaigns - list all campaigns for server
- [x] campaign [CHAR_ID] [CAMPAIGN_ID] - update character to override dndbeyond's campaign name, this does NOT update dndbeyond's campaign
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
- [x] timezone
  - [x] {no args} - view your timezone
  - [x] [TIMEZONE] - set your timezone (required for interacting with events)
- [x] poll ["Poll Question"] {"Response 0"} {"Response 1"} {"Response 2"} {"Response 3"} ...
- [x] roll {notation} - rolls dice, using notation reference available here https://greenimp.github.io/rpg-dice-roller/guide/notation/
- [ ] event
  - [x] create !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] {!campaign [CAMPAIGN]} !desc [MISSION_DESC_REGION_PLAYSTYLE] - creates an event PROPOSAL that users can sign up for
  - [x] edit [MISSION_ID] !title [MISSION_TITLE] !dmgm [@USER_NAME] !at [TIME] !for [DURATION_HOURS] !on [DATE] !with [NUMBER_PLAYER_SLOTS] !campaign [CAMPAIGN] !desc [MISSION_DESC_REGION_PLAYSTYLE] - edits an existing event PROPOSAL that users can sign up for - everything is optional for a partial edit
  - [x] show [MISSION_ID] - replace the posting for an event (for instance if it got deleted by accident)
  - [x] remove [MISSION_ID] - removes mission event
  - [x] list - list all future events (and events from the past few days) (PROPOSed and DEPLOYed)
  - [ ] list my - list all future events you are signed up for or are a DMGM for
  - [ ] list past [DAYS] - list past events for the last DAYS (PROPOSed and DEPLOYed)
  - [x] list proposed - list all future PROPOSED events
  - [x] list deployed - list all future DEPLOYED events
  - [ ] list campaign [CAMPAIGN_ID] - list all future events for a campaign
  - [ ] list campaign proposed [CAMPAIGN_ID] - list all future DEPLOYed events for a campaign
  - [ ] list campaign deployed [CAMPAIGN_ID] - list all future PROPOSEed events for a campaign
- [x] config - show BOT config
  - [x] {no args} - show config
  - [x] arole [@ROLE] - modify approver role (allows user to approve characters)
  - [x] prole [@ROLE] - modify player role (allows user to use bot)
  - [x] prefix [NEW_PREFIX] - modify the command prefix
  - [x] approval [BOOLEAN] - does character registration and updates require arole approval?
  - [x] campaign [BOOLEAN] - require that a user have matching character for event's campaigns
  - [x] pollchannel [#CHANNEL] - send all polls to this channel
  - [x] eventchannel [#CHANNEL] - send all events to this channel
```

## Screenshots

### event list

![eventlist](docs/images/eventlist.png)

### event

![event](docs/images/event.png)

### poll

![poll](docs/images/poll.png)

### show character

![show](docs/images/show.png)

### list characters

![list](docs/images/list.png)

### changes in character updates

![changes](docs/images/changes.png)

### config of server for guild

![config](docs/images/config.png)

### permissions required for bot

If you plan on deploying your own copy of the D&D Vault (you don't need to, you can [invite the existing bot by clicking here](https://discord.com/api/oauth2/authorize?client_id=792843392664993833&permissions=223296&scope=bot)), invite the bot to your server using these permissions.

![bot_permissions](docs/images/bot_permissions.png)

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

### Bot Commands for testing

```sh
!event create !title Let's Kill Kobols !DMGM @D&D Vault Test !at 9:00 pm !for 3.5 !on Feb 4 2021 !with 5 !campaign Kobol Killas !desc Starting Region # according to Region Map Mode (mandatory, can be more specific, bonus points for googling real life names, extra points if historic names): Christchurch

Mission Description/Goal: Your initiation. Are you ready?
OR
Harpy Rescue - https://discord.com/channels/787645782269624340/787645782832578576/796641944196349973
@Robin - Day

Preferred Playstyle focus, if any (e.g. exploration, 50/50 rp/combat, intrigue): 50/50 Rp/Combat
@LVLone @LVL2 @LVL3 @LVL4 @LVL5
```


### Test Bot Invite

```html
https://discord.com/api/oauth2/authorize?client_id=795114885989400596&permissions=223296&scope=bot%20applications.commands
```
