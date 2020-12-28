# DND Vault Discord BOT

This "vault bot" enables a party to enable an approval concept of Dungeons and Dragons characters from dndbeyond.com and the changes they make to them.  This allows a (multiple) DMs to ensure that the character changes that a user makes on dndbeyond are accurate for their campaigns.

## Commands

Not all commands are implemented, this is a list of commands that will **hopefully** be implemented in short order. (if ya wanna help, let me know)

- [ ] register [DNDBEYOND_URL] - register a character in the vault from dndbeyond
- [ ] list - list registered characters within vault
  - [ ] all - list all
  - [ ] approved - list all approved
  - [ ] queued - list all characters queued for approval
- [ ] show [@USER] - show a user's characters from character vault
- [ ] update [DNDBEYOND_URL] - request an update a character from dndbeyond to the vault
- [ ] approve [CHAR_ID] - approve a new/updated character within vault
- [ ] changes [CHAR_ID] - display changes for an unapproved character update
- [ ] arole [NEW_ROLE] - modify approver role (allows user to approve characters)
- [ ] prole [NEW_ROLE] - modify player role (allows user to use bot)
- [ ] config - show BOT config
